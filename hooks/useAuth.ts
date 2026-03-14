'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

const TOKEN_KEY = 'qb_token'
const USER_KEY = 'qb_user'
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24

export interface AuthUser {
  id: string
  displayName: string
  signedUpAt: string
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
  saveMockUser: (user: AuthUser) => void
  logout: () => void
}

function setAuthCookie(token: string) {
  document.cookie = `qb_token=${token}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`
}

function clearAuthCookie() {
  document.cookie = 'qb_token=; path=/; max-age=0; SameSite=Lax'
}

function clearStoredAuth() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  clearAuthCookie()
}

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawUser = window.localStorage.getItem(USER_KEY)
  if (!rawUser) {
    return null
  }

  try {
    const parsed = JSON.parse(rawUser) as Partial<AuthUser>
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.displayName === 'string' &&
      typeof parsed.signedUpAt === 'string'
    ) {
      return {
        id: parsed.id,
        displayName: parsed.displayName,
        signedUpAt: parsed.signedUpAt,
      }
    }
  } catch {
    // Fall through to clearing invalid data below.
  }

  window.localStorage.removeItem(USER_KEY)
  return null
}

function writeStoredUser(user: AuthUser) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

const unauthenticatedState: AuthViewState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
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

    const storedUser = readStoredUser()
    if (storedUser) {
      if (!window.localStorage.getItem(TOKEN_KEY)) {
        window.localStorage.setItem(TOKEN_KEY, storedUser.id)
        setAuthCookie(storedUser.id)
      }

      set({
        state: {
          user: storedUser,
          isLoading: false,
          isAuthenticated: true,
        },
        initialized: true,
      })
      return
    }

    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({
        state: unauthenticatedState,
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
        displayName:
          payload.data.user.display_name?.trim() ||
          payload.data.user.email.split('@')[0] ||
          'User',
        signedUpAt: new Date().toISOString(),
      }

      writeStoredUser(user)
      set({
        state: {
          user,
          isLoading: false,
          isAuthenticated: true,
        },
        initialized: true,
      })
    } catch {
      clearStoredAuth()
      set({
        state: unauthenticatedState,
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

  saveMockUser: (user: AuthUser) => {
    if (typeof window === 'undefined') {
      return
    }

    writeStoredUser(user)
    window.localStorage.setItem(TOKEN_KEY, user.id)
    setAuthCookie(user.id)

    set({
      state: {
        user,
        isLoading: false,
        isAuthenticated: true,
      },
      initialized: true,
    })
  },

  logout: () => {
    clearStoredAuth()
    set({
      state: unauthenticatedState,
      initialized: true,
    })
  },
}))

export function useAuth() {
  const state = useAuthInternalStore((store) => store.state)
  const initialized = useAuthInternalStore((store) => store.initialized)
  const refreshUser = useAuthInternalStore((store) => store.refreshUser)
  const setToken = useAuthInternalStore((store) => store.setToken)
  const saveMockUser = useAuthInternalStore((store) => store.saveMockUser)
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
    saveMockUser,
    logout,
  }
}
