import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { FlaggedStudentData } from '../types'
import { collection, doc, getDoc, getDocs, query, where } from '@firebase/firestore'
import { auth, dbPromise } from '../firebase'
import { onAuthStateChanged, signOut, type User } from '@firebase/auth'
import { Alert, AlertIcon, Box, Button, Center, Heading, HStack, IconButton, Spinner, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react'
import { ViewIcon } from '@chakra-ui/icons'

export const GradeCoordinatorDashboard = () => {
  const navigate = useNavigate()
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [coordinatorInfo, setCoordinatorInfo] = useState({ name: '', gradeName: '' })

  useEffect(() => {
    const fetchData = async (currentUser: User) => {
      try {
        const db = await dbPromise
        const userDocRef = doc(db, 'users', currentUser.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (!userDocSnap.exists() || userDocSnap.data().role_id !== 3) {
          throw new Error('アクセス権限がありません')
        }
        const coordinatorName = userDocSnap.data().name

        const teacherProfileRef = doc(db, 'teacher_profiles', currentUser.uid)
        const teacherProfileSnap = await getDoc(teacherProfileRef)
        if (!teacherProfileSnap.exists() || teacherProfileSnap.data().grade_id === undefined || teacherProfileSnap.data().grade_id === null) {
          throw new Error('教員情報または担当学年が見つかりません')
        }
        const gradeId = teacherProfileSnap.data().grade_id

        const gradeDocRef = doc(db, 'grades', String(gradeId))
        const gradeDocSnap = await getDoc(gradeDocRef)
        const gradeName = gradeDocSnap.exists() ? gradeDocSnap.data().name : '不明な学年'
        setCoordinatorInfo({ name: coordinatorName, gradeName })

        const studentProfilesRef = collection(db, 'student_profiles')
        const flaggedQuery = query(
          studentProfilesRef,
          where('grade_id', '==', gradeId),
          where('is_flagged', '==', true),
        )
        const flaggedSnapshot = await getDocs(flaggedQuery)

        if (flaggedSnapshot.empty) {
          setIsLoading(false)
          return
        }

        const classesRef = collection(db, 'classes')
        const classesSnapshot = await getDocs(query(classesRef, where('grade_id', '==', gradeId)))
        const classIdToNameMap = new Map(classesSnapshot.docs.map((classDoc) => [classDoc.id, classDoc.data().name]))

        const studentListPromises = flaggedSnapshot.docs.map(async (studentDoc) => {
          const studentProfile = studentDoc.data()
          const studentName = studentProfile.name || '不明な生徒'
          const className = classIdToNameMap.get(studentProfile.class_id) || '不明なクラス'

          return {
            id: studentDoc.id,
            name: studentName,
            className: className,
            classId: studentProfile.class_id,
            gradeName: gradeName,
          }
        })

        const resolvedStudents = (await Promise.all(studentListPromises)) as FlaggedStudentData[]
        resolvedStudents.sort((a, b) => {
          if (a.className !== b.className) return a.className.localeCompare(b.className, 'ja')
          return a.name.localeCompare(b.name, 'ja')
        })

        setFlaggedStudents(resolvedStudents)
      }
      catch (error: unknown) {
        console.error(error)
        if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('requires an index'))) {
          setError('データベース権限エラー、またはインデックスがありません')
        }
        else {
          setError(error instanceof Error ? error.message : 'データの取得に失敗しました')
        }
      }
      finally {
        setIsLoading(false)
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      if (currentUser) {
        fetchData(currentUser)
      }
      else {
        navigate('/login')
      }
    })

    return unsubscribe
  }, [navigate])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    }
    catch (error) {
      console.error('ログアウトエラー', error)
    }
  }

  if (isLoading) return <Center h="100vh"><Spinner size="xl" /></Center>

  return (
    <Box p={8} maxW="container.lg" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="start">
          <Heading as="h1" size="lg">
            学年主任: {coordinatorInfo.name} 先生
          </Heading>
          <Text fontSize="xl" color="gray.600">
            {coordinatorInfo.gradeName} 気になる生徒一覧
          </Text>
        </VStack>
        <Button onClick={handleLogout} colorScheme="red">ログアウト</Button>
      </HStack>

      {error && <Alert status="error" borderRadius="md" mb={6}><AlertIcon />{error}</Alert>}

      <TableContainer borderWidth="1px" borderRadius="lg">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>クラス</Th>
              <Th>生徒氏名</Th>
              <Th>記録一覧</Th>
            </Tr>
          </Thead>
          <Tbody>
            {flaggedStudents.length > 0
              ? (
                  flaggedStudents.map((student) => (
                    <Tr key={student.id}>
                      <Td>{student.className}</Td>
                      <Td>{student.name}</Td>
                      <Td>
                        <IconButton
                          as={Link}
                          to={`/teacher/student/${student.id}`}
                          aria-label={`${student.name} の記録を見る`}
                          icon={<ViewIcon />}
                        />
                      </Td>
                    </Tr>
                  ))
                )
              : (
                  <Tr>
                    <Td colSpan={3} textAlign="center">
                      フラグが設定されている生徒はいません
                    </Td>
                  </Tr>
                )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}
