import asyncio
import websockets
import json
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from stable_baselines3 import PPO
import threading
from queue import Queue, Empty
import time

PORT = 8000

# Observation: [X Position, Z Position, Texture ID]
OBS_SIZE = 3 

class ZhongCorridorEnv(gym.Env):
    def __init__(self):
        super(ZhongCorridorEnv, self).__init__()
        
        # Actions: 0=Stop, 1=Forward, 2=Left, 3=Right, 4=Lick
        self.action_space = spaces.Discrete(5)
        
        # Observation Space: [X, Z, Texture]
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(OBS_SIZE,), dtype=np.float32)

        self.command_queue = Queue()
        self.state_queue = Queue()
        self.connection = None
        
        # This event flag tracks if the browser is currently connected
        self.client_connected = threading.Event()
        
        print(f"⏳ Initializing Server on port {PORT}...")
        self.start_server()

    def start_server(self):
        def run_loop():
            async def handler(websocket):
                print("✅ GAME CONNECTED! Starting Session...")
                self.connection = websocket
                self.client_connected.set() # Unblock Python
                
                try:
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            self.state_queue.put(data)
                            
                            # Get action from AI (non-blocking)
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
                    print("❌ Game Disconnected")
                    self.connection = None
                    self.client_connected.clear() # Block Python

            async def main():
                async with websockets.serve(handler, "localhost", PORT):
                    await asyncio.Future()

            asyncio.run(main())

        t = threading.Thread(target=run_loop, daemon=True)
        t.start()

    def reset(self, seed=None, options=None):
        # 1. PAUSE CHECK: Block here if Game Mode is active or Tab is closed
        if not self.client_connected.is_set():
            print("⏸️  Waiting for Lab Mode to start...")
            self.client_connected.wait()
            print("▶️  Resuming...")

        print("🔄 RESETTING ENVIRONMENT")
        self.command_queue.put("RESET")
        time.sleep(1.0) 
        
        with self.state_queue.mutex:
            self.state_queue.queue.clear()
            
        return np.zeros(OBS_SIZE, dtype=np.float32), {}

    def step(self, action):
        # 1. PAUSE CHECK: If disconnected, freeze here
        if not self.client_connected.is_set():
            print("⏸️  Game Paused. Waiting for return...")
            self.client_connected.wait()
            print("▶️  Resuming Training!")

        self.command_queue.put(action)

        # 2. WAIT FOR DATA (Loop until we get a frame)
        # This handles the "Slow Tab" issue. We won't proceed until the browser replies.
        while True:
            try:
                # Wait 5 seconds. If browser is throttled, this might take a while.
                data = self.state_queue.get(timeout=5)
                
                # --- PARSE DATA ---
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
                # If we timed out, check if we are still connected.
                if not self.client_connected.is_set():
                    # Disconnected! Go back to top of loop to hit the Pause Check
                    break 
                else:
                    # Connected but slow? Just keep waiting.
                    continue

        # Fallback if loop breaks (should only happen on disconnect)
        return np.zeros(OBS_SIZE, dtype=np.float32), 0, False, False, {}

if __name__ == "__main__":
    env = ZhongCorridorEnv()
    
    print("⏳ Waiting for you to click 'LAB SIMULATION' in the browser...")
    env.client_connected.wait()
    
    print("\n🧠 CLIENT DETECTED. STARTING TRAINING LOOP...")
    model = PPO("MlpPolicy", env, verbose=1)
    
    # Train for 100,000 steps (takes ~20-30 mins at full speed)
    model.learn(total_timesteps=100000)
    model.save("zhong_brain_final")