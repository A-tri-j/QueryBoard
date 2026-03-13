'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

const TOKEN_KEY = 'qb_token'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  auth_provider: string
  created_at?: string
  updated_at?: string
}

interface AuthMeResponse {
  success: boolean
  message: string
  data?: {
    user: {
      user_id: string
      email: string
      display_name: string | null
      plan: 'free' | 'pro' | 'team'
    }
  }
}

interface AuthViewState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthStore {
  state: AuthViewState
  initialized: boolean
  refreshUser: () => Promise<void>
  setToken: (token: string) => void
  logout: () => void
}

function setAuthCookie(token: string) {
  document.cookie = `qb_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
}

function clearAuthCookie() {
  document.cookie = 'qb_token=; path=/; max-age=0; path=/'
}

const useAuthInternalStore = create<AuthStore>((set) => ({
  state: {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  },
  initialized: false,

  refreshUser: async () => {
    if (typeof window === 'undefined') {
      return
    }

    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({
        state: {
          user: null,
          isLoading: false,
          isAuthenticated: false,
        },
        initialized: true,
      })
      return
    }

    set((current) => ({
      ...current,
      state: {
        ...current.state,
        isLoading: true,
      },
    }))

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Unable to refresh the current user.')
      }

      const payload = (await response.json()) as AuthMeResponse
      if (!payload.success || !payload.data?.user) {
        throw new Error('Unable to refresh the current user.')
      }

      const user: AuthUser = {
        id: payload.data.user.user_id,
        email: payload.data.user.email,
        full_name: payload.data.user.display_name ?? '',
        auth_provider: 'local',
      }

      set({
        state: {
          user,
          isLoading: false,
          isAuthenticated: true,
        },
        initialized: true,
      })
    } catch {
      window.localStorage.removeItem(TOKEN_KEY)
      clearAuthCookie()
      set({
        state: {
          user: null,
          isLoading: false,
          isAuthenticated: false,
        },
        initialized: true,
      })
    }
  },

  setToken: (token: string) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(TOKEN_KEY, token)
    setAuthCookie(token)
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY)
      clearAuthCookie()
    }

    set({
      state: {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      },
      initialized: true,
    })
  },
}))

export function useAuth() {
  const state = useAuthInternalStore((store) => store.state)
  const initialized = useAuthInternalStore((store) => store.initialized)
  const refreshUser = useAuthInternalStore((store) => store.refreshUser)
  const setToken = useAuthInternalStore((store) => store.setToken)
  const logout = useAuthInternalStore((store) => store.logout)

  useEffect(() => {
    if (!initialized) {
      void refreshUser()
    }
  }, [initialized, refreshUser])

  return {
    state,
    refreshUser,
    setToken,
    logout,
  }
}
