import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { Alert, AlertIcon, Box, Button, Center, Heading, HStack, IconButton, SimpleGrid, Spinner, Stat, StatHelpText, StatLabel, StatNumber, Table, TableContainer, Tag, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react'
import { ViewIcon } from '@chakra-ui/icons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { auth, dbPromise } from '../firebase'
import type { StudentData } from '../types'

export const TeacherDashboard = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [teacherInfo, setTeacherInfo] = useState({ name: '', className: '', gradeName: '' })
  const [checkDateHeader, setCheckDateHeader] = useState('')
  const [classStats, setClassStats] = useState({ total: 0, submitted: 0, avgPhysical: 0, avgMental: 0 })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const db = await dbPromise
          const getCheckDate = () => {
            const today = new Date()
            const dayOfWeek = today.getDay()
            const checkDate = new Date(today)

            if (dayOfWeek === 0) {
              checkDate.setDate(today.getDate() - 2)
            }
            else if (dayOfWeek === 1) {
              checkDate.setDate(today.getDate() - 3)
            }
            else {
              checkDate.setDate(today.getDate() - 1)
            }
            return checkDate
          }

          const checkDate = getCheckDate()
          const checkDateString = checkDate.toISOString().split('T')[0]
          setCheckDateHeader(`${checkDate.getFullYear()}年${checkDate.getMonth() + 1}月${checkDate.getDate()}日`)

          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          const teacherName = userDocSnap.exists() ? userDocSnap.data().name : '不明な担任'

          const teacherProfileRef = doc(db, 'teacher_profiles', currentUser.uid)
          const teacherProfileSnap = await getDoc(teacherProfileRef)
          if (!teacherProfileSnap.exists()) throw new Error('担任情報が見つかりません')
          const teacherProfile = teacherProfileSnap.data()

          const classId = teacherProfile.class_id
          if (classId === undefined || classId === null) throw new Error('担任プロフィールにクラスが設定されていません')
          const classIdString = String(classId)

          const classDocRef = doc(db, 'classes', classIdString)
          const classDocSnap = await getDoc(classDocRef)
          if (!classDocSnap.exists()) throw new Error('クラス情報が見つかりません')

          const className = classDocSnap.data().name
          const gradeId = classDocSnap.data().grade_id
          if (gradeId === undefined || gradeId === null) throw new Error('クラス情報に学年が設定されていません')
          const gradeIdString = String(gradeId)

          const gradeDocRef = doc(db, 'grades', gradeIdString)
          const gradeDocSnap = await getDoc(gradeDocRef)
          const gradeName = gradeDocSnap.exists() ? gradeDocSnap.data().name : '不明な学年'

          setTeacherInfo({ name: teacherName, className, gradeName })

          const studentProfilesRef = collection(db, 'student_profiles')
          const studentQuery = query(studentProfilesRef, where('class_id', '==', classIdString))
          const studentQuerySnapshot = await getDocs(studentQuery)

          const studentProfiles = studentQuerySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as { user_id: string, class_id: string, name?: string }),
          }))

          const recordsRef = collection(db, 'records')
          const recordQuery = query(recordsRef, where('class_id', '==', classIdString), where('target_date', '==', checkDateString))
          const recordSnapshot = await getDocs(recordQuery)
          const todayRecords = new Map(recordSnapshot.docs.map((doc) => [doc.data().student_profile_id, doc.data()]))

          const studentList = await Promise.all(studentProfiles.map(async (studentDoc) => {
            const studentName = studentDoc.name || '不明な生徒'
            const record = todayRecords.get(studentDoc.id)

            return {
              id: studentDoc.id,
              name: studentName,
              isSubmitted: !!record,
              physical_score: record?.physical_score,
              mental_score: record?.mental_score,
            }
          }))

          const submittedStudents = studentList.filter((student) => student.isSubmitted)
          const totalPhysical = submittedStudents.reduce((total, student) => total + (student.physical_score || 0), 0)
          const totalMental = submittedStudents.reduce((total, student) => total + (student.mental_score || 0), 0)
          const submittedCount = submittedStudents.length

          setClassStats({
            submitted: submittedCount,
            total: studentList.length,
            avgPhysical: submittedCount > 0 ? totalPhysical / submittedCount : 0,
            avgMental: submittedCount > 0 ? totalMental / submittedCount : 0,
          })

          studentList.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

          setStudents(studentList)
        }
        catch (error) {
          console.error(error)
          setError('データの取得に失敗しました')
        }
        finally {
          setIsLoading(false)
        }
      }
      else {
        navigate('/login')
      }
    })
    return () => unsubscribe()
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

  const chartData = [
    { name: '平均スコア', 体調: classStats.avgPhysical, メンタル: classStats.avgMental },
  ]

  if (isLoading) return <Center><Spinner size="xl" /></Center>

  return (
    <Box p={8} maxW="container.lg" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="start">
          <Heading as="h1" size="lg">
            担任: {teacherInfo.name} 先生
          </Heading>
          <Text fontSize="xl" color="gray.600">
            {teacherInfo.gradeName}{teacherInfo.className} 提出状況({checkDateHeader})
          </Text>
        </VStack>
        <Button onClick={handleLogout} colorScheme="red">ログアウト</Button>
      </HStack>

      <Box p={4} borderWidth="1px" borderRadius="lg" mb={8}>
        <Heading size="lg" mb={4}>クラスの健康状態サマリー ({checkDateHeader})</Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
          <Stat p={4} borderWidth="1px" borderRadius="md">
            <StatLabel>提出率</StatLabel>
            <StatNumber>{classStats.total > 0 ? ((classStats.submitted / classStats.total) * 100).toFixed(0) : 0}%</StatNumber>
            <StatHelpText>{classStats.submitted} / {classStats.total} 人</StatHelpText>
          </Stat>
        </SimpleGrid>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="体調" fill="#8884d8" />
            <Bar dataKey="メンタル" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Heading size="lg" mb={4}>生徒別 提出状況</Heading>
      {error && <Alert status="error" borderRadius="md" mb={6}><AlertIcon />{error}</Alert>}

      <TableContainer borderWidth="1px" borderRadius="lg">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>生徒氏名</Th>
              <Th>今日の提出状況</Th>
              <Th>記録一覧</Th>
            </Tr>
          </Thead>
          <Tbody>
            {students.length > 0
              ? (
                  students.map((student) => (
                    <Tr key={student.id}>
                      <Td>{student.name}</Td>
                      <Td>{student.isSubmitted
                        ? (
                            <Tag colorScheme="green">提出済</Tag>
                          )
                        : (
                            <Tag colorScheme="red">未提出</Tag>
                          )}
                      </Td>
                      <Td>
                        <IconButton
                          as={Link}
                          to={`/teacher/student/${student.id}`}
                          aria-label={`${student.name}の記録を見る`}
                          icon={<ViewIcon />}
                        />
                      </Td>
                    </Tr>
                  ))
                )
              : (
                  <Tr>
                    <Td colSpan={3} textAlign="center">生徒情報が見つかりません</Td>
                  </Tr>
                ) }
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}
