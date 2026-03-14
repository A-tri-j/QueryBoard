'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useQueryStore } from '@/lib/store'
import { Sidebar } from '@/components/query-board/sidebar'
import { HeroState } from '@/components/query-board/hero-state'
import { LoadingState } from '@/components/query-board/loading-state'
import { DashboardView } from '@/components/query-board/dashboard-view'
import { ErrorState } from '@/components/query-board/error-state'
import { MobileHeader } from '@/components/query-board/mobile-header'

export default function QueryBoardPage() {
  const router = useRouter()
  const { state } = useAuth()
  const { status } = useQueryStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      router.replace('/landing')
    }
  }, [router, state.isAuthenticated, state.isLoading])

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background bg-grid-texture">
      {/* Mobile Header - only visible on small screens */}
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar - hidden on mobile, shown via overlay when open */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area - no left margin on mobile */}
      <main className="lg:ml-72 min-h-screen flex flex-col pt-14 lg:pt-0">
        {status === 'idle' && <HeroState />}
        {status === 'loading' && <LoadingState />}
        {status === 'success' && <DashboardView />}
        {status === 'error' && <ErrorState />}
      </main>
    </div>
  )
}
