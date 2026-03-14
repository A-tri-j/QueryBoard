import Link from 'next/link'
import {
  BarChart3,
  MessageSquareText,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TIERS, type TierKey } from '@/lib/usage'
import { CursorGlow } from '@/components/landing/cursor-glow'
import { ParticleCanvas } from '@/components/landing/particle-canvas'
import { AnimatedHero } from '@/components/landing/animated-hero'
import { MockDashboard } from '@/components/landing/mock-dashboard'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

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
      {/* Interactive client components */}
      <CursorGlow />
      <ParticleCanvas />

      {/* Background ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[6%] top-20 h-72 w-72 rounded-full bg-primary/18 blur-3xl animate-float-slow" />
        <div className="absolute right-[4%] top-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl animate-float-medium" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow"
             style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/landing" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-[0_0_28px_rgba(129,140,248,0.25)]">
                <span className="text-base font-bold">Q</span>
              </div>
              <div>
                <p className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>QueryBoard</p>
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
          <AnimatedHero />

          {/* ── Mock dashboard preview (animated) ──────────────────────── */}
          <MockDashboard />
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <ScrollReveal>
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-primary/80"
                 style={{ fontFamily: 'var(--font-mono)' }}>Features</p>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                Built to make data demos feel crisp, fast, and understandable
              </h2>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <ScrollReveal key={feature.title} delay={index * 100}>
                  <article className="glass-card rounded-[1.75rem] p-6 h-full">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-foreground"
                        style={{ fontFamily: 'var(--font-heading)' }}>{feature.title}</h3>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">{feature.description}</p>
                  </article>
                </ScrollReveal>
              )
            })}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <ScrollReveal>
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-primary/80"
                 style={{ fontFamily: 'var(--font-mono)' }}>How It Works</p>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                Three steps from spreadsheet to story
              </h2>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {steps.map((item, index) => (
              <ScrollReveal key={item.step} delay={index * 100}>
                <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-secondary/20 p-6 h-full">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                  <p className="text-sm font-mono text-primary">{item.step}</p>
                  <h3 className="mt-6 text-2xl font-semibold text-foreground"
                      style={{ fontFamily: 'var(--font-heading)' }}>{item.title}</h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── Pricing preview ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <ScrollReveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.24em] text-primary/80"
                   style={{ fontFamily: 'var(--font-mono)' }}>Pricing Preview</p>
                <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                  Start free, upgrade only when your demo needs more room
                </h2>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/pricing">See full pricing</Link>
              </Button>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {tierOrder.map((tier, index) => {
              const config = TIERS[tier]
              const isPopular = tier === 'pro'

              return (
                <ScrollReveal key={tier} delay={index * 100}>
                  <section
                    className={`relative rounded-[1.9rem] border p-6 h-full ${
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
                    <h3 className="text-2xl font-semibold text-foreground"
                        style={{ fontFamily: 'var(--font-heading)' }}>{config.label}</h3>
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
                </ScrollReveal>
              )
            })}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
                  <span className="text-base font-bold">Q</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>QueryBoard</p>
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