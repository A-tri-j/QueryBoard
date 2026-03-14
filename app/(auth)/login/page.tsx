'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, AlertCircle, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { state, saveMockUser, setToken } = useAuth()

  // Mock Google flow
  const [showGooglePrompt, setShowGooglePrompt] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  // Email / password flow
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)

  useEffect(() => {
    if (!state.isLoading && state.isAuthenticated) {
      router.replace('/')
    }
  }, [router, state.isAuthenticated, state.isLoading])

  // ── Mock Google handler ───────────────────────────────────────────────────
  const handleGoogleContinue = async () => {
    const trimmedName = displayName.trim()
    if (trimmedName.length < 2) {
      setGoogleError('Display name must be at least 2 characters.')
      return
    }
    setGoogleError(null)
    setIsGoogleSubmitting(true)
    try {
      saveMockUser({
        id: `${trimmedName}_${Date.now()}`,
        displayName: trimmedName,
        signedUpAt: new Date().toISOString(),
      })
      router.replace('/')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  // ── Email / password handler ──────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    setIsEmailSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { token?: string; detail?: string }
        | null

      if (!response.ok || !payload?.token) {
        throw new Error(payload?.detail ?? 'Invalid email or password.')
      }

      setToken(payload.token)
      router.replace('/')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  const isBusy = state.isLoading || isGoogleSubmitting || isEmailSubmitting

  return (
    <div className="min-h-screen bg-background bg-grid-texture">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[8%] top-20 h-64 w-64 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute right-[10%] top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex">
        {/* ── Left panel (desktop only) ─────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 border-r border-border/60">
          <div className="flex flex-1 flex-col justify-between px-12 py-12 xl:px-20">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(129,140,248,0.25)]">
                  <span className="text-lg font-bold">Q</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">QueryBoard</p>
                  <p className="text-sm text-muted-foreground">Hackathon Edition</p>
                </div>
              </div>

              <div className="mt-16 max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered BI
                </p>
                <h1 className="mt-6 text-5xl font-bold leading-tight text-foreground">
                  Ask your data{' '}
                  <span className="text-primary">anything.</span>
                </h1>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  Upload any CSV or Excel file and get instant charts, insights,
                  and AI summaries — no SQL, no dashboards to configure.
                </p>
              </div>

              <div className="mt-10 grid gap-4">
                {[
                  'Bring in CSV or XLSX files and get a live schema instantly.',
                  'Ask questions in plain English and get charts back in seconds.',
                  'AI summaries grounded in real data — no hallucinated numbers.',
                ].map((item, index) => (
                  <div
                    key={item}
                    className="glass-card animate-fade-up rounded-2xl px-5 py-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card max-w-lg rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Try this query
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    "Compare online spend vs store spend by city tier"
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                  Ready
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel — forms ───────────────────────────────────────── */}
        <div className="flex w-full flex-col lg:w-1/2">
          <div className="flex items-center justify-between p-6">
            <Link href="/landing" className="lg:hidden flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <span className="text-sm font-bold">Q</span>
              </div>
              <span className="font-semibold text-foreground">QueryBoard</span>
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-12">
            <div className="w-full max-w-md">
              <div className="text-center animate-fade-up">
                <p className="text-sm uppercase tracking-[0.24em] text-primary/80">Welcome back</p>
                <h2 className="mt-4 text-3xl font-bold text-foreground">Sign in to QueryBoard</h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Use your account or continue with Google.
                </p>
              </div>

              <div
                className="mt-8 glass-card rounded-3xl p-6 animate-fade-up"
                style={{ animationDelay: '120ms' }}
              >
                {/* ── Mock Google button ─────────────────────────────── */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-border/80 bg-background/60 text-foreground transition-all hover:border-primary/40 hover:bg-background/80"
                  disabled={isBusy}
                  onClick={() => {
                    setGoogleError(null)
                    setShowGooglePrompt(true)
                  }}
                >
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>

                {/* Mock Google name prompt */}
                {showGooglePrompt && (
                  <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/8 p-5 backdrop-blur-sm">
                    <p className="text-sm uppercase tracking-[0.18em] text-primary/80">
                      Profile setup
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      What should we call you?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Saved locally — no real OAuth round-trip.
                    </p>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Avery Johnson"
                        autoFocus
                        disabled={isBusy}
                        className="h-11 rounded-2xl border-border/80 bg-background/70"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleGoogleContinue()
                        }}
                      />
                    </div>

                    {googleError && (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {googleError}
                      </div>
                    )}

                    <div className="mt-4 flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 flex-1 rounded-2xl"
                        disabled={isBusy}
                        onClick={() => {
                          setShowGooglePrompt(false)
                          setGoogleError(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="h-10 flex-1 rounded-2xl"
                        disabled={isBusy}
                        onClick={() => void handleGoogleContinue()}
                      >
                        {isGoogleSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-1 h-4 w-4" />
                        )}
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Divider ────────────────────────────────────────── */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* ── Email / password form ──────────────────────────── */}
                <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
                  {emailError && (
                    <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {emailError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isBusy}
                      className="h-11 rounded-2xl border-border/80 bg-background/70"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isBusy}
                        className="h-11 rounded-2xl border-border/80 bg-background/70 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    disabled={isBusy}
                  >
                    {isEmailSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Register
                </Link>
              </p>

              <p className="mt-3 text-center text-sm text-muted-foreground">
                Need to see the product first?{' '}
                <Link
                  href="/landing"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Explore the landing page
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}