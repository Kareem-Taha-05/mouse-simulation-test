"use client"

import { RigidBody } from "@react-three/rapier"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"

interface CorridorProps {
  isMotivated: boolean
  leafSide: "left" | "right"
}

export function Corridor({ isMotivated, leafSide }: CorridorProps) {
  const corridorLength = 40
  const wallHeight = 6

  // 1. Load Textures
  const leafTexture = useTexture("/leaf.jpg")
  const circleTexture = useTexture("/circles.png")

  // Configure repeating
  leafTexture.wrapS = leafTexture.wrapT = THREE.RepeatWrapping
  leafTexture.repeat.set(4, 1)
  circleTexture.wrapS = circleTexture.wrapT = THREE.RepeatWrapping
  circleTexture.repeat.set(4, 1)

  // 2. Decide Textures based on randomization
  // If leafSide is 'left', Left Wall gets Leaf. Otherwise Circle.
  const leftMaterialMap = leafSide === "left" ? leafTexture : circleTexture
  const rightMaterialMap = leafSide === "right" ? leafTexture : circleTexture
  
  const tint = isMotivated ? "#ffffff" : "#555555"

  return (
    <group>
      {/* --- FLOOR --- */}
      {/* Wide floor to cover both paths */}
      <RigidBody type="fixed" colliders="cuboid" friction={1}>
        <mesh receiveShadow position={[0, -0.5, -corridorLength / 2]}>
          <boxGeometry args={[16, 1, corridorLength]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
      </RigidBody>


      {/* --- THE CENTRAL DIVIDER --- */}
      {/* Splits the room into two tunnels starting at z = -5 */}
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


      {/* --- VISUAL REWARD MARKERS (The glowing orbs) --- */}
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

      {/* Back Wall (End of maze) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, -corridorLength]}>
          <boxGeometry args={[16, wallHeight, 1]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </RigidBody>
    </group>
  )
}