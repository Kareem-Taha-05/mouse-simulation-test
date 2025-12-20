"use client"

import { useEffect, useRef, useState } from "react"
import { mobileControls } from "@/lib/mobile-input"

export function MobileJoystick() {
  const joystickRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })

  // --- 1. MOVEMENT JOYSTICK (LEFT) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
    setActive(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active) return
    const touch = e.touches[0]
    
    // Calculate distance from start
    let deltaX = touch.clientX - startPos.current.x
    let deltaY = touch.clientY - startPos.current.y
    
    // Clamp distance (don't let the stick fly off screen)
    const maxDist = 40
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (dist > maxDist) {
      const angle = Math.atan2(deltaY, deltaX)
      deltaX = Math.cos(angle) * maxDist
      deltaY = Math.sin(angle) * maxDist
    }

    setPosition({ x: deltaX, y: deltaY })

    // Update Global State (Normalized -1 to 1)
    // Invert Y because screen Y is opposite to 3D Z
    mobileControls.move.set(deltaX / maxDist, -deltaY / maxDist) 
  }

  const handleTouchEnd = () => {
    setActive(false)
    setPosition({ x: 0, y: 0 })
    mobileControls.move.set(0, 0)
  }

  // --- 2. CAMERA LOOK (RIGHT SIDE) ---
  // We attach this to the window via useEffect to catch swipes anywhere on the right
  useEffect(() => {
    let lastX = 0
    let lastY = 0

    const onTouchStart = (e: TouchEvent) => {
      // Only care about touches on the right half of the screen
      if (e.touches[0].clientX > window.innerWidth / 2) {
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
        mobileControls.isTouching = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!mobileControls.isTouching) return
      
      // Find the touch that is on the right side
      // (Simple version: just take the last changed touch)
      const touch = e.touches[0] 
      
      const deltaX = touch.clientX - lastX
      const deltaY = touch.clientY - lastY

      lastX = touch.clientX
      lastY = touch.clientY

      // Accumulate look delta
      mobileControls.look.x += deltaX * 0.005
      mobileControls.look.y += deltaY * 0.005
    }

    const onTouchEnd = () => {
       mobileControls.isTouching = false
    }

    // Add passive listeners (better performance)
    window.addEventListener("touchstart", onTouchStart, { passive: false })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)

    return () => {
        window.removeEventListener("touchstart", onTouchStart)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-40 pointer-events-none touch-none">
      
      {/* JOYSTICK CONTAINER (Bottom Left) */}
      <div 
        className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full border border-white/20 pointer-events-auto backdrop-blur-sm"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* THE STICK */}
        <div 
          className="absolute w-12 h-12 bg-white/50 rounded-full shadow-lg"
          style={{
            left: `calc(50% - 24px + ${position.x}px)`,
            top: `calc(50% - 24px + ${position.y}px)`,
            transition: active ? 'none' : 'all 0.2s ease-out'
          }}
        />
      </div>

      {/* LOOK HINT (Right Side) */}
      <div className="absolute bottom-10 right-10 text-white/30 text-sm font-bold animate-pulse">
        DRAG TO LOOK
      </div>
    </div>
  )
}