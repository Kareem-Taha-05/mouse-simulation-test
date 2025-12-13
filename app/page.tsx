"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { KeyboardControls } from "@react-three/drei"
import { GameScene } from "@/components/game-scene"
import { GameUI } from "@/components/game-ui"

export default function GamePage() {
  const [isMotivated, setIsMotivated] = useState(true)
  const [score, setScore] = useState(0) // Acts as "Trial Number"
  const [resetKey, setResetKey] = useState(0)
  
  // NEW: State to show the Win Screen
  const [gameStatus, setGameStatus] = useState<"playing" | "won">("playing")

  const map = [
    { name: "forward", keys: ["ArrowUp", "w", "W"] },
    { name: "backward", keys: ["ArrowDown", "s", "S"] },
    { name: "left", keys: ["ArrowLeft", "a", "A"] },
    { name: "right", keys: ["ArrowRight", "d", "D"] },
  ]

  const handleTrialEnd = (success: boolean) => {
    if (success) {
      // WIN: Show the success screen, but DON'T respawn yet
      setGameStatus("won")
      // Unlock mouse so user can click the button
      document.exitPointerLock()
    } else {
      // FAIL: Lose motivation, keep playing
      setIsMotivated(false)
      setTimeout(() => setIsMotivated(true), 4000)
    }
  }

  // Called when user clicks "Proceed to next trial"
  const startNextTrial = () => {
    setScore(s => s + 1)
    setGameStatus("playing")
    setIsMotivated(true)
    setResetKey(prev => prev + 1) // Respawn/Regenerate Maze
  }

  return (
    <main className="h-screen w-screen bg-black">
      <KeyboardControls map={map}>
        <div className="relative w-full h-full">
          
          <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }}>
            <color attach="background" args={['#101010']} /> 
            
            <GameScene 
               key={resetKey} 
               isMotivated={isMotivated}
               setMotivation={setIsMotivated}
               onTrialComplete={handleTrialEnd}
            />
          </Canvas>

          <GameUI 
             isMotivated={isMotivated} 
             score={score} 
             gameStatus={gameStatus} // Pass status to UI
             onNextTrial={startNextTrial} // Pass function to UI
          />
        </div>
      </KeyboardControls>
    </main>
  )
}