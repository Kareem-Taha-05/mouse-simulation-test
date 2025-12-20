import * as THREE from "three"

// Global object to store mobile input state
// We use this instead of React State to avoid re-rendering the whole app 60 times a second
export const mobileControls = {
  move: new THREE.Vector2(0, 0), // Left Stick (WASD)
  look: new THREE.Vector2(0, 0), // Right Stick / Swipe (Camera)
  isTouching: false
}