'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryStore } from '@/lib/store'
import { ArrowRight } from 'lucide-react'

interface QueryInputProps {
  variant?: 'hero' | 'bottom'
  onExampleClick?: (query: string) => void
}

const exampleQueries = [
  "Compare online vs store spending by city tier",
  "Show gender distribution across shopping preferences",
  "Which age group has the highest tech savvy score?"
]

export function QueryInput({ variant = 'hero', onExampleClick }: QueryInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { submitQuery, status } = useQueryStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && status !== 'loading') {
      submitQuery(inputValue.trim())
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

  const focusInput = () => {
    inputRef.current?.focus()
  }

  // Expose focus method for error state retry
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { focusQueryInput?: () => void }).focusQueryInput = focusInput
    }
  }, [])

  const isHero = variant === 'hero'

  return (
    <div className={isHero ? 'w-full max-w-2xl mx-auto' : 'w-full'}>
      <form onSubmit={handleSubmit}>
        <div 
          className={`
            relative flex items-center gap-2
            bg-secondary/50 border border-border rounded-full
            ${isHero ? 'p-2 pl-6' : 'p-1.5 pl-4'}
            focus-within:border-primary/50 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.15)]
            transition-all
          `}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            disabled={status === 'loading'}
            className={`
              flex-1 bg-transparent text-foreground placeholder:text-muted-foreground
              focus:outline-none disabled:opacity-50
              ${isHero ? 'text-lg' : 'text-base'}
            `}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || status === 'loading'}
            className={`
              rounded-full bg-primary text-primary-foreground
              flex items-center justify-center
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all glow-cyan
              ${isHero ? 'w-12 h-12' : 'w-10 h-10'}
            `}
            aria-label="Submit query"
          >
            <ArrowRight className={isHero ? 'w-6 h-6' : 'w-5 h-5'} />
          </button>
        </div>
      </form>

      {/* Example queries - only in hero variant */}
      {isHero && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {exampleQueries.map((query) => (
            <button
              key={query}
              onClick={() => handleExampleClick(query)}
              disabled={status === 'loading'}
              className="
                px-4 py-2 rounded-full text-sm
                bg-secondary/50 border border-border
                text-muted-foreground hover:text-foreground
                hover:border-primary/30 hover:bg-secondary
                transition-all disabled:opacity-50
              "
            >
              {query}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
