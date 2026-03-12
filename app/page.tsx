'use client'

import { useQueryStore } from '@/lib/store'
import { Sidebar } from '@/components/query-board/sidebar'
import { HeroState } from '@/components/query-board/hero-state'
import { LoadingState } from '@/components/query-board/loading-state'
import { DashboardView } from '@/components/query-board/dashboard-view'
import { ErrorState } from '@/components/query-board/error-state'

export default function QueryBoardPage() {
  const { status } = useQueryStore()

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
