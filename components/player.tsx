"use client"

import { useRef, useState, useEffect, MutableRefObject } from "react"
import { useFrame, useThree } from "@react-three/fiber" 
import { useKeyboardControls } from "@react-three/drei"
import { RigidBody, CapsuleCollider, type RapierRigidBody } from "@react-three/rapier"
import * as THREE from "three"
import { ThirdPersonCamera } from "./third-person-camera"
import type { MazeCell } from "@/utils/maze-generator"
import { AgentAction } from "@/hooks/use-socket-bridge"
import { mobileControls } from "@/lib/mobile-input"

interface PlayerProps {
  isMotivated: boolean
  setMotivation: (m: boolean) => void
  grid?: MazeCell[][]
  aiInput?: AgentAction 
  initialPosition?: [number, number, number]
  positionRef?: MutableRefObject<THREE.Vector3> 
}

export function Player({ 
  isMotivated, 
  setMotivation, 
  grid = [], 
  aiInput, 
  initialPosition = [-26, 4, -26], 
  positionRef
}: PlayerProps) {
  const playerRef = useRef<RapierRigidBody>(null)
  const isMovingRef = useRef(false)
  const [, getKeys] = useKeyboardControls()
  const { camera } = useThree() 
  const lightTarget = useRef(new THREE.Object3D())

  // --- FORCE SPAWN TELEPORT ---
  useEffect(() => {
    if (playerRef.current) {
        playerRef.current.setTranslation(
            { x: initialPosition[0], y: initialPosition[1], z: initialPosition[2] }, 
            true 
        )
        playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        playerRef.current.setRotation({ x: 0, y: 1, z: 0, w: 0 }, true)
    }
  }, [initialPosition[0], initialPosition[1], initialPosition[2]]) 

  const moveSpeed = isMotivated ? 6 : 4.0 
  const rotationSpeed = isMotivated ? 12 : 5
  const [hopOffset, setHopOffset] = useState(0)
  const [legAngle, setLegAngle] = useState(0)

  // --- FIX: CONDITIONAL MESH OFFSET ---
  // Lab Mode (aiInput) needs -0.15 to touch floor. Game Mode needs 0.09.
  const meshBaseY = aiInput ? -0.15 : 0.09

  useFrame((state, delta) => {
    if (!playerRef.current) return

    // Report Position to AI
    if (positionRef) {
        const t = playerRef.current.translation()
        positionRef.current.set(t.x, t.y, t.z)
    }

    // Sensory Logic (Game Mode Only)
    if (!aiInput && grid.length > 0) {
      const worldPos = playerRef.current.translation()
      const gx = Math.round((worldPos.x + 30) / 4)
      const gy = Math.round((worldPos.z + 30) / 4)
      if (grid[gx] && grid[gx][gy]) {
        const currentCell = grid[gx][gy]
        if (currentCell.pathType === 'dead-end') { if (isMotivated) setMotivation(false) } 
        else if (currentCell.pathType === 'solution') { if (!isMotivated) setMotivation(true) }
      }
    }

    // --- CONTROL LOGIC ---
    let moveDirection = new THREE.Vector3(0, 0, 0)
    let currentlyMoving = false

    if (aiInput) {
        // AI CONTROLS
        if (aiInput.move > 0.5) {
            moveDirection.set(0, 0, -1) 
            currentlyMoving = true
        }
        if (aiInput.turn !== 0) {
            moveDirection.x = aiInput.turn * 0.5 
            moveDirection.normalize()
            currentlyMoving = true
        }
    } else {
        // PLAYER CONTROLS (Keyboard + Mobile)
        const { forward, backward, left, right } = getKeys()
        
        let fwdInput = forward ? 1 : 0
        let backInput = backward ? 1 : 0
        let leftInput = left ? 1 : 0
        let rightInput = right ? 1 : 0

        // Mix in Mobile Joystick
        if (mobileControls.move.y > 0) fwdInput += mobileControls.move.y
        if (mobileControls.move.y < 0) backInput += Math.abs(mobileControls.move.y)
        if (mobileControls.move.x < 0) leftInput += Math.abs(mobileControls.move.x)
        if (mobileControls.move.x > 0) rightInput += mobileControls.move.x

        const cameraForward = new THREE.Vector3(0, 0, -1)
        cameraForward.applyQuaternion(camera.quaternion)
        cameraForward.y = 0; cameraForward.normalize()
        const cameraRight = new THREE.Vector3(1, 0, 0)
        cameraRight.applyQuaternion(camera.quaternion)
        cameraRight.y = 0; cameraRight.normalize()

        if (fwdInput > 0.1) moveDirection.add(cameraForward.multiplyScalar(fwdInput))
        if (backInput > 0.1) moveDirection.sub(cameraForward.multiplyScalar(backInput))
        if (leftInput > 0.1) moveDirection.sub(cameraRight.multiplyScalar(leftInput)) 
        if (rightInput > 0.1) moveDirection.add(cameraRight.multiplyScalar(rightInput))

        if (moveDirection.length() > 0) moveDirection.normalize()
        currentlyMoving = moveDirection.length() > 0.1
    }

    isMovingRef.current = currentlyMoving

    // Animation
    if (currentlyMoving) {
      const hopSpeed = isMotivated ? 15 : 8
      const bounce = Math.sin(state.clock.elapsedTime * hopSpeed) * 0.05
      setHopOffset(Math.abs(bounce)) 
      setLegAngle(Math.sin(state.clock.elapsedTime * 20) * 0.6)
    } else {
      setHopOffset(0); setLegAngle(0)
    }

    // Physics
    const velocity = playerRef.current.linvel()
    playerRef.current.setLinvel({ 
        x: moveDirection.x * moveSpeed, 
        y: velocity.y, 
        z: moveDirection.z * moveSpeed 
    }, true)

    if (currentlyMoving) {
      // Rotate mesh to face movement
      const targetAngle = Math.atan2(moveDirection.x, moveDirection.z)
      const targetRotation = new THREE.Quaternion()
      targetRotation.setFromEuler(new THREE.Euler(0, targetAngle, 0))
      const currentRotation = new THREE.Quaternion().copy(playerRef.current.rotation() as any)
      currentRotation.rotateTowards(targetRotation, rotationSpeed * delta)
      playerRef.current.setRotation(currentRotation, true)
    }
  })

  const furColor = isMotivated ? "#f0f0f0" : "#a1a1aa"
  const FurMat = <meshStandardMaterial color={furColor} roughness={0.6} />

  return (
    <>
      <RigidBody
        ref={playerRef}
        position={initialPosition} 
        type="dynamic"
        colliders={false}
        lockRotations
        friction={0}
      >
        <CapsuleCollider args={[0.2, 0.2]} />
        <primitive object={lightTarget.current} position={[0, 0, 10]} />
        <spotLight position={[0, 1.5, 0]} target={lightTarget.current} angle={0.6} penumbra={0.5} intensity={isMotivated ? 20 : 5} distance={20} castShadow color="white"/>
        <pointLight position={[0, 1, 0]} intensity={1} distance={4} color="white" />
        
        {/* MOUSE MESH */}
        <group position={[0, meshBaseY + hopOffset, 0]} rotation={[0, Math.PI, 0]}>
           <mesh position={[0, 0.2, 0.1]} scale={[1, 0.9, 1.6]} castShadow><sphereGeometry args={[0.22, 32, 32]} />{FurMat}</mesh>
           <mesh position={[0, 0.25, -0.2]} scale={[1, 0.8, 1.2]} castShadow><sphereGeometry args={[0.18, 32, 32]} />{FurMat}</mesh>
           <mesh position={[0, 0.22, -0.38]} rotation={[Math.PI/2, 0, 0]} castShadow><coneGeometry args={[0.07, 0.15, 32]} />{FurMat}</mesh>
           <mesh position={[0, 0.22, -0.46]}><sphereGeometry args={[0.025, 16, 16]} /><meshStandardMaterial color="#fda4af" /></mesh>
           <mesh position={[-0.14, 0.38, -0.2]} rotation={[0.4, 0.2, -0.5]}><cylinderGeometry args={[0.09, 0.09, 0.01, 32]} /><meshStandardMaterial color="#fce7f3" /></mesh>
           <mesh position={[0.14, 0.38, -0.2]} rotation={[0.4, -0.2, 0.5]}><cylinderGeometry args={[0.09, 0.09, 0.01, 32]} /><meshStandardMaterial color="#fce7f3" /></mesh>
           <mesh position={[-0.08, 0.28, -0.32]}><sphereGeometry args={[0.025]} /><meshStandardMaterial color="black" roughness={0.1} /></mesh>
           <mesh position={[0.08, 0.28, -0.32]}><sphereGeometry args={[0.025]} /><meshStandardMaterial color="black" roughness={0.1} /></mesh>
           <mesh position={[0, 0.15, 0.5]} rotation={[Math.PI/1.9, 0, 0]}><cylinderGeometry args={[0.015, 0.03, 0.7]} /><meshStandardMaterial color="#fce7f3" /></mesh>
        </group>
      </RigidBody>
      <ThirdPersonCamera target={playerRef} />
    </>
  )
}