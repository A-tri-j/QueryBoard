'use client'

import Link from 'next/link'
import { useAuthContext } from '@/components/auth/auth-provider'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Navbar() {
  const { isAuthenticated, isLoading } = useAuthContext()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-colors duration-200">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-primary-foreground font-bold text-sm">Q</span>
          </div>
          <span className="font-bold text-foreground hidden sm:inline-block">
            QueryBoard
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <Button asChild size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
