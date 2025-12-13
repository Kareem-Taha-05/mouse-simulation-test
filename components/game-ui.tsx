"use client"

import { useEffect, useState } from "react"

interface GameUIProps {
  isMotivated: boolean
  score: number
  gameStatus: "playing" | "won"
  onNextTrial: () => void
}

export function GameUI({ isMotivated, score, gameStatus, onNextTrial }: GameUIProps) {
  // Fake Neural Data Generator
  const [neuralData, setNeuralData] = useState<number[]>(new Array(20).fill(10))

  useEffect(() => {
    const interval = setInterval(() => {
      setNeuralData(prev => {
        // Shift data left
        const newData = [...prev.slice(1)]
        // Generate new spike: Higher spikes if Motivated!
        const baseActivity = isMotivated ? 30 : 5
        const spike = Math.random() > 0.8 ? Math.random() * 50 : 0
        newData.push(baseActivity + spike)
        return newData
      })
    }, 100)
    return () => clearInterval(interval)
  }, [isMotivated])

  return (
    <>
      <div className="absolute top-0 right-0 p-6 pointer-events-none w-80">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-4 text-white shadow-2xl">
          
          <div className="flex justify-between items-center border-b border-white/20 pb-2">
             <h2 className="font-bold text-sm">V1 Visual Cortex Activity</h2>
             <div className={`w-2 h-2 rounded-full ${isMotivated ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>

          {/* NEURAL GRAPH VISUALIZER */}
          <div className="flex items-end h-16 gap-1 border-b border-l border-white/10 p-1">
            {neuralData.map((val, i) => (
              <div 
                key={i} 
                className={`w-full rounded-t-sm transition-all duration-300 ${isMotivated ? 'bg-green-500/80' : 'bg-red-500/50'}`}
                style={{ height: `${Math.min(val, 100)}%` }}
              />
            ))}
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Trial:</span>
              <span className="font-bold">{score + 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Motivation:</span>
              <span className={isMotivated ? "text-green-400" : "text-red-500"}>
                {isMotivated ? "High" : "Low"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Win Screen Logic (Same as before) */}
      {gameStatus === "won" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 pointer-events-auto">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-white mb-4">Trial Complete</h1>
            <button
              onClick={onNextTrial}
              className="px-8 py-3 bg-white text-black font-bold rounded hover:scale-105 transition-transform"
            >
              Next Trial
            </button>
          </div>
        </div>
      )}
    </>
  )
}