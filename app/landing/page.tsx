import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  LineChart,
  MessageSquareText,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TIERS, type TierKey } from '@/lib/usage'

const features = [
  {
    icon: Upload,
    title: 'Upload Any Dataset',
    description: 'Drag in CSV or XLSX files and let QueryBoard infer columns, types, and structure instantly.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask in Plain English',
    description: 'Turn natural language into grouped charts and comparisons without writing SQL or formulas.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Insights',
    description: 'Get GPT-4o-mini summaries grounded in the chart data so your story stays tied to real numbers.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Upload your data',
    description: 'Drop in a spreadsheet and QueryBoard maps the schema for you.',
  },
  {
    step: '02',
    title: 'Ask a question',
    description: 'Describe what you want to learn in plain English.',
  },
  {
    step: '03',
    title: 'Get instant charts',
    description: 'See visual answers, summaries, and supporting data right away.',
  },
]

const tierOrder: TierKey[] = ['free', 'pro', 'ultra']

function formatTierValue(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : 'Unlimited'
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background bg-grid-texture text-foreground">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[6%] top-20 h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute right-[4%] top-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-2 w-2 rounded-full bg-primary/40 animate-pulse"
            style={{
              left: `${8 + index * 7}%`,
              top: `${12 + (index % 5) * 15}%`,
              animationDelay: `${index * 180}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/landing" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_28px_rgba(129,140,248,0.25)]">
                <span className="text-base font-bold">Q</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">QueryBoard</p>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Hackathon BI</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild variant="outline" className="hidden sm:inline-flex rounded-full">
                <Link href="/pricing">View Pricing</Link>
              </Button>
              <Button asChild className="rounded-full glow-primary">
                <Link href="/login">Start for Free</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-[0.26em] text-primary animate-fade-up">
              <Sparkles className="h-3.5 w-3.5" />
              Conversational analytics
            </p>
            <h1 className="mt-6 animate-fade-up text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-white via-primary/90 to-cyan-300 bg-clip-text text-transparent">
                Ask Anything About Your Data
              </span>
            </h1>
            <p
              className="mt-6 max-w-2xl animate-fade-up text-lg leading-8 text-muted-foreground"
              style={{ animationDelay: '120ms' }}
            >
              Upload any CSV or Excel file and get instant charts, insights, and analysis powered by AI.
              QueryBoard turns your spreadsheet into a demo-ready dashboard in minutes.
            </p>

            <div
              className="mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '220ms' }}
            >
              <Button asChild size="lg" className="rounded-full px-7 glow-primary">
                <Link href="/login">
                  Start for Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Upload ready', value: 'CSV + XLSX' },
                { label: 'Query style', value: 'Plain English' },
                { label: 'Output', value: 'Charts + Insights' },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="glass-card animate-fade-up rounded-2xl px-4 py-4"
                  style={{ animationDelay: `${320 + index * 80}ms` }}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mock dashboard preview ───────────────────────────────── */}
          <div className="relative animate-fade-up" style={{ animationDelay: '180ms' }}>
            <div className="absolute -left-6 top-12 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="glass-card relative overflow-hidden rounded-[2rem] border border-primary/15 p-5 shadow-[0_20px_100px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Mock Dashboard Preview
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">Retail Spending Overview</h2>
                </div>
                <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  Live preview
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Question</p>
                <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground">
                  Compare online shopping behavior and store shopping behavior across different age groups
                </div>
              </div>

              {/* ── Fixed grid: left card + right column ──────────────── */}
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
                {/* Left — bar chart */}
                <div className="flex flex-col rounded-3xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Average Spend by City Tier</p>
                  </div>
                  <div className="mt-4 flex flex-1 items-end gap-3 min-h-[11rem]">
                    {[64, 92, 78, 104].map((height, index) => (
                      <div key={height} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-primary via-primary/80 to-cyan-300/80 animate-fade-up"
                          style={{ height: `${height}px`, animationDelay: `${index * 100}ms` }}
                        />
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {['T1', 'T2', 'T3', 'T4'][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — trend + AI summary stacked to fill height */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-medium text-foreground">Trend Snapshot</p>
                    </div>
                    <div className="mt-5 flex h-20 items-end gap-2">
                      {[20, 38, 30, 48, 42, 60, 55].map((point, index) => (
                        <div key={index} className="flex flex-1 items-end">
                          <div
                            className="h-2 w-full rounded-full bg-gradient-to-r from-cyan-300 to-primary"
                            style={{ transform: `translateY(${56 - point}px)` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* flex-1 makes this card expand to match the bar chart height */}
                  <div className="flex-1 rounded-3xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI summary</p>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      Tier 1 cities show the highest average online spend, while store behavior stays steadier
                      across groups. QueryBoard turns that into charts and grounded narrative instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary/80">Features</p>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Built to make data demos feel crisp, fast, and understandable
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <article
                  key={feature.title}
                  className="glass-card animate-fade-up rounded-[1.75rem] p-6"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{feature.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary/80">How It Works</p>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Three steps from spreadsheet to story
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {steps.map((item, index) => (
              <div
                key={item.step}
                className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-secondary/20 p-6 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <p className="text-sm font-mono text-primary">{item.step}</p>
                <h3 className="mt-6 text-2xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing preview ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-primary/80">Pricing Preview</p>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
                Start free, upgrade only when your demo needs more room
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/pricing">See full pricing</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {tierOrder.map((tier) => {
              const config = TIERS[tier]
              const isPopular = tier === 'pro'

              return (
                <section
                  key={tier}
                  className={`relative rounded-[1.9rem] border p-6 ${
                    isPopular
                      ? 'border-primary/40 bg-primary/10 shadow-[0_0_40px_rgba(129,140,248,0.15)]'
                      : 'border-border/70 bg-secondary/20'
                  }`}
                >
                  {isPopular ? (
                    <div className="absolute -top-3 left-6 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">
                      Most Popular
                    </div>
                  ) : null}
                  <h3 className="text-2xl font-semibold text-foreground">{config.label}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      {config.price === 0 ? '$0' : `$${config.price}`}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">
                      {config.price === 0 ? 'forever' : 'per month'}
                    </span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                    <li>{formatTierValue(config.queries)} queries per day</li>
                    <li>{formatTierValue(config.uploads)} uploads per day</li>
                    <li>{formatTierValue(config.tokens)} tokens per day</li>
                  </ul>
                  <Button asChild className="mt-8 w-full rounded-2xl">
                    <Link href={tier === 'free' ? '/login' : `/checkout?tier=${tier}`}>
                      {tier === 'free' ? 'Start Free' : `Get ${config.label}`}
                    </Link>
                  </Button>
                </section>
              )
            })}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <span className="text-base font-bold">Q</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">QueryBoard</p>
                  <p className="text-sm text-muted-foreground">Ask anything. Show the answer fast.</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Built for hackathon demos.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Link href="/pricing" className="transition-colors hover:text-foreground">
                Pricing
              </Link>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Login
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}