"use client"

import { useState, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { Physics } from "@react-three/rapier"
import { Player } from "./player"
import { Corridor } from "./corridor"
import { useSocketBridge } from "@/hooks/use-socket-bridge"
import * as THREE from "three"

export function SimulationScene() {
  const { lastAction, sendObservation, isConnected } = useSocketBridge()
  
  // Trial State: "A" = Leaf Left, "B" = Leaf Right
  const [trialType, setTrialType] = useState<"A" | "B">("A")
  const [respawnKey, setRespawnKey] = useState(0)

  // Track player position for logic
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (lastAction.reset) {
        console.log("♻️ RESET TRIGGERED")
        setRespawnKey(k => k + 1)
        // Randomize the next trial
        setTrialType(Math.random() > 0.5 ? "A" : "B")
    }
  }, [lastAction.reset])

  const calculateReward = (pos: THREE.Vector3) => {
    // 1. Wall Penalty (Running into side walls)
    if (Math.abs(pos.x) > 7) return -1.0;

    // 2. Goal Logic (Must be past Z = -35)
    if (pos.z < -35 && lastAction.lick) {
        
        // --- STRICT LOGIC CHECK ---
        
        // CASE A: Leaf is on LEFT. (Correct Zone: X < 0)
        if (trialType === "A") {
            if (pos.x < 0) return 10.0; // SUCCESS (Left Side)
            else return -5.0;           // FAIL (Right Side / Circles)
        }

        // CASE B: Leaf is on RIGHT. (Correct Zone: X > 0)
        if (trialType === "B") {
            if (pos.x > 0) return 10.0; // SUCCESS (Right Side)
            else return -5.0;           // FAIL (Left Side / Circles)
        }
    }
    
    // 3. Time Penalty (Encourage speed)
    return -0.01
  }

  // --- DATA STREAM TO PYTHON ---
  useFrame(() => {
    if (isConnected) {
        const pos = playerPositionRef.current
        
        sendObservation({
            position: pos.z,
            x: pos.x,           // NEW: Send X so AI knows if it's Left/Right
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
        
        {/* Render Corridor based on Trial Type */}
        <Corridor 
          isMotivated={true} 
          leafSide={trialType === "A" ? "left" : "right"} 
        />

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