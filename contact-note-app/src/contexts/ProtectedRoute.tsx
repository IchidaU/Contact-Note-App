import { Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '../hooks/useAuth'
import { Navigate, Outlet } from 'react-router'

type ProtectedRouteProps = {
  allowedRoles: number[]
  redirectPath?: string
}

export const ProtectedRoute = ({ allowedRoles, redirectPath = '/login' }: ProtectedRouteProps) => {
  const { currentUser, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner />
      </Center>
    )
  }

  if (!currentUser) {
    return <Navigate to={redirectPath} replace />
  }

  const numericRole = role ? Number(role) : null

  if (allowedRoles.includes(numericRole!)) {
    return <Outlet />
  }
  else {
    let homePath = '/login'
    if (numericRole === 1) homePath = '/student/dashboard'
    if (numericRole === 2) homePath = '/teacher/dashboard'
    if (numericRole === 3) homePath = '/coordinator/dashboard'
    if (numericRole === 99) homePath = '/admin/dashboard'
    return <Navigate to={homePath} replace />
  }
}
