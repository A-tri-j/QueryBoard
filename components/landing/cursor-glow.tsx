'use client'

import { useEffect, useRef, useState } from 'react'

export function CursorGlow() {
  const [isTouch, setIsTouch] = useState(false)
  const orbRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const orb = useRef({ x: -100, y: -100 })

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouch(true)
      return
    }

    // Skip if prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Hide default cursor on the landing page
    document.documentElement.style.cursor = 'none'

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`
      }
    }

    const onEnterInteractive = () => {
      orbRef.current?.classList.add('cursor-hover')
    }
    const onLeaveInteractive = () => {
      orbRef.current?.classList.remove('cursor-hover')
    }

    // Spring animation loop for the orb
    let raf: number
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      orb.current.x = lerp(orb.current.x, pos.current.x, 0.1)
      orb.current.y = lerp(orb.current.y, pos.current.y, 0.1)
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${orb.current.x - 24}px, ${orb.current.y - 24}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const interactives = document.querySelectorAll('a, button, [role="button"]')
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onEnterInteractive)
      el.addEventListener('mouseleave', onLeaveInteractive)
    })

    document.addEventListener('mousemove', onMove)

    return () => {
      document.documentElement.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', onEnterInteractive)
        el.removeEventListener('mouseleave', onLeaveInteractive)
      })
    }
  }, [])

  if (isTouch) return null

  return (
    <>
      <div
        ref={orbRef}
        className="cursor-orb pointer-events-none fixed left-0 top-0 z-[9999] h-12 w-12 rounded-full
          transition-[width,height,opacity] duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(129,140,248,0.35) 0%, rgba(129,140,248,0.08) 60%, transparent 80%)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-primary"
        style={{ boxShadow: '0 0 6px rgba(129,140,248,0.8)' }}
      />

      <style>{`
        .cursor-orb.cursor-hover {
          width: 64px !important;
          height: 64px !important;
          background: radial-gradient(circle, rgba(129,140,248,0.5) 0%, rgba(167,139,250,0.15) 60%, transparent 80%) !important;
        }
      `}</style>
    </>
  )
}