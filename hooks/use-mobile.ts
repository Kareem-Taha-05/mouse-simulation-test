import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(true) // Default to true to prevent flicker

  React.useEffect(() => {
    // 1. Width Check (Standard mobile)
    const widthMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // 2. Touch Check (Tablets, Foldables, Landscape Phones)
    // (pointer: coarse) detects if the primary input mechanism is a finger
    const touchMql = window.matchMedia('(pointer: coarse)')

    const onChange = () => {
      // It is "Mobile" if:
      // A) The screen is narrow OR
      // B) The device uses touch (even if screen is wide like Z Fold)
      setIsMobile(widthMql.matches || touchMql.matches)
    }

    widthMql.addEventListener('change', onChange)
    touchMql.addEventListener('change', onChange)
    
    // Run once on mount
    onChange()

    return () => {
      widthMql.removeEventListener('change', onChange)
      touchMql.removeEventListener('change', onChange)
    }
  }, [])

  return isMobile
}