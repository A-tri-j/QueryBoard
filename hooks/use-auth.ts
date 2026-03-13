'use client'

import { useState, useEffect, useCallback } from 'react'

export interface User {
  user_id: string
  email: string
  display_name: string | null
  plan: 'free' | 'pro' | 'team'
}

interface AuthResponse {
  success: boolean
  message: string
  data?: {
    access_token: string
    user: User
  }
}

const TOKEN_KEY = 'qb_token'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }, [])

  const setToken = useCallback((token: string | null) => {
    if (typeof window === 'undefined') return
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [])

  const fetchUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data: AuthResponse = await res.json()
      
      if (data.success && data.data?.user) {
        setUser(data.data.user)
      } else {
        setToken(null)
        setUser(null)
      }
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, setToken])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data: AuthResponse = await res.json()

      if (data.success && data.data) {
        setToken(data.data.access_token)
        setUser(data.data.user)
        setIsLoading(false)
        return true
      } else {
        setError(data.message || 'Login failed')
        setIsLoading(false)
        return false
      }
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
      return false
    }
  }

  const register = async (
    email: string,
    password: string,
    display_name?: string
  ): Promise<boolean> => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name }),
      })
      const data: AuthResponse = await res.json()

      if (data.success && data.data) {
        setToken(data.data.access_token)
        setUser(data.data.user)
        setIsLoading(false)
        return true
      } else {
        setError(data.message || 'Registration failed')
        setIsLoading(false)
        return false
      }
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
      return false
    }
  }

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [setToken])

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google'
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loginWithGoogle,
    clearError: () => setError(null),
  }
}
