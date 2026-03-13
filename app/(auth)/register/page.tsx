'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react'
import { useAuthContext } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

type PasswordStrength = 'weak' | 'fair' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak'
  
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score >= 4) return 'strong'
  if (score >= 2) return 'fair'
  return 'weak'
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password])
  
  if (!password) return null

  const config = {
    weak: { width: 'w-1/3', color: 'bg-destructive', label: 'Weak' },
    fair: { width: 'w-2/3', color: 'bg-yellow-500', label: 'Fair' },
    strong: { width: 'w-full', color: 'bg-green-500', label: 'Strong' },
  }

  const { width, color, label } = config[strength]

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${width} ${color} transition-all duration-300`}
        />
      </div>
      <p className={`text-xs ${
        strength === 'weak' ? 'text-destructive' : 
        strength === 'fair' ? 'text-yellow-500' : 
        'text-green-500'
      }`}>
        Password strength: {label}
      </p>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithGoogle, error, clearError, isLoading } = useAuthContext()
  
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    // Validation
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }

    if (!acceptedTerms) {
      setValidationError('You must accept the terms of service')
      return
    }

    setIsSubmitting(true)

    const success = await register(email, password, displayName || undefined)
    
    if (success) {
      router.push('/')
    }
    
    setIsSubmitting(false)
  }

  const displayError = validationError || error
  const isFormLoading = isSubmitting || isLoading
  const passwordsMatch = confirmPassword && password === confirmPassword

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-texture" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">Q</span>
              </div>
              <span className="text-2xl font-bold text-foreground">QueryBoard</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-4 leading-tight">
              Start your<br />
              <span className="text-primary">data journey</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Join thousands of analysts transforming how they interact with data.
              No SQL required.
            </p>
          </div>
          
          {/* Features list */}
          <div className="mt-8 space-y-3">
            {[
              'Natural language queries',
              'Instant visualizations',
              'Secure data connections',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="size-3 text-primary" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Header with theme toggle */}
        <div className="flex justify-between items-center p-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-foreground">QueryBoard</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Create an account</h2>
              <p className="text-muted-foreground">Get started with QueryBoard today</p>
            </div>

            {/* Error message */}
            {displayError && (
              <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive animate-shake">
                <AlertCircle className="size-4 shrink-0" />
                <p className="text-sm">{displayError}</p>
              </div>
            )}

            {/* Google sign up */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-6 h-11 transition-colors duration-200"
              onClick={loginWithGoogle}
              disabled={isFormLoading}
            >
              <GoogleIcon className="size-5 mr-2" />
              Sign up with Google
            </Button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Register form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  Display name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isFormLoading}
                  className="h-11 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isFormLoading}
                  className="h-11 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isFormLoading}
                    className="h-11 pr-10 transition-colors duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isFormLoading}
                    className={`h-11 pr-10 transition-colors duration-200 ${
                      confirmPassword && !passwordsMatch ? 'border-destructive' : ''
                    } ${passwordsMatch ? 'border-green-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  disabled={isFormLoading}
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 transition-all duration-200"
                disabled={isFormLoading || !acceptedTerms}
              >
                {isFormLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
