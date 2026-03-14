'use client'

import { useState, useEffect } from 'react'

const loadingMessages = [
  "Analyzing your query...",
  "Crunching the numbers...",
  "Generating visualizations..."
]

export function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mb-6 sm:mb-8">
        <div 
          className="h-full w-full rounded-full"
          style={{ 
            animation: 'progress 2s ease-in-out infinite, progress-glow 1.5s ease-in-out infinite',
            background: 'linear-gradient(90deg, hsl(248,90%,68%), hsl(270,83%,65%))'
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <SkeletonCard index={0} />
        <SkeletonCard index={1} />
      </div>
      <SkeletonCard fullWidth index={2} />

      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-sm sm:text-base text-muted-foreground font-mono animate-typewriter">
          {loadingMessages[messageIndex]}
        </p>
      </div>
    </div>
  )
}

function SkeletonCard({ fullWidth = false, index = 0 }: { fullWidth?: boolean; index?: number }) {
  return (
    <div 
      className={`glass-card rounded-2xl p-5 sm:p-6 shimmer-card ${fullWidth ? 'col-span-1 md:col-span-2' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-5 sm:h-6 w-32 sm:w-48 bg-secondary rounded-lg animate-skeleton mb-2" />
      <div className="h-3 sm:h-4 w-48 sm:w-64 bg-secondary/50 rounded-lg animate-skeleton mb-4 sm:mb-6" />
      <div className="h-40 sm:h-48 bg-secondary/30 rounded-xl animate-skeleton relative overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-around p-4 gap-2 opacity-30">
          {[65, 40, 80, 55, 70, 45, 85, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-primary/20 rounded-t animate-skeleton" style={{ height: `${h}%`, animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
