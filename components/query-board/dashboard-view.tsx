'use client'

import { useQueryStore } from '@/lib/store'
import { ChartCard } from './chart-card'
import { QueryInput } from './query-input'
import { Quote } from 'lucide-react'

export function DashboardView() {
  const { dashboardData, lastQuery } = useQueryStore()

  if (!dashboardData) return null

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Summary Card */}
      <div className="glass-card rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 animate-fade-up">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0 mt-0.5 sm:mt-1" />
          <p className="text-base sm:text-lg text-foreground font-medium">{lastQuery}</p>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3 sm:mb-4">
          {dashboardData.summary}
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="font-mono">
            {dashboardData.timestamp.toLocaleTimeString()}
          </span>
          <span className="text-primary font-mono">
            {dashboardData.rows_analyzed.toLocaleString()} rows analyzed
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
