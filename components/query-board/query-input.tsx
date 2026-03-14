'use client'

import { useState, useRef } from 'react'
import { useQueryStore } from '@/lib/store'
import { ArrowRight, FileSpreadsheet, X } from 'lucide-react'

interface QueryInputProps {
  variant?: 'hero' | 'bottom'
  onExampleClick?: (query: string) => void
}

const exampleQueries = [
  "Compare online vs store spending",
  "Average spend by city tier",
  "Highest tech savvy age group?"
]

export function QueryInput({ variant = 'hero', onExampleClick }: QueryInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { submitQuery, status, sessionId, activeFileName, clearActiveSession } = useQueryStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && status !== 'loading') {
      submitQuery(inputValue.trim(), sessionId)
      setInputValue('')
    }
  }

  const handleExampleClick = (query: string) => {
    setInputValue(query)
    inputRef.current?.focus()
    if (onExampleClick) {
      onExampleClick(query)
    }
  }

  const isHero = variant === 'hero'

  return (
    <div className={isHero ? 'w-full max-w-2xl mx-auto px-2 sm:px-0' : 'w-full'}>
      {sessionId && activeFileName && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <FileSpreadsheet className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Active Session</p>
              </div>
              <p className="truncate text-sm font-medium text-foreground">Querying: {activeFileName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearActiveSession}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
            aria-label="Clear active file"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div 
          className={`
            relative flex items-center gap-2
            bg-card/80 backdrop-blur-md
            border border-border rounded-2xl
            ${isHero ? 'p-2 pl-5 sm:p-2.5 sm:pl-6' : 'p-1.5 pl-4'}
            focus-within:border-primary/50
            focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_0_32px_rgba(99,102,241,0.12)]
            transition-all duration-300
            ambient-glow
          `}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your data..."
            disabled={status === 'loading'}
            className={`
              flex-1 bg-transparent text-foreground placeholder:text-muted-foreground
              focus:outline-none disabled:opacity-50 min-w-0
              ${isHero ? 'text-base sm:text-lg' : 'text-base'}
            `}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || status === 'loading'}
            className={`
              rounded-xl bg-gradient-to-br from-primary to-violet-600
              text-primary-foreground
              flex items-center justify-center shrink-0
              hover:from-primary/90 hover:to-violet-500
              hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200
              active:scale-95
              ${isHero ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-9 h-9'}
            `}
            aria-label="Submit query"
          >
            <ArrowRight className={isHero ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-5 h-5'} />
          </button>
        </div>
      </form>

      {/* Example queries - only in hero variant */}
      {isHero && (
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2">
          {exampleQueries.map((query) => (
            <button
              key={query}
              onClick={() => handleExampleClick(query)}
              disabled={status === 'loading'}
              className="
                px-4 py-2 rounded-full text-xs font-medium
                bg-secondary/40 border border-border
                text-muted-foreground hover:text-primary
                hover:border-primary/40
                hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]
                transition-all duration-200
                disabled:opacity-50
              "
              style={{ backgroundColor: undefined }}
            >
              {query}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
