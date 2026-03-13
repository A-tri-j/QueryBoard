'use client'

import { AlertTriangle } from 'lucide-react'
import { useQueryStore } from '@/lib/store'

export function ErrorState() {
  const { errorMessage, clearDashboard } = useQueryStore()

  return (
    <div key={errorMessage} className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="glass-card rounded-xl p-6 sm:p-8 max-w-md w-full text-center animate-shake">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
        </div>

        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
          {"I couldn't answer that with the available data."}
        </h2>

        {errorMessage && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 font-mono bg-secondary/50 p-2 sm:p-3 rounded-lg break-words">
            {errorMessage}
          </p>
        )}

        <button
          onClick={clearDashboard}
          className="
            px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base
            bg-primary text-primary-foreground font-medium
            hover:bg-primary/90 transition-all glow-primary
          "
        >
          Try a different question
        </button>
      </div>
    </div>
  )
}
