import asyncio
import websockets
import json
import numpy as np
import os
import glob
import gymnasium as gym
from gymnasium import spaces
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
import threading
from queue import Queue, Empty
import time
from collections import deque

PORT = 8000
OBS_SIZE = 3 

# --- YOUR PAPER'S EQUATIONS ---
def get_plasticity_gamma(M):
    return 0.0647 + 0.1194 * M

def get_noise_sigma(M):
    return 0.9212 - 0.2641 * M

# --- THE PHYSICS-INFORMED CALLBACK ---
class DrivenGradientCallback(BaseCallback):
    def __init__(self, verbose=0):
        super(DrivenGradientCallback, self).__init__(verbose)
        
        # CHANGED: Increased memory to 50 trials.
        # This prevents the mouse from crashing to M=0 just because of a few bad runs.
        # It creates a more stable "Mood".
        self.reward_history = deque(maxlen=50) 
        
        self.current_M = 0.3 
        self.base_lr = 0.0003
        self.base_ent = 0.01

    def _on_step(self) -> bool:
        for info in self.locals['infos']:
            if 'episode' in info:
                r = info['episode']['r']
                self.reward_history.append(r)
                if r > 0:
                    # Just a small log to know it's alive
                    print(f"✨ Win recorded.")

        if len(self.reward_history) > 0:
            avg_reward = np.mean(self.reward_history)
            # Clip negative averages to 0
            clean_avg = max(0, avg_reward)
            # Map average reward (0 to 10) to Motivation (0 to 1)
            self.current_M = np.clip(clean_avg / 8.0, 0.0, 1.0)
        else:
            # Slower decay if no data
            self.current_M = max(0.0, self.current_M - 0.00005)

        gamma = get_plasticity_gamma(self.current_M) 
        plasticity_multiplier = gamma / 0.0647 
        new_lr = self.base_lr * plasticity_multiplier
        self.model.learning_rate = new_lr

        sigma = get_noise_sigma(self.current_M)
        noise_multiplier = sigma / 0.9212
        self.model.ent_coef = self.base_ent * noise_multiplier

        # Log less frequently (every 5000 steps) to keep terminal clean
        if self.n_calls % 5000 == 0:
            print(f"\n[PIRL UPDATE] Motivation (M): {self.current_M:.2f}")
            print(f"   - Gamma (Learning Speed): {gamma:.4f}")
            print(f"   - Sigma (Noise Level):    {sigma:.4f}")

        return True

# --- ENVIRONMENT ---
class ZhongCorridorEnv(gym.Env):
    def __init__(self):
        super(ZhongCorridorEnv, self).__init__()
        self.action_space = spaces.Discrete(5)
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(OBS_SIZE,), dtype=np.float32)
        self.command_queue = Queue()
        self.state_queue = Queue()
        self.connection = None
        self.client_connected = threading.Event()
        print(f"Initializing Server on port {PORT}...")
        self.start_server()

    def start_server(self):
        def run_loop():
            async def handler(websocket):
                print("GAME CONNECTED! Starting Session...")
                self.connection = websocket
                self.client_connected.set() 
                try:
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            self.state_queue.put(data)
                            try:
                                action_pkg = self.command_queue.get(timeout=0.01)
                            except Empty:
                                continue 
                            response = { "move": 0, "turn": 0, "lick": False, "type": "STEP" }
                            if action_pkg == "RESET":
                                response["type"] = "RESET"
                            else:
                                action = int(action_pkg)
                                if action == 1: response["move"] = 1
                                if action == 2: response["move"] = 1; response["turn"] = -1
                                if action == 3: response["move"] = 1; response["turn"] = 1
                                if action == 4: response["lick"] = True
                            await websocket.send(json.dumps(response))
                        except json.JSONDecodeError:
                            pass
                except websockets.exceptions.ConnectionClosed:
                    print("Game Disconnected")
                    self.connection = None
                    self.client_connected.clear() 

            async def main():
                async with websockets.serve(handler, "0.0.0.0", PORT):
                    await asyncio.Future()

            asyncio.run(main())

        t = threading.Thread(target=run_loop, daemon=True)
        t.start()

    def reset(self, seed=None, options=None):
        if not self.client_connected.is_set():
            print("Waiting for Lab Mode to start...")
            self.client_connected.wait()
            print("Resuming...")
        self.command_queue.put("RESET")
        time.sleep(1.0) 
        with self.state_queue.mutex:
            self.state_queue.queue.clear()
        return np.zeros(OBS_SIZE, dtype=np.float32), {}

    def step(self, action):
        if not self.client_connected.is_set():
            print("Game Paused. Waiting for return...")
            self.client_connected.wait()
            print("Resuming Training!")
        self.command_queue.put(action)
        while True:
            try:
                data = self.state_queue.get(timeout=5)
                player_z = data.get('position', 0)
                player_x = data.get('x', 0)
                texture_val = 0.0 if data.get('trialType') == "A" else 1.0
                obs = np.array([player_x, player_z, texture_val], dtype=np.float32)
                reward = data.get('reward', -0.01)
                
                terminated = False
                if reward > 5.0:
                    print(f"🏆 WIN! (Reward: {reward})")
                    terminated = True
                elif reward < -4.0:
                    print(f"💀 FAIL! (Reward: {reward})")
                    terminated = True
                
                return obs, reward, terminated, False, {}
            except Empty:
                if not self.client_connected.is_set():
                    break 
                else:
                    continue
        return np.zeros(OBS_SIZE, dtype=np.float32), 0, False, False, {}

if __name__ == "__main__":
    raw_env = ZhongCorridorEnv()
    env = Monitor(raw_env)

    checkpoint_dir = "./checkpoints"
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    # CHANGED: Save every 50,000 steps (approx every 2-3 hours)
    checkpoint_callback = CheckpointCallback(
        save_freq=50000, 
        save_path=checkpoint_dir,
        name_prefix="zhong_brain"
    )

    physics_callback = DrivenGradientCallback()
    
    print("Waiting for you to click 'LAB SIMULATION' in the browser...")
    raw_env.client_connected.wait()
    print("\nCLIENT DETECTED.")

    model_path = "zhong_brain_final.zip"
    latest_checkpoint = None
    list_of_files = glob.glob(os.path.join(checkpoint_dir, '*.zip'))
    if list_of_files:
        latest_checkpoint = max(list_of_files, key=os.path.getctime)

    if os.path.exists(model_path):
        print(f"🔄 RESUMING from Final Model: {model_path}")
        model = PPO.load(model_path, env=env, verbose=1)
    elif latest_checkpoint:
        print(f"🔄 RESUMING from Checkpoint: {latest_checkpoint}")
        model = PPO.load(latest_checkpoint, env=env, verbose=1)
    else:
        print("✨ STARTING FRESH...")
        model = PPO("MlpPolicy", env, verbose=1)

    print("STARTING LONG-TERM PHYSICS-INFORMED TRAINING...")
    
    # CHANGED: Training for 5 Million Steps (Approx 24-48 Hours)
    model.learn(total_timesteps=5000000, callback=[physics_callback, checkpoint_callback])
    
    model.save("zhong_brain_final")
    print("✅ Training Complete.")