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

// Mock data for demo
const mockResponses: Record<string, DashboardData> = {
  default: {
    charts: [
      {
        type: 'bar',
        title: 'Online vs Store Spending by City Tier',
        x: 'city_tier',
        y: 'spending',
        data: [
          { city_tier: 'Tier 1', online_spend: 4250, store_spend: 3180 },
          { city_tier: 'Tier 2', online_spend: 3420, store_spend: 2890 },
          { city_tier: 'Tier 3', online_spend: 2180, store_spend: 3540 },
        ],
        reason: 'Bar chart selected to compare two metrics across categorical city tiers'
      },
      {
        type: 'pie',
        title: 'Shopping Preference Distribution',
        x: 'preference',
        y: 'count',
        data: [
          { name: 'Online Only', value: 3245, fill: '#00d4ff' },
          { name: 'Store Only', value: 2890, fill: '#0ea5e9' },
          { name: 'Both', value: 4156, fill: '#06b6d4' },
          { name: 'No Preference', value: 1500, fill: '#22d3ee' },
        ],
        reason: 'Pie chart chosen to show proportional distribution of shopping preferences'
      },
      {
        type: 'scatter',
        title: 'Tech Savvy Score vs Online Spending',
        x: 'tech_savvy_score',
        y: 'avg_online_spend',
        data: [
          { tech_savvy_score: 2, avg_online_spend: 1200 },
          { tech_savvy_score: 3, avg_online_spend: 1850 },
          { tech_savvy_score: 4, avg_online_spend: 2400 },
          { tech_savvy_score: 5, avg_online_spend: 2900 },
          { tech_savvy_score: 6, avg_online_spend: 3200 },
          { tech_savvy_score: 7, avg_online_spend: 3800 },
          { tech_savvy_score: 8, avg_online_spend: 4200 },
          { tech_savvy_score: 9, avg_online_spend: 4850 },
        ],
        reason: 'Scatter plot used to visualize correlation between tech savvy score and spending'
      },
      {
        type: 'line',
        title: 'Average Spending Trend by Age Group',
        x: 'age_group',
        y: 'spending',
        data: [
          { age_group: '18-24', avg_spend: 1850 },
          { age_group: '25-34', avg_spend: 3200 },
          { age_group: '35-44', avg_spend: 4100 },
          { age_group: '45-54', avg_spend: 3800 },
          { age_group: '55-64', avg_spend: 2900 },
          { age_group: '65+', avg_spend: 2100 },
        ],
        reason: 'Line chart chosen to show spending progression across sequential age groups'
      }
    ],
    summary: 'Analysis reveals that Tier 1 cities show significantly higher online spending ($4,250 avg) compared to store purchases ($3,180 avg), while Tier 3 cities demonstrate the opposite pattern with stronger in-store preference. The majority of customers (35.2%) prefer a hybrid shopping approach. A strong positive correlation exists between tech savvy scores and online spending, with customers scoring 8+ spending 3.5x more online than those scoring below 4. The 35-44 age demographic represents the highest overall spending power.',
    rows_analyzed: 11791,
    timestamp: new Date()
  },
  gender: {
    charts: [
      {
        type: 'bar',
        title: 'Gender Distribution by Shopping Preference',
        x: 'shopping_preference',
        y: 'count',
        data: [
          { shopping_preference: 'Online Only', male: 1820, female: 1425 },
          { shopping_preference: 'Store Only', male: 1190, female: 1700 },
          { shopping_preference: 'Both', male: 2100, female: 2056 },
          { shopping_preference: 'No Preference', male: 750, female: 750 },
        ],
        reason: 'Grouped bar chart to compare gender distribution across shopping preference categories'
      },
      {
        type: 'pie',
        title: 'Overall Gender Distribution',
        x: 'gender',
        y: 'count',
        data: [
          { name: 'Male', value: 5860, fill: '#00d4ff' },
          { name: 'Female', value: 5931, fill: '#06b6d4' },
        ],
        reason: 'Pie chart to show overall gender split in the dataset'
      }
    ],
    summary: 'The dataset shows a nearly equal gender distribution (49.7% male, 50.3% female). However, shopping preferences differ significantly by gender: males show a 28% higher preference for online-only shopping, while females demonstrate a 43% higher preference for in-store shopping. The "Both" category shows near-equal representation across genders, suggesting hybrid shoppers are evenly distributed.',
    rows_analyzed: 11791,
    timestamp: new Date()
  },
  techsavvy: {
    charts: [
      {
        type: 'bar',
        title: 'Tech Savvy Score by Age Group',
        x: 'age_group',
        y: 'tech_savvy_score',
        data: [
          { age_group: '18-24', avg_score: 8.2 },
          { age_group: '25-34', avg_score: 7.8 },
          { age_group: '35-44', avg_score: 6.5 },
          { age_group: '45-54', avg_score: 5.2 },
          { age_group: '55-64', avg_score: 4.1 },
          { age_group: '65+', avg_score: 3.2 },
        ],
        reason: 'Bar chart to show average tech savvy score distribution across age groups'
      },
      {
        type: 'line',
        title: 'Tech Savvy Score Correlation with Online Spending',
        x: 'tech_savvy_score',
        y: 'avg_online_spend',
        data: [
          { tech_savvy_score: 1, avg_online_spend: 850 },
          { tech_savvy_score: 2, avg_online_spend: 1100 },
          { tech_savvy_score: 3, avg_online_spend: 1450 },
          { tech_savvy_score: 4, avg_online_spend: 1950 },
          { tech_savvy_score: 5, avg_online_spend: 2400 },
          { tech_savvy_score: 6, avg_online_spend: 2950 },
          { tech_savvy_score: 7, avg_online_spend: 3500 },
          { tech_savvy_score: 8, avg_online_spend: 4100 },
          { tech_savvy_score: 9, avg_online_spend: 4650 },
          { tech_savvy_score: 10, avg_online_spend: 5200 },
        ],
        reason: 'Line chart to visualize the strong positive correlation between tech savvy score and online spending'
      }
    ],
    summary: 'The 18-24 age group demonstrates the highest average tech savvy score (8.2/10), with scores declining progressively with age to 3.2/10 for those 65+. This correlates directly with online spending behavior: each point increase in tech savvy score corresponds to approximately $450 more in annual online spending. The highest tech-savvy customers (score 10) spend 6x more online than the lowest-scoring group.',
    rows_analyzed: 11791,
    timestamp: new Date()
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
    set({ status: 'loading', errorMessage: null, lastQuery: query })
    
    // ─── MOCK: Replace this entire block with real API call when backend is ready ───
    // POST http://localhost:8000/api/query  { body: JSON.stringify({ query }) }
    // Expected response shape matches DashboardData interface above
    // ────────────────────────────────────────────────────────────────────────────────
    
    // Simulate API call with 2 second delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check for error simulation - demonstrates hallucination handling
    if (query.toLowerCase().includes('revenue') || query.toLowerCase().includes('profit')) {
      set({ 
        status: 'error', 
        errorMessage: "Column 'revenue' does not exist. Available numeric columns: avg_online_spend, avg_store_spend, monthly_online_orders, monthly_store_visits, tech_savvy_score, impulse_buying_score, brand_loyalty_score" 
      })
      return
    }
    
    // Select appropriate mock response
    let response = mockResponses.default
    if (query.toLowerCase().includes('gender')) {
      response = mockResponses.gender
    } else if (query.toLowerCase().includes('tech savvy') || query.toLowerCase().includes('age group')) {
      response = mockResponses.techsavvy
    }
    
    const dashboardData = { ...response, timestamp: new Date() }
    const primaryChartType = dashboardData.charts[0]?.type || 'bar'
    
    // Update history (keep last 5)
    const newHistoryItem: QueryHistoryItem = {
      query,
      chartType: primaryChartType,
      timestamp: new Date()
    }
    
    const currentHistory = get().queryHistory
    const updatedHistory = [newHistoryItem, ...currentHistory.filter(h => h.query !== query)].slice(0, 5)
    
    set({ 
      status: 'success', 
      dashboardData,
      queryHistory: updatedHistory,
      query: ''
    })
  },
  
  clearDashboard: () => set({ 
    status: 'idle', 
    dashboardData: null, 
    errorMessage: null 
  }),
  
  selectHistoryItem: (query) => {
    get().submitQuery(query)
  }
}))
