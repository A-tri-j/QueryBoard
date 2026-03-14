'use client'

import { useRef, useState } from 'react'
import { Upload, Quote } from 'lucide-react'
import { useQueryStore } from '@/lib/store'
import { ChartCard } from './chart-card'
import { QueryInput } from './query-input'


const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx']

function isSupportedFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
}

export function DashboardView() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { dashboardData, lastQuery, sessionId, activeFileName, setActiveSession } = useQueryStore()

  if (!dashboardData) return null

  const hasActiveSession = Boolean(sessionId && activeFileName)

  const uploadFile = async (file: File) => {
    if (!isSupportedFile(file)) {
      setUploadError('Please upload a .csv or .xlsx file.')
      return
    }

    const MAX_FILE_SIZE = 4.5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). ` +
        `Maximum size is 4.5MB.`
      )
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { session_id?: string; row_count?: number; columns?: string[]; detail?: string }
        | null

      if (!response.ok || !payload?.session_id) {
        const detail =
          payload && typeof payload.detail === 'string'
            ? payload.detail
            : 'The file could not be uploaded.'
        throw new Error(detail)
      }

      setActiveSession(
        payload.session_id,
        file.name,
        payload.row_count ?? 0,
        payload.columns?.length ?? 0,
      )
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The file could not be uploaded.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      void uploadFile(selectedFile)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Summary Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 mb-5 sm:mb-6 animate-fade-up border-l-2 border-l-primary/50 relative overflow-hidden">
        {/* Faint radial glow */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-primary/8 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0 mt-0.5 sm:mt-1" />
          <p className="text-base sm:text-lg text-foreground font-medium leading-relaxed"
             style={{ fontFamily: 'var(--font-heading)' }}>
            {lastQuery}
          </p>
        </div>
        <p className="relative text-sm sm:text-base text-muted-foreground leading-relaxed mb-3 sm:mb-4">
          {dashboardData.summary}
        </p>
        <div className="relative flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="font-mono text-xs bg-secondary/60 px-2.5 py-1 rounded-full border border-border/50">
            {dashboardData.timestamp.toLocaleTimeString()}
          </span>
          <span className="font-mono text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full border border-primary/15">
            {dashboardData.rows_analyzed.toLocaleString()} rows
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
        {!hasActiveSession && (
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelection}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Uploading...' : 'Upload dataset'}</span>
            </button>
            {uploadError && (
              <p className="mt-2 text-sm text-destructive">{uploadError}</p>
            )}
          </div>
        )}

        <QueryInput variant="bottom" />
      </div>
    </div>
  )
}
