"use client"

import { RigidBody } from "@react-three/rapier"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import { useMemo } from "react"

interface CorridorProps {
  isMotivated: boolean
  leafSide: "left" | "right"
}

export function Corridor({ isMotivated, leafSide }: CorridorProps) {
  const corridorLength = 40
  const wallHeight = 6

  // 1. Load the "Master" Textures
  const leafMaster = useTexture("/leaf.jpg")
  const circleMaster = useTexture("/circles.png")

  // 2. CLONE them so we can change settings without breaking the Maze
  const leafTexture = useMemo(() => {
    const t = leafMaster.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 2) // Repeat 10x horizontally, 2x vertically
    t.needsUpdate = true
    return t
  }, [leafMaster])

  const circleTexture = useMemo(() => {
    const t = circleMaster.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 2)
    t.needsUpdate = true
    return t
  }, [circleMaster])

  // Decide Textures
  const leftMaterialMap = leafSide === "left" ? leafTexture : circleTexture
  const rightMaterialMap = leafSide === "right" ? leafTexture : circleTexture
  
  const tint = isMotivated ? "#ffffff" : "#555555"

  return (
    <group>
      {/* --- FLOOR --- */}
      <RigidBody type="fixed" colliders="cuboid" friction={1}>
        <mesh receiveShadow position={[0, -0.5, -corridorLength / 2]}>
          <boxGeometry args={[16, 1, corridorLength]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
      </RigidBody>

      {/* --- THE CENTRAL DIVIDER --- */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, -22]} castShadow>
          <boxGeometry args={[1, wallHeight, 35]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>

      {/* --- LEFT CORRIDOR OUTER WALL --- */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-6, wallHeight / 2, -corridorLength / 2]} receiveShadow>
          <boxGeometry args={[1, wallHeight, corridorLength]} />
          <meshStandardMaterial map={leftMaterialMap} color={tint} />
        </mesh>
      </RigidBody>

      {/* --- RIGHT CORRIDOR OUTER WALL --- */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[6, wallHeight / 2, -corridorLength / 2]} receiveShadow>
          <boxGeometry args={[1, wallHeight, corridorLength]} />
          <meshStandardMaterial map={rightMaterialMap} color={tint} />
        </mesh>
      </RigidBody>

      {/* --- VISUAL REWARD MARKERS --- */}
      {/* Left Goal */}
      <mesh position={[-3, 2, -corridorLength + 2]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial 
          color={leafSide === "left" ? "#3b82f6" : "#ef4444"} 
          emissive={leafSide === "left" ? "#3b82f6" : "#ef4444"}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Right Goal */}
      <mesh position={[3, 2, -corridorLength + 2]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial 
          color={leafSide === "right" ? "#3b82f6" : "#ef4444"} 
          emissive={leafSide === "right" ? "#3b82f6" : "#ef4444"}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Back Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, -corridorLength]}>
          <boxGeometry args={[16, wallHeight, 1]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </RigidBody>
    </group>
  )
}