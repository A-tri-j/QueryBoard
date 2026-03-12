'use client'

import { AlertTriangle } from 'lucide-react'
import { useQueryStore } from '@/lib/store'

export function ErrorState() {
  const { errorMessage, clearDashboard } = useQueryStore()

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div key={errorMessage} className="glass-card rounded-xl p-8 max-w-md text-center animate-shake">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {"I couldn't answer that with the available data."}
        </h2>
        
        {errorMessage && (
          <p className="text-sm text-muted-foreground mb-6 font-mono bg-secondary/50 p-3 rounded-lg">
            {errorMessage}
          </p>
        )}
        
        <button
          onClick={clearDashboard}
          className="
            px-6 py-3 rounded-full
            bg-primary text-primary-foreground font-medium
            hover:bg-primary/90 transition-all glow-cyan
          "
        >
          Try a different question
        </button>
      </div>
    </div>
  )
}
