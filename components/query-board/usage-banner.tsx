'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Crown, Sparkles } from 'lucide-react'
import { TIERS, type TierKey, isLimitReached } from '@/lib/usage'

interface UsageResponse {
  tier?: string
  queries_used?: number
  uploads_used?: number
  tokens_used?: number
  reset_at?: string
}

function normalizeTier(tier: string | undefined): TierKey {
  if (tier === 'pro' || tier === 'ultra') {
    return tier
  }
  return 'free'
}

function getTierStyles(tier: TierKey) {
  if (tier === 'pro') {
    return {
      badge: 'border-primary/40 bg-primary/15 text-primary',
      icon: Crown,
    }
  }

  if (tier === 'ultra') {
    return {
      badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
      icon: Sparkles,
    }
  }

  return {
    badge: 'border-border bg-secondary/50 text-muted-foreground',
    icon: Crown,
  }
}

function usagePercent(used: number, limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return 0
  }
  return Math.min(100, Math.round((used / limit) * 100))
}

function formatLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 'Unlimited'
  }
  return limit.toLocaleString()
}

export function UsageBanner({ collapsed = false }: { collapsed?: boolean }) {
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/usage', { cache: 'no-store' })
      const data = (await response.json().catch(() => null)) as UsageResponse | null
      if (data) {
        setUsage(data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsage()

    const handleRefresh = () => {
      void loadUsage()
    }

    const intervalId = window.setInterval(() => {
      void loadUsage()
    }, 30000)

    window.addEventListener('focus', handleRefresh)
    window.addEventListener('qb-usage-refresh', handleRefresh as EventListener)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('qb-usage-refresh', handleRefresh as EventListener)
    }
  }, [])

  const tier = normalizeTier(usage?.tier)
  const tierConfig = TIERS[tier]
  const tierStyles = getTierStyles(tier)
  const TierIcon = tierStyles.icon
  const queriesUsed = usage?.queries_used ?? 0
  const uploadsUsed = usage?.uploads_used ?? 0

  const usageRows = useMemo(() => ([
    {
      key: 'queries' as const,
      label: 'Queries',
      used: queriesUsed,
      limit: tierConfig.queries,
    },
    {
      key: 'uploads' as const,
      label: 'Uploads',
      used: uploadsUsed,
      limit: tierConfig.uploads,
    },
  ]), [queriesUsed, uploadsUsed, tierConfig.queries, tierConfig.uploads])

  if (collapsed) {
    return (
      <div className="mb-3 flex justify-center">
        <div className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tierStyles.badge}`}>
          {tierConfig.label[0]}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-sidebar-border bg-secondary/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">Plan</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tierStyles.badge}`}>
              <TierIcon className="h-3.5 w-3.5" />
              {tierConfig.label}
            </span>
            {isLoading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
          </div>
        </div>
        {tier === 'free' ? (
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Upgrade
          </Link>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {usageRows.map((item) => {
          const reached = isLimitReached(tier, item.used, item.key)
          const limit = item.limit
          const percent = usagePercent(item.used, Number(limit))
          const warning = Number.isFinite(limit) && percent >= 80 && !reached

          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={reached ? 'text-destructive' : 'text-foreground'}>
                  {item.used.toLocaleString()} / {formatLimit(Number(limit))}
                </span>
              </div>
              {Number.isFinite(limit) ? (
                <div className="h-2 rounded-full bg-sidebar-border/60">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      reached
                        ? 'bg-destructive'
                        : warning
                          ? 'bg-amber-400'
                          : tier === 'ultra'
                            ? 'bg-amber-300'
                            : tier === 'pro'
                              ? 'bg-primary'
                              : 'bg-muted-foreground'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              ) : (
                <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                  Unlimited
                </div>
              )}
              {reached ? (
                <p className="mt-1 text-xs text-destructive">Limit reached</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
