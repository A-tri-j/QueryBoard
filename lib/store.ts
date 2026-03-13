import { create } from 'zustand'

export interface ChartData {
  type: 'bar' | 'line' | 'scatter' | 'pie'
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
  query: string
  chartType: 'bar' | 'line' | 'scatter' | 'pie'
  timestamp: Date
}

interface QueryApiResponse {
  charts: ChartData[]
  summary: string
  rows_analyzed: number
}

interface QueryStore {
  query: string
  status: 'idle' | 'loading' | 'success' | 'error'
  dashboardData: DashboardData | null
  queryHistory: QueryHistoryItem[]
  errorMessage: string | null
  lastQuery: string
  setQuery: (query: string) => void
  submitQuery: (query: string) => Promise<void>
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
  status: 'idle',
  dashboardData: null,
  queryHistory: [],
  errorMessage: null,
  lastQuery: '',

  setQuery: (query) => set({ query }),

  submitQuery: async (query) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      return
    }

    set({ status: 'loading', errorMessage: null, lastQuery: normalizedQuery })

    try {
      const response = await fetch(QUERY_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: normalizedQuery }),
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
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
      }

      const currentHistory = get().queryHistory
      const updatedHistory = [newHistoryItem, ...currentHistory.filter((item) => item.query !== normalizedQuery)].slice(0, 5)

      set({
        status: 'success',
        dashboardData,
        queryHistory: updatedHistory,
        errorMessage: null,
        query: '',
      })
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

  selectHistoryItem: (query) => {
    void get().submitQuery(query)
  },
}))
