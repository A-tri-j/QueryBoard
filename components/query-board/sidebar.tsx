'use client'

import { useState, useEffect } from 'react'
import { useQueryStore, type QueryHistoryItem } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { UsageBanner } from '@/components/query-board/usage-banner'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  LogOut,
  Trash2,
  X
} from 'lucide-react'

const chartIcons = {
  bar: BarChart3,
  histogram: BarChart3,
  line: LineChart,
  pie: PieChart,
  scatter: ScatterChart
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const {
    queryHistory,
    selectHistoryItem,
    status,
    loadHistory,
    historyLoaded,
    deleteHistoryItem,
    sessionId,
    activeFileName,
    activeRowCount,
    activeColumnCount,
  } = useQueryStore()
  const { logout } = useAuth()
  const hasActiveSession = Boolean(sessionId)
  const datasetFileName = hasActiveSession ? activeFileName || 'Uploaded dataset' : 'customer_behaviour.xlsx'
  const datasetRowCount = hasActiveSession ? activeRowCount ?? 0 : 11791
  const datasetColumnCount = hasActiveSession ? activeColumnCount ?? 0 : 25
  const compactRowLabel = hasActiveSession
    ? (datasetRowCount?.toLocaleString() ?? '0')
    : '11.7K'

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!historyLoaded) {
      void loadHistory()
    }
  }, [historyLoaded, loadHistory])

  const groupedHistory = queryHistory.reduce((groups, item) => {
    const now = new Date()
    const itemDate = new Date(item.timestamp)
    const diffDays = Math.floor(
      (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const group = diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Yesterday'
      : 'Earlier'
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
    return groups
  }, {} as Record<string, typeof queryHistory>)

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside 
        className={`
          fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border
          flex flex-col transition-all duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-72 ${collapsed ? 'lg:w-16' : 'lg:w-72'}
        `}
      >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">QueryBoard</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-sidebar-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Desktop collapse toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1 hover:bg-sidebar-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dataset Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          {!collapsed && <span className="text-sm font-medium text-foreground">Dataset</span>}
        </div>
        {!collapsed && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono text-foreground text-xs truncate max-w-40 text-right">
                {datasetFileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rows</span>
              <span className="font-mono text-primary">{datasetRowCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Columns</span>
              <span className="font-mono text-primary">{datasetColumnCount.toLocaleString()}</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="text-center">
            <span className="font-mono text-xs text-primary">{compactRowLabel}</span>
          </div>
        )}
      </div>

      {/* Query History */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary" />
          {!collapsed && <span className="text-sm font-medium text-foreground">Recent Queries</span>}
        </div>
        
        {queryHistory.length === 0 ? (
          !collapsed && (
            <p className="text-sm text-muted-foreground italic">No queries yet</p>
          )
        ) : (
          <div className="space-y-2">
            {['Today', 'Yesterday', 'Earlier'].map((groupName) => {
              const items = groupedHistory[groupName]
              if (!items?.length) {
                return null
              }

              return (
                <div key={groupName}>
                  {!collapsed && (
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1 mt-3 first:mt-0">
                      {groupName}
                    </p>
                  )}
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <HistoryItem 
                        key={item.id ?? `${groupName}-${item.query}-${index}`}
                        item={item}
                        collapsed={collapsed}
                        onClick={() => status !== 'loading' && selectHistoryItem(item.query)}
                        onDelete={() => item.id ? void deleteHistoryItem(item.id) : undefined}
                        disabled={status === 'loading'}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <UsageBanner collapsed={collapsed} />
        <button
          type="button"
          onClick={() => {
            logout()
            window.location.assign('/login')
          }}
          className={`w-full rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground ${
            collapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'
          }`}
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </aside>
    </>
  )
}

function HistoryItem({ 
  item, 
  collapsed, 
  onClick, 
  onDelete,
  disabled,
  index 
}: { 
  item: QueryHistoryItem
  collapsed: boolean
  onClick: () => void
  onDelete: () => void
  disabled: boolean
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = chartIcons[item.chartType]
  
  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && item.id ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Delete history item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : null}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full text-left p-2 rounded-lg glass-card
          hover:border-primary/30 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          animate-slide-in-left
        `}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center gap-2 pr-8">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-sm text-foreground truncate">{item.query}</span>
          )}
        </div>
      </button>
    </div>
  )
}
