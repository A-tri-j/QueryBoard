'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CYCLING_WORDS = ['Your Data', 'Any Dataset', 'Your CSV', 'Your Numbers', 'Any Spreadsheet']

export function AnimatedHero() {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [visible, setVisible] = useState(false)
  const primaryBtnRef = useRef<HTMLDivElement>(null)
  const secondaryBtnRef = useRef<HTMLDivElement>(null)

  // Entrance visibility
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Typewriter effect
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(CYCLING_WORDS[wordIndex])
      return
    }

    const word = CYCLING_WORDS[wordIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80)
    } else if (!isDeleting && displayed.length === word.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2200)
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false)
      setWordIndex((i) => (i + 1) % CYCLING_WORDS.length)
    }
    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, wordIndex])

  // Magnetic button effect
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const setupMagnetic = (el: HTMLDivElement | null, strength: number) => {
      if (!el) return () => {}
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (e.clientX - cx) * strength
        const dy = (e.clientY - cy) * strength
        el.style.transform = `translate(${dx}px, ${dy}px)`
      }
      const onLeave = () => { el.style.transform = 'translate(0,0)' }
      el.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      return () => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      }
    }

    const cleanPrimary = setupMagnetic(primaryBtnRef.current, 0.4)
    const cleanSecondary = setupMagnetic(secondaryBtnRef.current, 0.3)
    return () => { cleanPrimary(); cleanSecondary() }
  }, [])

  return (
    <div className="max-w-3xl" style={{ fontFamily: "'Bricolage Grotesque', var(--font-heading), sans-serif" }}>
      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10
          px-4 py-1.5 text-xs uppercase tracking-[0.26em] text-primary"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Conversational analytics
      </div>

      {/* Headline */}
      <h1
        className="mt-6 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
        }}
      >
        <span className="text-foreground">Ask Anything About </span>
        <br />
        <span className="bg-gradient-to-r from-primary via-violet-400 to-cyan-300 bg-clip-text text-transparent">
          {displayed}
          <span
            className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 align-middle"
            style={{ animation: 'cursor-blink 1s step-end infinite' }}
          />
        </span>
      </h1>

      {/* Subheading */}
      <p
        className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
        style={{
          fontFamily: "'DM Sans', var(--font-sans), sans-serif",
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.22s, transform 0.7s ease 0.22s',
        }}
      >
        Upload any CSV or Excel file and get instant charts, insights, and analysis powered by AI.
        QueryBoard turns your spreadsheet into a demo-ready dashboard in minutes.
      </p>

      {/* CTAs */}
      <div
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.7s ease 0.34s, transform 0.7s ease 0.34s',
        }}
      >
        <div ref={primaryBtnRef}>
          <Button asChild size="lg" className="rounded-full px-7 glow-primary">
            <Link href="/login">
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div ref={secondaryBtnRef}>
          <Button asChild size="lg" variant="outline" className="rounded-full px-7">
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
