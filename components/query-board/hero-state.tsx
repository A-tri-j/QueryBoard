'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2, Plus } from 'lucide-react'
import { useQueryStore } from '@/lib/store'
import { QueryInput } from './query-input'


const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx']

function isSupportedFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
}

export function HeroState() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { setActiveSession } = useQueryStore()

  const uploadFile = async (file: File) => {
    if (!isSupportedFile(file)) {
      setUploadError('Please upload a .csv or .xlsx file.')
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
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      void uploadFile(selectedFile)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      void uploadFile(droppedFile)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance">
        Ask anything about your data
      </h1>
      <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-xl text-pretty">
        Type a plain English question. Get charts, data, and insights instantly.
      </p>
      <QueryInput variant="hero" />

      <div className="mt-6 w-full max-w-2xl px-2 sm:px-0">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={handleFileSelection}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={isUploading}
          className={`w-full rounded-3xl border border-dashed px-6 py-8 text-left transition-all ${
            isDragging
              ? 'border-primary bg-primary/10 shadow-[0_0_40px_rgba(99,102,241,0.15)]'
              : 'border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50'
          } ${isUploading ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                {isUploading ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/80">Upload Data</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Drop a CSV or XLSX file to start querying that dataset
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Supported formats: .csv and .xlsx. We&apos;ll create a temporary query session for the uploaded file.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center rounded-full border border-border bg-background/70 w-10 h-10 text-foreground shrink-0">
              {isUploading
                ? <Loader2 className="size-4 animate-spin" />
                : <Plus className="size-4" />}
            </span>
          </div>
        </button>

        {uploadError && (
          <p className="mt-3 text-sm text-destructive text-left">{uploadError}</p>
        )}
      </div>
    </div>
  )
}
