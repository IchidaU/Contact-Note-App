import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, dbPromise } from '../firebase'
import { Link, useNavigate } from 'react-router'
import { Alert, AlertIcon, Box, Button, Center, Heading, HStack, IconButton, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Table, TableContainer, Tag, Tbody, Td, Text, Th, Thead, Tr, useDisclosure, VStack } from '@chakra-ui/react'
import { AddIcon, ChatIcon } from '@chakra-ui/icons'
import type { RecordData } from '../types'

export const StudentDashboard = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState<RecordData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null)
  const [studentInfo, setStudentInfo] = useState({ name: '', className: '', gradeName: '' })
  const [error, setError] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleViewDetails = (record: RecordData) => {
    setSelectedRecord(record)
    onOpen()
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const db = await dbPromise
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          const userName = userDocSnap.exists() ? userDocSnap.data().name : ''

          const studentProfileRef = doc(db, 'student_profiles', currentUser.uid)
          const studentProfileSnap = await getDoc(studentProfileRef)
          if (!studentProfileSnap.exists()) throw new Error('生徒情報が見つかりません')

          const studentProfileId = studentProfileSnap.id
          const classId = studentProfileSnap.data().class_id
          if (classId === undefined || classId === null) throw new Error('クラス情報が設定されていません')
          const classIdString = String(classId)

          const classDocRef = doc(db, 'classes', classIdString)
          const classDocSnap = await getDoc(classDocRef)
          if (!classDocSnap.exists()) throw new Error('クラス情報が見つかりません')

          const className = classDocSnap.data().name
          const gradeId = classDocSnap.data().grade_id
          if (gradeId === undefined || gradeId === null) throw new Error('学年情報が設定されていません')
          const gradeIdString = String(gradeId)

          const gradeDocRef = doc(db, 'grades', gradeIdString)
          const gradeDocSnap = await getDoc(gradeDocRef)
          const gradeName = gradeDocSnap.exists() ? gradeDocSnap.data().name : ''

          setStudentInfo({ name: userName, className, gradeName: gradeName })

          const recordsRef = collection(db, 'records')
          const recordsQuery = query(recordsRef, where('student_profile_id', '==', studentProfileId))
          const recordsSnapshot = await getDocs(recordsQuery)

          const fetchedRecords = recordsSnapshot.docs.map((doc) => {
            const data = doc.data()

            let dateString = data.target_date
            if (data.target_date instanceof Timestamp) {
              dateString = data.target_date.toDate().toISOString().split('T')[0]
            }

            return {
              id: doc.id,
              ...data,
              target_date: dateString,
            }
          }) as RecordData[]

          fetchedRecords.sort((a, b) => b.target_date.localeCompare(a.target_date))

          setRecords(fetchedRecords)
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

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <Box p={8}>
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="start">
          <Heading as="h1" size="xl">
            {studentInfo.name}さんのページ
          </Heading>
          <Text fontSize="lg" color="gray.600">{studentInfo.gradeName} {studentInfo.className}</Text>
        </VStack>
        <Button onClick={handleLogout} colorScheme="red">ログアウト</Button>
      </HStack>

      <Box mb={6}>
        <Button as={Link} to="/student/record/new" colorScheme="teal" leftIcon={<AddIcon />}>
          新しい記録を追加
        </Button>
      </Box>

      {error && (
        <Alert status="error" borderRadius="md" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <TableContainer>
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>日付</Th>
              <Th isNumeric>体調</Th>
              <Th isNumeric>メンタル</Th>
              <Th>先生の確認</Th>
              <Th>詳細</Th>
            </Tr>
          </Thead>
          <Tbody>
            {records.length > 0
              ? (
                  records.map((record) => (
                    <Tr key={record.id}>
                      <Td>{record.target_date}</Td>
                      <Td isNumeric>{record.physical_score}/10</Td>
                      <Td isNumeric>{record.mental_score}/10</Td>
                      <Td>{record.is_read
                        ? (
                            <Tag colorScheme="green">確認済み</Tag>
                          )
                        : (
                            <Tag>未確認</Tag>
                          )}
                      </Td>
                      <Td>
                        <IconButton
                          aria-label="詳細を見る"
                          icon={<ChatIcon />}
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                        />
                      </Td>
                    </Tr>
                  ))
                )
              : (
                  <Tr>
                    <Td colSpan={5} textAlign="center">記録はありません</Td>
                  </Tr>
                )}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>記録の詳細({selectedRecord?.target_date})</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRecord && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">体調</Text>
                  <Text>{selectedRecord.physical_score} / 10</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">メンタル</Text>
                  <Text>{selectedRecord.mental_score} / 10</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">振り返り</Text>
                  <Text whiteSpace="pre-wrap">{selectedRecord.feedback_text}</Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
