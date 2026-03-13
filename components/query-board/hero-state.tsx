'use client'

import { QueryInput } from './query-input'

export function HeroState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance">
        Ask anything about your data
      </h1>
      <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-xl text-pretty">
        Type a plain English question. Get charts, data, and insights instantly.
      </p>
      <QueryInput variant="hero" />
    </div>
  )
}
