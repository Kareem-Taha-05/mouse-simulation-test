"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { RapierRigidBody } from "@react-three/rapier"
import * as THREE from "three"

interface ThirdPersonCameraProps {
  target: React.RefObject<RapierRigidBody | null>
}

export function ThirdPersonCamera({ target }: ThirdPersonCameraProps) {
  const { camera, gl } = useThree()
  
  // Camera Orbit State
  const cameraState = useRef({
    distance: 8,       // How far back the camera is
    theta: Math.PI,    // Horizontal angle (Starts behind player)
    phi: Math.PI / 4,  // Vertical angle (Starts at 45 degrees)
  })

  const currentPosition = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())

  // --- MOUSE INPUT LOGIC ---
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Only rotate if pointer is locked (user clicked the screen)
      if (document.pointerLockElement === gl.domElement) {
        // Horizontal Rotation (Yaw)
        cameraState.current.theta -= e.movementX * 0.003
        
        // Vertical Rotation (Pitch) - with clamping so you don't flip over
        const nextPhi = cameraState.current.phi - (e.movementY * 0.003)
        // Limit: Don't go below ground (0.1) or too high up (1.5)
        cameraState.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.2, nextPhi))
      }
    }

    // Click to capture mouse
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

    const targetPosition = target.current.translation()

    // 1. Calculate Orbit Position using Spherical Coordinates
    // x = r * sin(phi) * sin(theta)
    // y = r * cos(phi)
    // z = r * sin(phi) * cos(theta)
    const { distance, theta, phi } = cameraState.current
    
    const offsetX = distance * Math.sin(phi) * Math.sin(theta)
    const offsetY = distance * Math.cos(phi)
    const offsetZ = distance * Math.sin(phi) * Math.cos(theta)

    const idealPosition = new THREE.Vector3(
      targetPosition.x + offsetX,
      targetPosition.y + offsetY,
      targetPosition.z + offsetZ
    )

    // 2. Smoothly Move Camera
    currentPosition.current.lerp(idealPosition, 5 * delta) // Snappier follow
    camera.position.copy(currentPosition.current)

    // 3. Look at Player (offset slightly up so we look at head/body not feet)
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