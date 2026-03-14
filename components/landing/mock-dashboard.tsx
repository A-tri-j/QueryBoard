'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, LineChart } from 'lucide-react'

const BAR_HEIGHTS = [64, 92, 78, 104]
const BAR_LABELS = ['T1', 'T2', 'T3', 'T4']
const QUERY_TEXT = 'Compare online vs store spending across age groups'

export function MockDashboard() {
  const [barsVisible, setBarsVisible] = useState(false)
  const [typedQuery, setTypedQuery] = useState('')
  const [isInView, setIsInView] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true) },
      { threshold: 0.3 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView) return
    const t = setTimeout(() => setBarsVisible(true), 400)
    return () => clearTimeout(t)
  }, [isInView])

  useEffect(() => {
    if (!isInView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedQuery(QUERY_TEXT)
      return
    }
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedQuery(QUERY_TEXT.slice(0, i))
      if (i >= QUERY_TEXT.length) clearInterval(interval)
    }, 38)
    return () => clearInterval(interval)
  }, [isInView])

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute -left-6 top-12 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl" />

      <div
        className="glass-card relative overflow-hidden rounded-[2rem] border border-primary/15 p-5
          shadow-[0_20px_100px_rgba(0,0,0,0.4)] scanlines"
        style={{ transform: 'perspective(1200px) rotateY(-3deg) rotateX(2deg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Mock Dashboard Preview
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}>
              Retail Spending Overview
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <span className="relative flex h-2 w-2" style={{ display: 'inline-block' }}>
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
                style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live preview
          </div>
        </div>

        {/* Typing query box */}
        <div className="mt-5 rounded-3xl border border-border/70 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Question</p>
          <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3
            text-sm text-foreground min-h-[44px] font-mono">
            {typedQuery}
            {typedQuery.length < QUERY_TEXT.length && (
              <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle"
                style={{ animation: 'cursor-blink 0.8s step-end infinite' }} />
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          {/* Bar chart */}
          <div className="flex flex-col rounded-3xl border border-border/70 bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Avg Spend by Tier</p>
            </div>
            <div className="mt-4 flex flex-1 items-end gap-3 min-h-[11rem]">
              {BAR_HEIGHTS.map((height, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-primary via-primary/80 to-cyan-300/80"
                    style={{
                      height: barsVisible ? `${height}px` : '0px',
                      transition: `height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 100}ms`,
                    }}
                  />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {BAR_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-medium text-foreground">Trend Snapshot</p>
              </div>
              <div className="mt-5 flex h-20 items-end gap-2">
                {[20, 38, 30, 48, 42, 60, 55].map((point, i) => (
                  <div key={i} className="flex flex-1 items-end">
                    <div
                      className="h-2 w-full rounded-full bg-gradient-to-r from-cyan-300 to-primary"
                      style={{
                        transform: `translateY(${56 - point}px)`,
                        opacity: barsVisible ? 1 : 0,
                        transition: `opacity 0.5s ease ${300 + i * 60}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-3xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI summary</p>
              <p className="mt-3 text-sm leading-7 text-foreground"
                style={{ fontFamily: "'DM Sans', var(--font-sans), sans-serif" }}>
                Tier 1 cities show the highest average online spend. QueryBoard turns that into
                charts and grounded narrative instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
