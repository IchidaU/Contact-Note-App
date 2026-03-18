import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { RecordEntryPage } from './pages/RecordEntryPage'
import { StudentRecordPageByTeacher } from './pages/StudentRecordPageByTeacher'
import { AdminDashboard } from './pages/AdminDashboard'
import { GradeCoordinatorDashboard } from './pages/GradeCoordinatorDashboard'
import { useAuth } from './hooks/useAuth'
import { Center, Spinner } from '@chakra-ui/react'
import { ProtectedRoute } from './contexts/ProtectedRoute'

const HomeRedirector = () => {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  const numericRole = role ? Number(role) : null

  switch (numericRole) {
    case 1:
      return <Navigate to="/student/dashboard" replace />
    case 2:
      return <Navigate to="/teacher/dashboard" replace />
    case 3:
      return <Navigate to="/coordinator/dashboard" replace />
    case 99:
      return <Navigate to="/admin/dashboard" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedRoles={[1]} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/record/new" element={<RecordEntryPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[2]} />}>
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[3]} />}>
        <Route path="/coordinator/dashboard" element={<GradeCoordinatorDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[2, 3]} />}>
        <Route path="/teacher/student/:studentProfileId" element={<StudentRecordPageByTeacher />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[99]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>
      <Route path="/" element={<HomeRedirector />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
