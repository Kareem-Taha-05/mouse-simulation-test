"use client"

import { useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber" 
import { useKeyboardControls } from "@react-three/drei"
import { RigidBody, CapsuleCollider, type RapierRigidBody } from "@react-three/rapier"
import * as THREE from "three"
import { ThirdPersonCamera } from "./third-person-camera"
import type { MazeCell } from "@/utils/maze-generator"

interface PlayerProps {
  isMotivated: boolean
  setMotivation: (m: boolean) => void
  grid: MazeCell[][]
}

export function Player({ isMotivated, setMotivation, grid }: PlayerProps) {
  const playerRef = useRef<RapierRigidBody>(null)
  const isMovingRef = useRef(false)
  const [, getKeys] = useKeyboardControls()
  const { camera } = useThree() 
  
  const lightTarget = useRef(new THREE.Object3D())

  const moveSpeed = isMotivated ? 6 : 2.5 
  const rotationSpeed = isMotivated ? 12 : 3
  const [hopOffset, setHopOffset] = useState(0)
  const [legAngle, setLegAngle] = useState(0)

  useFrame((state, delta) => {
    if (!playerRef.current) return

    // --- SENSORY LOGIC ---
    const worldPos = playerRef.current.translation()
    const gx = Math.round((worldPos.x + 30) / 4)
    const gy = Math.round((worldPos.z + 30) / 4)

    if (grid[gx] && grid[gx][gy]) {
      const currentCell = grid[gx][gy]
      if (currentCell.pathType === 'dead-end') {
        if (isMotivated) setMotivation(false)
      } else if (currentCell.pathType === 'solution') {
        if (!isMotivated) setMotivation(true)
      }
    }

    // --- MOVEMENT LOGIC ---
    const { forward, backward, left, right } = getKeys()
    
    const cameraForward = new THREE.Vector3(0, 0, -1)
    cameraForward.applyQuaternion(camera.quaternion)
    cameraForward.y = 0
    cameraForward.normalize()

    const cameraRight = new THREE.Vector3(1, 0, 0)
    cameraRight.applyQuaternion(camera.quaternion)
    cameraRight.y = 0
    cameraRight.normalize()

    const moveDirection = new THREE.Vector3(0, 0, 0)
    if (forward) moveDirection.add(cameraForward)
    if (backward) moveDirection.sub(cameraForward)
    if (left) moveDirection.sub(cameraRight) 
    if (right) moveDirection.add(cameraRight)

    if (moveDirection.length() > 0) moveDirection.normalize()

    const currentlyMoving = moveDirection.length() > 0.1
    isMovingRef.current = currentlyMoving

    // --- ANIMATION ---
    if (currentlyMoving) {
      const hopSpeed = isMotivated ? 15 : 8
      const bounce = Math.sin(state.clock.elapsedTime * hopSpeed) * 0.05
      setHopOffset(Math.abs(bounce)) 
      setLegAngle(Math.sin(state.clock.elapsedTime * 20) * 0.6)
    } else {
      setHopOffset(0)
      setLegAngle(0)
    }

    // --- PHYSICS ---
    const velocity = playerRef.current.linvel()
    playerRef.current.setLinvel({ 
        x: moveDirection.x * moveSpeed, 
        y: velocity.y, 
        z: moveDirection.z * moveSpeed 
    }, true)

    if (currentlyMoving) {
      const targetAngle = Math.atan2(moveDirection.x, moveDirection.z)
      const targetRotation = new THREE.Quaternion()
      targetRotation.setFromEuler(new THREE.Euler(0, targetAngle, 0))
      const currentRotation = new THREE.Quaternion().copy(playerRef.current.rotation() as any)
      currentRotation.rotateTowards(targetRotation, rotationSpeed * delta)
      playerRef.current.setRotation(currentRotation, true)
    }
  })

  // Reusable Material
  const furColor = isMotivated ? "#f0f0f0" : "#a1a1aa"
  const FurMat = <meshStandardMaterial color={furColor} roughness={0.6} />

  return (
    <>
      <RigidBody
        ref={playerRef}
        position={[-26, 2, -26]}
        type="dynamic"
        colliders={false}
        lockRotations
        friction={0}
      >
        <CapsuleCollider args={[0.2, 0.2]} />

        {/* HEADLIGHT SYSTEM */}
        <primitive object={lightTarget.current} position={[0, 0, 10]} />
        <spotLight 
          position={[0, 1.5, 0]} 
          target={lightTarget.current} 
          angle={0.6} 
          penumbra={0.5} 
          intensity={isMotivated ? 20 : 5} 
          distance={20} 
          castShadow 
          color="white"
        />
        <pointLight position={[0, 1, 0]} intensity={1} distance={4} color="white" />

        {/* --- IMPROVED MOUSE MODEL --- */}
        <group 
          position={[0, -0.3 + hopOffset, 0]} 
          rotation={[0, Math.PI, 0]} // Face forward
        >
           
           {/* 1. HUNCHED BODY (Teardrop shape) */}
           {/* We scale a sphere to look like a hunched mouse body */}
           <mesh position={[0, 0.2, 0.1]} scale={[1, 0.9, 1.6]} castShadow>
             <sphereGeometry args={[0.22, 32, 32]} />
             {FurMat}
           </mesh>

           {/* 2. HEAD (Seamlessly attached) */}
           <mesh position={[0, 0.25, -0.2]} scale={[1, 0.8, 1.2]} castShadow>
             <sphereGeometry args={[0.18, 32, 32]} />
             {FurMat}
           </mesh>

           {/* 3. SNOUT (White Cone, not Pink!) */}
           {/* This fixes the "Pig" look. It's fur-colored now. */}
           <mesh position={[0, 0.22, -0.38]} rotation={[Math.PI/2, 0, 0]} castShadow>
             <coneGeometry args={[0.07, 0.15, 32]} />
             {FurMat}
           </mesh>

           {/* 4. NOSE TIP (Tiny Pink Dot) */}
           <mesh position={[0, 0.22, -0.46]}>
             <sphereGeometry args={[0.025, 16, 16]} />
             <meshStandardMaterial color="#fda4af" /> {/* Soft Pink */}
           </mesh>

           {/* 5. EARS (Large, thin, rounded) */}
           {/* Left Ear */}
           <mesh position={[-0.14, 0.38, -0.2]} rotation={[0.4, 0.2, -0.5]}>
             <cylinderGeometry args={[0.09, 0.09, 0.01, 32]} />
             <meshStandardMaterial color="#fce7f3" /> {/* Pale Pink */}
           </mesh>
           {/* Right Ear */}
           <mesh position={[0.14, 0.38, -0.2]} rotation={[0.4, -0.2, 0.5]}>
             <cylinderGeometry args={[0.09, 0.09, 0.01, 32]} />
             <meshStandardMaterial color="#fce7f3" />
           </mesh>

           {/* 6. EYES (Beady Black) */}
           <mesh position={[-0.08, 0.28, -0.32]}>
             <sphereGeometry args={[0.025]} />
             <meshStandardMaterial color="black" roughness={0.1} />
           </mesh>
           <mesh position={[0.08, 0.28, -0.32]}>
             <sphereGeometry args={[0.025]} />
             <meshStandardMaterial color="black" roughness={0.1} />
           </mesh>

           {/* 7. WHISKERS */}
           <group position={[0, 0.22, -0.42]}>
              <mesh position={[0.12, 0, 0]} rotation={[0, 0.2, 0]}>
                <boxGeometry args={[0.25, 0.005, 0.005]} />
                <meshBasicMaterial color="black" />
              </mesh>
              <mesh position={[-0.12, 0, 0]} rotation={[0, -0.2, 0]}>
                <boxGeometry args={[0.25, 0.005, 0.005]} />
                <meshBasicMaterial color="black" />
              </mesh>
           </group>

           {/* 8. LEGS (Short and tucked) */}
           <mesh position={[-0.12, 0.08, -0.15]} rotation={[legAngle, 0, 0]}>
             <capsuleGeometry args={[0.04, 0.12, 4, 8]} />
             {FurMat}
           </mesh>
           <mesh position={[0.12, 0.08, -0.15]} rotation={[-legAngle, 0, 0]}>
             <capsuleGeometry args={[0.04, 0.12, 4, 8]} />
             {FurMat}
           </mesh>
           <mesh position={[-0.14, 0.08, 0.3]} rotation={[-legAngle, 0, 0]}>
             <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
             {FurMat}
           </mesh>
           <mesh position={[0.14, 0.08, 0.3]} rotation={[legAngle, 0, 0]}>
             <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
             {FurMat}
           </mesh>

           {/* 9. TAIL (Long, thin, pinkish-white) */}
           <mesh position={[0, 0.15, 0.5]} rotation={[Math.PI/1.9, 0, 0]}>
             <cylinderGeometry args={[0.015, 0.03, 0.7]} />
             <meshStandardMaterial color="#fce7f3" />
           </mesh>

        </group>

      </RigidBody>
      <ThirdPersonCamera target={playerRef} />
    </>
  )
}