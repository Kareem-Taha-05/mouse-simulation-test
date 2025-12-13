"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { RigidBody } from "@react-three/rapier"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import type { MazeCell } from "@/utils/maze-generator"

interface MazeProps {
  isMotivated: boolean
  grid: MazeCell[][]
}

// --- NEW COMPONENT: ANIMATED WATER DROP ---
function WaterDrop({ x, y }: { x: number, y: number }) {
  const ref = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ref.current) return
    // Bob up and down (Sine Wave)
    ref.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    // Spin slowly
    ref.current.rotation.y += 0.02
  })

  const waterMaterial = (
    <meshStandardMaterial 
      color="#0ea5e9"      // Sky Blue
      emissive="#0ea5e9"   // Glows
      emissiveIntensity={0.8}
      roughness={0.1}      // Shiny
      metalness={0.5}      // Reflective
    />
  )

  return (
    <group ref={ref} position={[x * 4, 1, y * 4]}>
      {/* Glow Light */}
      <pointLight color="#0ea5e9" intensity={5} distance={8} decay={2} />
      
      {/* 1. Bottom of Drop (Sphere) */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        {waterMaterial}
      </mesh>

      {/* 2. Top of Drop (Cone) */}
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.4, 0.95, 32]} />
        {waterMaterial}
      </mesh>
    </group>
  )
}

// --- MAIN MAZE COMPONENT ---
export function Maze({ isMotivated, grid }: MazeProps) {
  const leafTexture = useTexture("/leaf.jpg")
  const circleTexture = useTexture("/circles.png")
  
  leafTexture.wrapS = leafTexture.wrapT = THREE.RepeatWrapping
  circleTexture.wrapS = circleTexture.wrapT = THREE.RepeatWrapping
  leafTexture.repeat.set(1, 1)
  circleTexture.repeat.set(1, 1)

  // Wall Block Component
  const WallBlock = ({ x, y, texture }: { x: number, y: number, texture: "leaf" | "circle" | "none" }) => {
    return (
      <RigidBody type="fixed" colliders="cuboid" position={[x * 4, 3, y * 4]}>
        <mesh receiveShadow>
          <boxGeometry args={[4, 6, 4]} />
          <meshStandardMaterial 
             map={texture === 'leaf' ? leafTexture : (texture === 'circle' ? circleTexture : null)}
             color={isMotivated ? "#ffffff" : "#555555"}
             {...(texture === 'none' ? { color: "#333333" } : {})}
          />
        </mesh>
      </RigidBody>
    )
  }

  // Floor Path Component
  const PathFloor = ({ x, y, type }: { x: number, y: number, type: "solution" | "dead-end" }) => {
    return (
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[x*4, 0.05, y*4]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial 
          map={type === 'solution' ? leafTexture : circleTexture}
          color={isMotivated ? "#ffffff" : "#444444"}
          opacity={0.3} 
          transparent
        />
      </mesh>
    )
  }

  const getTextureForWall = (x: number, y: number): "leaf" | "circle" | "none" => {
    const neighbors = [
      grid[x+1]?.[y], grid[x-1]?.[y], grid[x]?.[y+1], grid[x]?.[y-1]
    ].filter(Boolean)

    if (neighbors.some(n => n.pathType === 'dead-end')) return 'circle'
    if (neighbors.some(n => n.pathType === 'solution')) return 'leaf'
    
    return 'none'
  }

  return (
    <group position={[-30, 0, -30]}>
      
      {/* Main Floor */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} position={[30, -0.5, 30]}>
        <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
      </RigidBody>

      {/* Grid Generation */}
      {grid.map((row, x) => 
        row.map((cell, y) => {
          // Walls
          if (cell.type === 'wall') {
            return <WallBlock key={`w-${x}-${y}`} x={x} y={y} texture={getTextureForWall(x, y)} />
          }
          
          // Floor Hints
          if (cell.type === 'path' || cell.type === 'start') {
            return <PathFloor key={`p-${x}-${y}`} x={x} y={y} type={cell.pathType === 'dead-end' ? 'dead-end' : 'solution'} />
          }

          // REWARD (The Water Drop)
          if (cell.type === 'end') {
             return <WaterDrop key="end" x={x} y={y} />
          }
          return null
        })
      )}
    </group>
  )
}