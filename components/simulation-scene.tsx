"use client"

import { useState, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { Physics } from "@react-three/rapier"
import { Player } from "./player"
import { Corridor } from "./corridor"
import { useSocketBridge } from "@/hooks/use-socket-bridge"
import * as THREE from "three"

// UPDATE: Accept serverUrl prop
interface SimulationSceneProps {
    serverUrl: string | null
}

export function SimulationScene({ serverUrl }: SimulationSceneProps) {
  // UPDATE: Pass serverUrl to the hook
  const { lastAction, sendObservation, isConnected } = useSocketBridge(serverUrl)
  
  const [trialType, setTrialType] = useState<"A" | "B">("A")
  const [respawnKey, setRespawnKey] = useState(0)
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (lastAction.reset) {
        setRespawnKey(k => k + 1)
        setTrialType(Math.random() > 0.5 ? "A" : "B")
    }
  }, [lastAction.reset])

  const calculateReward = (pos: THREE.Vector3) => {
    if (Math.abs(pos.x) > 7) return -1.0;
    if (pos.z < -35 && lastAction.lick) {
        if (trialType === "A") {
            if (pos.x < 0) return 10.0; 
            else return -5.0;           
        }
        if (trialType === "B") {
            if (pos.x > 0) return 10.0; 
            else return -5.0;           
        }
    }
    return -0.01
  }

  useFrame(() => {
    if (isConnected) {
        const pos = playerPositionRef.current
        sendObservation({
            position: pos.z,
            x: pos.x,           
            trialType: trialType,
            reward: calculateReward(pos),
            done: false 
        })
    }
  })

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Physics gravity={[0, -9.8, 0]}>
        <Corridor isMotivated={true} leafSide={trialType === "A" ? "left" : "right"} />
        <Player 
          key={respawnKey} 
          isMotivated={true} 
          setMotivation={() => {}}
          aiInput={lastAction}
          grid={[]} 
          initialPosition={[0, 2, -2]} 
          positionRef={playerPositionRef} 
        />
      </Physics>
    </>
  )
}