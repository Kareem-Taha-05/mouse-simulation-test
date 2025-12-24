"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { KeyboardControls } from "@react-three/drei"
import { GameScene } from "@/components/game-scene"
import { SimulationScene } from "@/components/simulation-scene"
import { GameUI } from "@/components/game-ui"
import { MobileJoystick } from "@/components/ui/mobile-joystick"
import { useIsMobile } from "@/hooks/use-mobile" // 1. Import the smart hook

export default function GamePage() {
  const [isMotivated, setIsMotivated] = useState(true)
  const [score, setScore] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [gameStatus, setGameStatus] = useState<"playing" | "won">("playing")
  const [mode, setMode] = useState<"GAME" | "SIMULATION">("GAME")

  // --- URL INPUT STATE ---
  const [inputUrl, setInputUrl] = useState("ws://localhost:8000/ws")
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)

  // 2. USE THE HOOK
  const isMobile = useIsMobile()

  const map = [
    { name: "forward", keys: ["ArrowUp", "w", "W"] },
    { name: "backward", keys: ["ArrowDown", "s", "S"] },
    { name: "left", keys: ["ArrowLeft", "a", "A"] },
    { name: "right", keys: ["ArrowRight", "d", "D"] },
  ]

  const handleTrialEnd = (success: boolean) => {
     if (success) { setGameStatus("won"); document.exitPointerLock() } 
     else { setIsMotivated(false); setTimeout(() => setIsMotivated(true), 4000) }
  }
  const startNextTrial = () => {
     setScore(s => s + 1); setGameStatus("playing"); setIsMotivated(true); setResetKey(p => p + 1)
  }

  const handleSimStart = () => {
    setMode("SIMULATION")
    setActiveUrl(inputUrl)
    setShowInput(false)
  }

  return (
    <main className="h-screen w-screen bg-black overflow-hidden select-none relative">
      
      {/* 3. CONDITIONAL RENDER: Show Joystick if isMobile is true (No CSS hiding) */}
      {isMobile && (
        <div className="absolute inset-0 z-40 pointer-events-none"> 
            <MobileJoystick />
        </div>
      )}

      {/* --- UI MENU LAYER --- */}
      <div className="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col gap-2">
        
        {/* BUTTONS */}
        <div className="flex gap-2">
            <button 
              onClick={() => setMode("GAME")}
              className={`px-4 py-2 rounded font-bold transition-colors shadow-lg border border-white/20 ${mode === "GAME" ? "bg-white text-black" : "bg-white/10 text-white"}`}
            >
              🎮 GAME
            </button>
            <button 
              onClick={() => setShowInput(!showInput)}
              className={`px-4 py-2 rounded font-bold transition-colors shadow-lg border border-white/20 ${mode === "SIMULATION" ? "bg-white text-black" : "bg-white/10 text-white"}`}
            >
              🧪 LAB SIM
            </button>
        </div>

        {/* INPUT BOX (Visible when you click Lab Sim) */}
        {showInput && (
            <div className="bg-black/80 p-4 rounded border border-white/20 flex flex-col gap-2 w-64 backdrop-blur-md">
                <label className="text-xs text-white/70">Server URL</label>
                <input 
                    type="text" 
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="bg-white/10 text-white text-sm p-2 rounded border border-white/20"
                    placeholder="wss://....ngrok-free.app/ws"
                />
                <button 
                    onClick={handleSimStart}
                    className="bg-green-600 text-white text-sm font-bold p-2 rounded hover:bg-green-500"
                >
                    CONNECT & START
                </button>
                <p className="text-[10px] text-white/50">
                    Use <b>wss://...</b> for Ngrok <br/> Use <b>ws://localhost:8000/ws</b> for PC
                </p>
            </div>
        )}
      </div>

      <KeyboardControls map={map}>
        <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }}>
          <color attach="background" args={['#101010']} /> 
          
          {mode === "GAME" ? (
            <GameScene 
               key={resetKey} 
               isMotivated={isMotivated}
               setMotivation={setIsMotivated}
               onTrialComplete={handleTrialEnd}
            />
          ) : (
            // PASS THE URL
            <SimulationScene serverUrl={activeUrl} />
          )}
        </Canvas>

        {mode === "GAME" && (
          <GameUI 
             isMotivated={isMotivated} 
             score={score} 
             gameStatus={gameStatus} 
             onNextTrial={startNextTrial} 
          />
        )}
      </KeyboardControls>
    </main>
  )
}