'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { TIERS, type TierKey } from '@/lib/usage'

export const dynamic = 'force-dynamic'

interface UsageResponse {
  tier?: string
}

function normalizeTier(tier: string | undefined): TierKey {
  if (tier === 'pro' || tier === 'ultra') {
    return tier
  }
  return 'free'
}

function featureLines(tier: TierKey) {
  const config = TIERS[tier]
  return [
    `${Number.isFinite(config.queries) ? config.queries.toLocaleString() : 'Unlimited'} queries per day`,
    `${Number.isFinite(config.uploads) ? config.uploads.toLocaleString() : 'Unlimited'} dataset uploads per day`,
    `${Number.isFinite(config.tokens) ? config.tokens.toLocaleString() : 'Unlimited'} LLM tokens per day`,
  ]
}

export default function PricingPage() {
  const [activeTier, setActiveTier] = useState<TierKey>('free')

  useEffect(() => {
    let cancelled = false

    const loadUsage = async () => {
      try {
        const response = await fetch('/api/usage', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as UsageResponse | null
        if (!cancelled) {
          setActiveTier(normalizeTier(data?.tier))
        }
      } catch {
        if (!cancelled) {
          setActiveTier('free')
        }
      }
    }

    void loadUsage()
    return () => {
      cancelled = true
    }
  }, [])

  const orderedTiers: TierKey[] = ['free', 'pro', 'ultra']

  return (
    <main className="min-h-screen bg-background bg-grid-texture px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-primary/80">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold text-foreground sm:text-5xl">
            Pick the plan that keeps your demo moving
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Free is enough to explore. Pro gives you room to demo properly. Ultra removes the ceiling.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {orderedTiers.map((tier) => {
            const config = TIERS[tier]
            const isActive = activeTier === tier
            const isPopular = tier === 'pro'

            return (
              <section
                key={tier}
                className={`relative rounded-3xl border p-6 backdrop-blur-sm ${
                  isPopular
                    ? 'border-primary/50 bg-primary/10 shadow-[0_0_60px_rgba(99,102,241,0.18)]'
                    : 'border-border bg-secondary/20'
                }`}
              >
                {isPopular ? (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                ) : null}

                <div className="flex min-h-[280px] flex-col">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{config.label}</h2>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-bold text-foreground">
                        {config.price === 0 ? '$0' : `$${config.price}`}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">
                        {config.price === 0 ? 'forever' : 'per month'}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                    {featureLines(tier).map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    {isActive ? (
                      <div className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-medium text-foreground">
                        Current plan
                      </div>
                    ) : tier === 'free' ? (
                      <Link
                        href="/"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        Back to dashboard
                      </Link>
                    ) : (
                      <Link
                        href={`/checkout?tier=${tier}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        {tier === 'pro' ? 'Get Pro' : 'Get Ultra'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}