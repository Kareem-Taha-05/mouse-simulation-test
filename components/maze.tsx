"use client"

import { useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { RigidBody } from "@react-three/rapier"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import type { MazeCell } from "@/utils/maze-generator"

interface MazeProps {
  isMotivated: boolean
  grid: MazeCell[][]
}

// --- VISUAL COMPONENT: WATER DROP (GOAL) ---
function WaterDrop({ x, y }: { x: number, y: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    ref.current.rotation.y += 0.02
  })
  return (
    <group ref={ref} position={[x * 4, 1, y * 4]}>
      <pointLight color="#0ea5e9" intensity={5} distance={8} decay={2} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

export function Maze({ isMotivated, grid }: MazeProps) {
  // 1. Load Textures
  const leafTexture = useTexture("/leaf.jpg")
  const circleTexture = useTexture("/circles.png")

  // 2. Configure Tiling (Repeats texture per block)
  useEffect(() => {
    leafTexture.wrapS = leafTexture.wrapT = THREE.RepeatWrapping
    leafTexture.repeat.set(1, 1) // 1x1 per block
    
    circleTexture.wrapS = circleTexture.wrapT = THREE.RepeatWrapping
    circleTexture.repeat.set(1, 1) 
  }, [leafTexture, circleTexture])

  // --- COMPONENT: FLOOR TILE ---
  const FloorTile = ({ x, y, type }: { x: number, y: number, type: "solution" | "dead-end" }) => {
    return (
      <group position={[x * 4, 0, y * 4]}>
        {/* The Floor Mesh */}
        <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <planeGeometry args={[4, 4]} />
          <meshStandardMaterial 
            // LOGIC: Solution = Leaf, Dead-End = Circle
            map={type === 'solution' ? leafTexture : circleTexture}
            
            // Visual feedback for motivation
            color={isMotivated ? "#ffffff" : "#666666"} 
          />
        </mesh>
        
        {/* Optional: Add a subtle border to make tiles pop */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
             <planeGeometry args={[3.8, 3.8]} />
             <meshBasicMaterial color="black" opacity={0.1} transparent wireframe />
        </mesh>
      </group>
    )
  }

  // --- COMPONENT: WALL BLOCK ---
  const WallBlock = ({ x, y }: { x: number, y: number }) => {
    return (
      <RigidBody type="fixed" colliders="cuboid" position={[x * 4, 3, y * 4]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[4, 6, 4]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </RigidBody>
    )
  }

  return (
    <group position={[-30, 0, -30]}>
      {/* Generate the Maze based on the Grid Data.
         We iterate through every cell and decide what to draw.
      */}
      {grid.map((row, x) => 
        row.map((cell, y) => {
          
          // A. WALLS
          if (cell.type === 'wall') {
            return <WallBlock key={`w-${x}-${y}`} x={x} y={y} />
          }
          
          // B. PATHS (FLOOR)
          if (cell.type === 'path' || cell.type === 'start' || cell.type === 'end') {
             return (
               <group key={`f-${x}-${y}`}>
                 <FloorTile x={x} y={y} type={cell.pathType === 'solution' ? 'solution' : 'dead-end'} />
                 {/* Draw the Goal if this is the end */}
                 {cell.type === 'end' && <WaterDrop x={x} y={y} />}
               </group>
             )
          }

          return null
        })
      )}
      
      {/* Base Floor Plane (Safety Net underneath) */}
      <RigidBody type="fixed" colliders="cuboid" position={[30, -0.5, 30]}>
        <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      </RigidBody>
    </group>
  )
}