"use client"

import { useEffect, useRef, useState } from "react"

export interface AgentAction {
  move: number   
  turn: number   
  lick: boolean 
  reset: boolean 
}

// UPDATE: Accept serverUrl as an argument
export function useSocketBridge(serverUrl: string | null) {
  const socketRef = useRef<WebSocket | null>(null)
  const [lastAction, setLastAction] = useState<AgentAction>({ move: 0, turn: 0, lick: false, reset: false })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Only connect if we have a URL and aren't already connected
    if (!serverUrl || socketRef.current) return;

    console.log(`🔌 Connecting to Brain at ${serverUrl}...`)
    
    // We define ws variable here, but we must rely on socketRef for cleanup
    let ws: WebSocket | null = null;

    try {
        ws = new WebSocket(serverUrl)

        ws.onopen = () => {
          console.log("✅ Connected to Brain")
          setIsConnected(true)
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === "RESET") {
            setLastAction(prev => ({ ...prev, reset: true }))
          } else {
            setLastAction({ 
              move: data.move, 
              turn: data.turn,
              lick: data.lick,
              reset: false
            })
          }
        }

        ws.onclose = () => {
            console.log("❌ Disconnected")
            setIsConnected(false)
            socketRef.current = null
        }

        ws.onerror = (err) => {
            console.error("Socket Error:", err)
            setIsConnected(false)
        }

        // Store it in the ref so it survives re-renders
        socketRef.current = ws

    } catch (e) {
        console.error("Invalid URL", e)
    }

    // --- CLEANUP FUNCTION ---
    // Fixed: We use socketRef.current instead of 'ws' here
    return () => {
      if (socketRef.current) {
          if (socketRef.current.readyState === WebSocket.OPEN) {
             socketRef.current.close()
          }
          socketRef.current = null
      }
    }
  }, [serverUrl]) // Re-run if URL changes

  const sendObservation = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
    }
  }

  return { lastAction, isConnected, sendObservation }
}