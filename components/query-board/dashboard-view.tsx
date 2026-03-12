'use client'

import { useQueryStore } from '@/lib/store'
import { ChartCard } from './chart-card'
import { QueryInput } from './query-input'
import { Quote } from 'lucide-react'

export function DashboardView() {
  const { dashboardData, queryHistory } = useQueryStore()

  if (!dashboardData) return null

  const currentQuery = queryHistory[0]?.query || ''

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      {/* Summary Card */}
      <div className="glass-card rounded-xl p-6 mb-6 animate-fade-up">
        <div className="flex items-start gap-3 mb-4">
          <Quote className="w-6 h-6 text-primary shrink-0 mt-1" />
          <p className="text-lg text-foreground font-medium">{currentQuery}</p>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {dashboardData.summary}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-mono">
            {dashboardData.timestamp.toLocaleTimeString()}
          </span>
          <span className="text-primary font-mono">
            {dashboardData.rows_analyzed.toLocaleString()} rows analyzed
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {dashboardData.charts.map((chart, index) => (
          <ChartCard 
            key={`${chart.title}-${index}`} 
            chart={chart} 
            index={index}
            fullWidth={index === dashboardData.charts.length - 1 && dashboardData.charts.length % 2 === 1}
          />
        ))}
      </div>

      {/* Bottom Query Input */}
      <div className="mt-auto pt-4 border-t border-border">
        <QueryInput variant="bottom" />
      </div>
    </div>
  )
}
