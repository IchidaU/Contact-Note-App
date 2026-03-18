import { useContext } from 'react'
import { AuthContext } from '../contexts/authContextDefinition'
import type { AuthContextType } from '../types'

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }
  return context
}
