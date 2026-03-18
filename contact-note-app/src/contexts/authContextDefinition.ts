import { createContext } from 'react'
import type { AuthContextType } from '../types'

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: null,
  isLoading: true,
  error: null,
})
