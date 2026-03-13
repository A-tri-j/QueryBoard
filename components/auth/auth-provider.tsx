'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAuth as useZustandAuth } from '@/hooks/useAuth'
import { useAuth as useLocalAuth, type User } from '@/hooks/use-auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, display_name?: string) => Promise<boolean>
  logout: () => void
  loginWithGoogle: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const localAuth = useLocalAuth()
  const zustandAuth = useZustandAuth()

  // Whenever local auth state changes (login/logout), sync the Zustand store
  useEffect(() => {
    if (localAuth.user && !zustandAuth.state.isAuthenticated) {
      void zustandAuth.refreshUser()
    }
    if (!localAuth.user && zustandAuth.state.isAuthenticated) {
      zustandAuth.logout()
    }
  }, [localAuth.user])

  return (
    <AuthContext.Provider value={localAuth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
