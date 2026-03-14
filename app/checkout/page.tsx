'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Landmark, Bitcoin } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/components/ui/use-toast'
import { TIERS, type TierKey } from '@/lib/usage'

export const dynamic = 'force-dynamic'

type PaymentMethod = 'card' | 'paypal' | 'crypto'

function normalizeTier(tier: string | null): TierKey {
  if (tier === 'pro' || tier === 'ultra') {
    return tier
  }
  return 'pro'
}

const paymentMethods: Array<{
  key: PaymentMethod
  label: string
  icon: typeof CreditCard
}> = [
  { key: 'card', label: 'Credit Card', icon: CreditCard },
  { key: 'paypal', label: 'PayPal', icon: Landmark },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
]

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tier = useMemo(() => normalizeTier(searchParams.get('tier')), [searchParams])
  const tierConfig = TIERS[tier]
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const completePurchase = async () => {
    setIsSubmitting(true)
    setPurchaseError(null)

    try {
      const response = await fetch('/api/usage/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'anonymous',
          tier,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { detail?: string } | null
      if (!response.ok) {
        throw new Error(payload?.detail || 'Upgrade failed.')
      }

      window.dispatchEvent(new CustomEvent('qb-usage-refresh'))
      toast({
        title: 'Purchase complete',
        description: `${tierConfig.label} is now active for this demo workspace.`,
      })

      window.setTimeout(() => {
        router.push('/')
      }, 900)
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : 'Upgrade failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background bg-grid-texture px-6 py-16">
      <Toaster />
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-primary/80">Mock Checkout</p>
          <h1 className="mt-4 text-4xl font-semibold text-foreground">
            Complete your {tierConfig.label} upgrade
          </h1>
          <p className="mt-4 text-muted-foreground">
            This is a demo flow. No real payment provider is called and no money is charged.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-border bg-secondary/20 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                const active = paymentMethod === method.key

                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setPaymentMethod(method.key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Card number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">Expiry</label>
                  <input
                    type="text"
                    placeholder="12/29"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </div>
              </div>
            </div>

            {purchaseError ? (
              <p className="mt-4 text-sm text-destructive">{purchaseError}</p>
            ) : null}
          </section>

          <aside className="rounded-3xl border border-border bg-background/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground/70">
              Order summary
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">{tierConfig.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {paymentMethod === 'card'
                ? 'Card details are mock-only for the hackathon demo.'
                : `You selected ${paymentMethods.find((method) => method.key === paymentMethod)?.label}.`}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly price</span>
                <span className="font-medium text-foreground">
                  ${tierConfig.price.toFixed(2)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Queries / day</span>
                <span className="text-foreground">
                  {Number.isFinite(tierConfig.queries)
                    ? tierConfig.queries.toLocaleString()
                    : 'Unlimited'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploads / day</span>
                <span className="text-foreground">
                  {Number.isFinite(tierConfig.uploads)
                    ? tierConfig.uploads.toLocaleString()
                    : 'Unlimited'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void completePurchase()}
              disabled={isSubmitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Processing...' : 'Complete Purchase'}
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}