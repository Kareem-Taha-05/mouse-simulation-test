"use client"

import { useEffect, useRef, useState } from "react"

export interface AgentAction {
  move: number   
  turn: number   
  lick: boolean 
  reset: boolean 
}

export function useSocketBridge() {
  const socketRef = useRef<WebSocket | null>(null)
  const [lastAction, setLastAction] = useState<AgentAction>({ move: 0, turn: 0, lick: false, reset: false })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // 1. Check if we already have an active connection
    if (socketRef.current) return;

    console.log("🔌 Connecting to Brain...")
    const ws = new WebSocket("ws://localhost:8000/ws")

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
        console.log("❌ Disconnected from Brain")
        setIsConnected(false)
        socketRef.current = null
    }

    ws.onerror = (err) => {
        console.error("Socket Error:", err)
    }

    socketRef.current = ws

    // Cleanup: Only close if the component actually unmounts
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
          ws.close()
      }
    }
  }, [])

  const sendObservation = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
    }
  }

  return { lastAction, isConnected, sendObservation }
}