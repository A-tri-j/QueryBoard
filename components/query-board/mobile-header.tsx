'use client'

import { Menu, BarChart3 } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>
      
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">QueryBoard</span>
      </div>
      
      <ThemeToggle />
    </header>
  )
}
