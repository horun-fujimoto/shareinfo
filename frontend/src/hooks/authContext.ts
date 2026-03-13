import { createContext } from 'react'
import type { User } from '../types/index.ts'

export type AuthContextType = {
  user: User | null
  loading: boolean
  login: (userId: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User | null) => void
  refresh: () => Promise<void>
}

export const AuthCtx = createContext<AuthContextType | undefined>(undefined)
