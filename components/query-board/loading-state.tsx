'use client'

import { useState, useEffect } from 'react'

const loadingMessages = [
  "Analyzing your query...",
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
      {/* Progress bar */}
      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mb-6 sm:mb-8">
        <div 
          className="h-full bg-primary w-full"
          style={{ animation: 'progress 2s ease-in-out infinite, progress-glow 1.5s ease-in-out infinite' }}
        />
      </div>

      {/* Skeleton chart cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard fullWidth />

      {/* Loading message */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-sm sm:text-base text-muted-foreground animate-typewriter">
          {loadingMessages[messageIndex]}
        </p>
      </div>
    </div>
  )
}

function SkeletonCard({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <div 
      className={`
        glass-card rounded-xl p-4 sm:p-6
        ${fullWidth ? 'col-span-1 md:col-span-2' : ''}
      `}
    >
      {/* Title skeleton */}
      <div className="h-5 sm:h-6 w-32 sm:w-48 bg-secondary rounded animate-skeleton mb-2" />
      {/* Subtitle skeleton */}
      <div className="h-3 sm:h-4 w-48 sm:w-64 bg-secondary/50 rounded animate-skeleton mb-4 sm:mb-6" />
      {/* Chart skeleton */}
      <div className="h-40 sm:h-48 bg-secondary/30 rounded-lg animate-skeleton" />
    </div>
  )
}
