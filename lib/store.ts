import { create } from 'zustand'

export interface ChartData {
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'histogram'
  title: string
  x: string
  y: string
  data: Record<string, string | number>[]
  reason: string
}

export interface DashboardData {
  charts: ChartData[]
  summary: string
  rows_analyzed: number
  timestamp: Date
}

export interface QueryHistoryItem {
  id?: string
  query: string
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'histogram'
  timestamp: Date
  charts?: ChartData[]
  summary?: string
  rows_analyzed?: number
}

interface QueryApiResponse {
  charts: ChartData[]
  summary: string
  rows_analyzed: number
}

interface QueryStore {
  query: string
  sessionId: string | null
  activeFileName: string | null
  activeRowCount: number | null
  activeColumnCount: number | null
  status: 'idle' | 'loading' | 'success' | 'error'
  dashboardData: DashboardData | null
  queryHistory: QueryHistoryItem[]
  historyLoaded: boolean
  errorMessage: string | null
  lastQuery: string
  setQuery: (query: string) => void
  setActiveSession: (
    sessionId: string,
    fileName: string,
    rowCount: number,
    columnCount: number,
  ) => void
  clearActiveSession: () => void
  submitQuery: (query: string, sessionId?: string | null) => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
  clearDashboard: () => void
  selectHistoryItem: (query: string) => void
}

const QUERY_API_PATH = '/api/query'

function formatErrorMessage(detail: unknown): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
          return item.msg
        }

        return null
      })
      .filter((value): value is string => Boolean(value))

    if (messages.length > 0) {
      return messages.join(', ')
    }
  }

  if (detail && typeof detail === 'object') {
    if ('detail' in detail) {
      return formatErrorMessage(detail.detail)
    }

    if ('message' in detail && typeof detail.message === 'string') {
      return detail.message
    }
  }

  return 'The query request failed.'
}

function parseQueryResponse(payload: unknown): QueryApiResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backend returned an invalid response.')
  }

  const data = payload as Partial<QueryApiResponse>

  if (!Array.isArray(data.charts) || typeof data.summary !== 'string' || typeof data.rows_analyzed !== 'number') {
    throw new Error('Backend returned an incomplete response.')
  }

  return {
    charts: data.charts,
    summary: data.summary,
    rows_analyzed: data.rows_analyzed,
  }
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  query: '',
  sessionId: null,
  activeFileName: null,
  activeRowCount: null,
  activeColumnCount: null,
  status: 'idle',
  dashboardData: null,
  queryHistory: [],
  historyLoaded: false,
  errorMessage: null,
  lastQuery: '',

  setQuery: (query) => set({ query }),

  setActiveSession: (sessionId, fileName, rowCount, columnCount) => {
    set({
      sessionId,
      activeFileName: fileName,
      activeRowCount: rowCount,
      activeColumnCount: columnCount,
      status: 'idle',
      dashboardData: null,
      errorMessage: null,
      lastQuery: '',
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('qb-usage-refresh'))
    }
  },

  clearActiveSession: () =>
    set({
      sessionId: null,
      activeFileName: null,
      activeRowCount: null,
      activeColumnCount: null,
      status: 'idle',
      dashboardData: null,
    }),

  submitQuery: async (query, sessionIdOverride) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      return
    }

    const activeSessionId = sessionIdOverride ?? get().sessionId

    set({ status: 'loading', errorMessage: null, lastQuery: normalizedQuery })

    try {
      const response = await fetch(QUERY_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: normalizedQuery,
          session_id: activeSessionId,
        }),
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 429 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('qb-usage-refresh'))
        }
        throw new Error(formatErrorMessage(payload))
      }

      const apiData = parseQueryResponse(payload)
      const dashboardData: DashboardData = {
        ...apiData,
        timestamp: new Date(),
      }

      const primaryChartType = dashboardData.charts[0]?.type || 'bar'
      const newHistoryItem: QueryHistoryItem = {
        query: normalizedQuery,
        chartType: primaryChartType,
        timestamp: new Date(),
        charts: dashboardData.charts,
        summary: dashboardData.summary,
        rows_analyzed: dashboardData.rows_analyzed,
      }

      const currentHistory = get().queryHistory
      const updatedHistory = [newHistoryItem, ...currentHistory.filter((item) => item.query !== normalizedQuery)].slice(0, 50)

      set({
        status: 'success',
        dashboardData,
        queryHistory: updatedHistory,
        errorMessage: null,
        query: '',
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qb-usage-refresh'))
      }
      void get().loadHistory()
    } catch (error) {
      set({
        status: 'error',
        dashboardData: null,
        errorMessage: error instanceof Error ? error.message : 'Unable to reach the backend service.',
      })
    }
  },

  clearDashboard: () => set({
    status: 'idle',
    dashboardData: null,
    errorMessage: null,
  }),

  loadHistory: async () => {
    try {
      const response = await fetch('/api/history')
      const data = await response.json()
      if (!data.items) return

      const items: QueryHistoryItem[] = data.items.map((item: {
        id: string
        query: string
        primary_chart_type: 'bar' | 'line' | 'scatter' | 'pie' | 'histogram'
        created_at: string
        charts: ChartData[]
        summary: string
        rows_analyzed: number
      }) => ({
        id: item.id,
        query: item.query,
        chartType: item.primary_chart_type,
        timestamp: new Date(item.created_at),
        charts: item.charts,
        summary: item.summary,
        rows_analyzed: item.rows_analyzed,
      }))

      set({ queryHistory: items, historyLoaded: true })
    } catch {
      // silently fail — history is non-critical
    }
  },

  deleteHistoryItem: async (id) => {
    const existingItems = get().queryHistory
    const itemToRestore = existingItems.find((item) => item.id === id)

    set({
      queryHistory: existingItems.filter((item) => item.id !== id),
    })

    try {
      const response = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!response.ok && itemToRestore) {
        set((state) => ({
          queryHistory: [itemToRestore, ...state.queryHistory.filter((item) => item.id !== id)],
        }))
      }
    } catch {
      if (itemToRestore) {
        set((state) => ({
          queryHistory: [itemToRestore, ...state.queryHistory.filter((item) => item.id !== id)],
        }))
      }
    }
  },

  selectHistoryItem: (query) => {
    const item = get().queryHistory.find((historyItem) => historyItem.query === query)
    if (item?.charts && item.charts.length > 0) {
      set({
        status: 'success',
        lastQuery: item.query,
        dashboardData: {
          charts: item.charts,
          summary: item.summary ?? '',
          rows_analyzed: item.rows_analyzed ?? 0,
          timestamp: item.timestamp,
        },
        errorMessage: null,
      })
    } else {
      void get().submitQuery(query, get().sessionId)
    }
  },
}))
