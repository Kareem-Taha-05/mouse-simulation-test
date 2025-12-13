"use client"

import { useMemo } from "react"
import { Environment } from "@react-three/drei"
import { Player } from "./player"
import { Maze } from "./maze"
import { Physics, CuboidCollider } from "@react-three/rapier"
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing"
import { generateMaze } from "@/utils/maze-generator"

interface GameSceneProps {
  isMotivated: boolean
  setMotivation: (m: boolean) => void
  onTrialComplete: (success: boolean) => void
}

export function GameScene({ isMotivated, setMotivation, onTrialComplete }: GameSceneProps) {
  const { grid } = useMemo(() => generateMaze(), [])

  return (
    <>
      <color attach="background" args={['#050505']} />
      
      {/* FIX 1: Pushed fog back (0 -> 5) and extended range (12 -> 20) */}
      <fog attach="fog" args={['#050505', 5, 20]} /> 

      {/* FIX 2: Increased Ambient Light (0.1 -> 0.4) so walls are visible */}
      <ambientLight intensity={0.4} />

      <Physics>
        <Maze isMotivated={isMotivated} grid={grid} />
        
        <Player 
          isMotivated={isMotivated} 
          setMotivation={setMotivation}
          grid={grid}
        />

        <CuboidCollider 
          position={[22, 2, 22]} 
          args={[4, 4, 4]} 
          sensor 
          onIntersectionEnter={() => {
             console.log("MAZE COMPLETED!")
             onTrialComplete(true)
          }}
        />
      </Physics>

      <EffectComposer disableNormalPass>
        <Noise opacity={isMotivated ? 0.05 : 0.4} />
        {/* @ts-ignore */}
        <Vignette eskil={false} offset={0.1} darkness={isMotivated ? 0.2 : 0.8} />
      </EffectComposer>
    </>
  )
}