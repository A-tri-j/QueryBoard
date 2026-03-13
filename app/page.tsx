'use client'

import { useAuth } from '@/hooks/useAuth'
import { useQueryStore } from '@/lib/store'
import { Sidebar } from '@/components/query-board/sidebar'
import { HeroState } from '@/components/query-board/hero-state'
import { LoadingState } from '@/components/query-board/loading-state'
import { DashboardView } from '@/components/query-board/dashboard-view'
import { ErrorState } from '@/components/query-board/error-state'

export default function QueryBoardPage() {
  const { state } = useAuth()
  const { status } = useQueryStore()

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!state.isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background bg-grid-texture">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="ml-72 min-h-screen flex flex-col">
        {status === 'idle' && <HeroState />}
        {status === 'loading' && <LoadingState />}
        {status === 'success' && <DashboardView />}
        {status === 'error' && <ErrorState />}
      </main>
    </div>
  )
}
