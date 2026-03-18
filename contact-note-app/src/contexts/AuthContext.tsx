import { useEffect, useState, type ReactNode } from 'react'
import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth'
import { auth, dbPromise } from '../firebase'
import { Alert, Box, Button, Center, Heading, Spinner } from '@chakra-ui/react'
import { AuthContext } from './authContextDefinition'

type AuthProviderProps = {
  children: ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [role, setRole] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        await dbPromise
        console.log('AuthContext: Firestore is Ready')
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user) {
              const idTokenResult = await getIdTokenResult(user, true)

              const claimRole = idTokenResult.claims.role
              const userRole = (claimRole !== undefined && claimRole !== null)
                ? Number(claimRole)
                : null
              setCurrentUser(user)
              setRole(userRole)
              setError(null)
              console.log('AuthProvider: クレーム取得', idTokenResult.claims)
            }
            else {
              setCurrentUser(null)
              setRole(null)
              console.log('AuthProvider: ユーザーはログアウトしました')
            }
          }
          catch (error) {
            console.error('AuthContextエラー:', error)
            const isSecurityError = (
              error
              && typeof error === 'object'
              && error !== null
              && (
                ('code' in error && error.code === 'unimplemented')
                || ('message' in error && typeof error.message === 'string' && error.message.includes('insecure'))
              )
            )

            if (isSecurityError) {
              setError('ブラウザのセキュリティ設定により、認証情報を取得することができません。')
            }
            else if (error instanceof Error) {
              setError(`認証エラー: ${error.message}`)
            }
            else {
              setError('不明なエラー')
            }
            setCurrentUser(null)
            setRole(null)
          }
          finally {
            setIsLoading(false)
          }
        })
        return unsubscribe
      }
      catch (error) {
        console.error('AuthContext(initialize)エラー:', error)
        let isSecurityError = false
        if (typeof error === 'object' && error !== null) {
          const e = error as { code?: string, message?: string }
          isSecurityError = (
            e.code === 'unimplemented'
            || (typeof e.message === 'string' && e.message.includes('insecure'))
          )
        }

        if (isSecurityError) {
          setError('ブラウザのセキュリティ設定により、認証情報を取得することができません。')
        }
        else {
          setError('データベースの初期化に失敗しました')
        }
        setIsLoading(false)
        return () => {}
      }
    }

    const initPromise = initialize()
    return () => {
      initPromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe()
        }
      })
    }
  }, [])

  if (error) {
    return (
      <Center h="100vh">
        <Box p={8} borderWidth={1} borderRadius="lg" bg="white" w="md">
          <Heading size="md" mb={4}>アプリケーションエラー</Heading>
          <Alert status="error">{error}</Alert>
          <Button mt={4} onClick={() => window.location.reload()}>再読み込み</Button>
        </Box>
      </Center>
    )
  }

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <AuthContext.Provider value={{ currentUser, role, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
