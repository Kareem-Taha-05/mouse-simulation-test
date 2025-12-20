"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { KeyboardControls } from "@react-three/drei"
import { GameScene } from "@/components/game-scene"
import { SimulationScene } from "@/components/simulation-scene"
import { GameUI } from "@/components/game-ui"
import { MobileJoystick } from "@/components/ui/mobile-joystick"

export default function GamePage() {
  const [isMotivated, setIsMotivated] = useState(true)
  const [score, setScore] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [gameStatus, setGameStatus] = useState<"playing" | "won">("playing")
  
  // MODE TOGGLE
  const [mode, setMode] = useState<"GAME" | "SIMULATION">("GAME")

  const map = [
    { name: "forward", keys: ["ArrowUp", "w", "W"] },
    { name: "backward", keys: ["ArrowDown", "s", "S"] },
    { name: "left", keys: ["ArrowLeft", "a", "A"] },
    { name: "right", keys: ["ArrowRight", "d", "D"] },
  ]

  const handleTrialEnd = (success: boolean) => {
    if (success) {
      setGameStatus("won")
      document.exitPointerLock()
    } else {
      setIsMotivated(false)
      setTimeout(() => setIsMotivated(true), 4000)
    }
  }

  const startNextTrial = () => {
    setScore(s => s + 1)
    setGameStatus("playing")
    setIsMotivated(true)
    setResetKey(prev => prev + 1)
  }

  return (
    <main className="h-screen w-screen bg-black overflow-hidden select-none">
      
      {/* 1. MOBILE CONTROLS (Only visible on mobile/small screens via CSS if needed, 
          or just always rendered since it detects touch) */}
      <div className="md:hidden">
         <MobileJoystick />
      </div>

      {/* 2. MODE SWITCHER BUTTON */}
      <div className="absolute top-4 left-4 z-50 pointer-events-auto">
        <button 
          onClick={() => setMode(m => m === "GAME" ? "SIMULATION" : "GAME")}
          className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded font-bold hover:bg-white/20 transition-colors shadow-lg"
        >
          {mode === "GAME" ? "🎮 PLAY MODE" : "🧪 LAB SIMULATION"}
        </button>
      </div>

      <KeyboardControls map={map}>
        <div className="relative w-full h-full">
          
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
              <SimulationScene />
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
          
        </div>
      </KeyboardControls>
    </main>
  )
}