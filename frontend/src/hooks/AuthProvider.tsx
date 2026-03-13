import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthCtx } from './authContext.ts'
import type { User } from '../types/index.ts'
import { apiFetch } from '../api/client.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ ok: boolean; user: User }>('/auth/me')
      setUser(res.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (userId: string, password: string) => {
      const res = await apiFetch<{ ok: boolean; user: User }>('/auth/login', {
        method: 'POST',
        body: { userId, password },
      })
      setUser(res.user)
    },
    []
  )

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser, refresh }}>
      {children}
    </AuthCtx.Provider>
  )
}
