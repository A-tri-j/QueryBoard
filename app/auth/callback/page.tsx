'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    async function handleCallback() {
      if (!token) { router.replace('/'); return }
      window.localStorage.setItem('qb_token', token)
      document.cookie = `qb_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
      await refreshUser()
      router.replace('/')
    }
    void handleCallback()
  }, [refreshUser, router, searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-card rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold text-foreground">Signing you in</h1>
        <p className="mt-3 text-muted-foreground">
          We&apos;re finishing your QueryBoard authentication and redirecting you back home.
        </p>
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <CallbackInner />
    </Suspense>
  )
}
