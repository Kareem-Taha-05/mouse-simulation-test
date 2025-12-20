"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { RapierRigidBody } from "@react-three/rapier"
import * as THREE from "three"
import { mobileControls } from "@/lib/mobile-input"

interface ThirdPersonCameraProps {
  target: React.RefObject<RapierRigidBody | null>
}

export function ThirdPersonCamera({ target }: ThirdPersonCameraProps) {
  const { camera, gl } = useThree()
  
  // Camera Orbit State
  const cameraState = useRef({
    distance: 8,       
    theta: 0,          // Starts BEHIND player
    phi: Math.PI / 4,  // 45 degrees up
  })

  const currentPosition = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())

  // --- MOUSE INPUT LOGIC ---
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Only rotate if pointer is locked (user clicked the screen)
      if (document.pointerLockElement === gl.domElement) {
        cameraState.current.theta -= e.movementX * 0.003
        
        const nextPhi = cameraState.current.phi - (e.movementY * 0.003)
        // Clamp to prevent flipping
        cameraState.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.2, nextPhi))
      }
    }

    const onClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock()
      }
    }

    document.addEventListener("mousemove", onMouseMove)
    gl.domElement.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("mousemove", onMouseMove)
      gl.domElement.removeEventListener("click", onClick)
    }
  }, [gl])

  useFrame((state, delta) => {
    if (!target.current) return

    // --- APPLY MOBILE LOOK ---
    if (mobileControls.look.x !== 0 || mobileControls.look.y !== 0) {
        cameraState.current.theta -= mobileControls.look.x * 2 
        const nextPhi = cameraState.current.phi - (mobileControls.look.y * 2)
        cameraState.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.2, nextPhi))
        
        // Reset delta
        mobileControls.look.set(0, 0)
    }

    // --- ORBIT MATH ---
    const targetPosition = target.current.translation()
    const { distance, theta, phi } = cameraState.current
    
    const offsetX = distance * Math.sin(phi) * Math.sin(theta)
    const offsetY = distance * Math.cos(phi)
    const offsetZ = distance * Math.sin(phi) * Math.cos(theta)

    const idealPosition = new THREE.Vector3(
      targetPosition.x + offsetX,
      targetPosition.y + offsetY,
      targetPosition.z + offsetZ
    )

    currentPosition.current.lerp(idealPosition, 5 * delta)
    camera.position.copy(currentPosition.current)

    // Look slightly above the player center
    const lookAtTarget = new THREE.Vector3(
      targetPosition.x, 
      targetPosition.y + 0.5, 
      targetPosition.z
    )

    currentLookAt.current.lerp(lookAtTarget, 5 * delta)
    camera.lookAt(currentLookAt.current)
  })

  return null
}