import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { collection, getDoc, getDocs, orderBy, query, Timestamp, where, doc, updateDoc, serverTimestamp, addDoc, Query, type DocumentData } from 'firebase/firestore'
import { Alert, AlertIcon, Badge, Box, Button, Center, Divider, FormControl, Heading, HStack, IconButton, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Spinner, Table, TableContainer, Tag, Tbody, Td, Text, Textarea, Th, Thead, Tr, useDisclosure, useToast, VStack } from '@chakra-ui/react'
import { ArrowBackIcon, ChatIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { auth, dbPromise } from '../firebase'
import type { ChartData, MemoData, RecordData } from '../types'
import { onAuthStateChanged, type User } from 'firebase/auth'

export const StudentRecordPageByTeacher = () => {
  const { studentProfileId } = useParams<{ studentProfileId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [studentName, setStudentName] = useState('')
  const [records, setRecords] = useState<RecordData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFlagged, setIsFlagged] = useState(false) // 「気になる」フラグ用
  const [error, setError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [currentMemos, setCurrentMemos] = useState<MemoData[]>([])
  const [newMemoText, setNewMemoText] = useState('')
  const [isMemoLoading, setIsMemoLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [teacherRoleId, setTeacherRoleId] = useState<number | null>(null)
  const [teacherName, setTeacherName] = useState('')

  const fetchStudentData = useCallback(async (currentUser: User) => {
    if (!studentProfileId) {
      setError('生徒情報が見つかりません')
      setIsLoading(false)
      return
    }

    try {
      const db = await dbPromise
      const teacherUserSnap = await getDoc(doc(db, 'users', currentUser.uid))
      if (!teacherUserSnap.exists()) throw new Error('教員情報が見つかりません')
      const teacherUserData = teacherUserSnap.data()

      const teacherRoleId = teacherUserData.role_id
      setTeacherRoleId(teacherRoleId)
      setTeacherName(teacherUserData.name || '不明な教員')

      const teacherProfileRef = doc(db, 'teacher_profiles', currentUser.uid)
      const teacherProfileSnap = await getDoc(teacherProfileRef)
      if (!teacherProfileSnap.exists()) throw new Error('担任情報が見つかりません')

      const teacherProfileData = teacherProfileSnap.data()

      let teacherClassId = null
      let teacherGradeId = null

      if (teacherRoleId === 2) {
        teacherClassId = teacherProfileData.class_id
        if (!teacherClassId) throw new Error('担任にクラスが割り当てられていません')
      }
      else if (teacherRoleId === 3) {
        teacherGradeId = teacherProfileData.grade_id
        if (teacherGradeId === undefined || teacherGradeId === null) {
          throw new Error('学年主任に学年が割り当てられていません')
        }
      }
      else {
        throw new Error('アクセス権限がありません')
      }

      const studentProfileRef = doc(db, 'student_profiles', studentProfileId)
      const studentProfileSnap = await getDoc(studentProfileRef)
      if (!studentProfileSnap.exists()) throw new Error('生徒情報が見つかりません')

      const studentProfileData = studentProfileSnap.data()

      if (teacherRoleId === 2 && studentProfileData.class_id !== teacherClassId) {
        throw new Error('この生徒の情報を閲覧する権限がありません')
      }
      if (teacherRoleId === 3 && studentProfileData.grade_id !== teacherGradeId) {
        throw new Error('この生徒の情報を閲覧する権限がありません')
      }

      setStudentName(studentProfileData.name || '生徒名読込中...')
      setIsFlagged(studentProfileData.is_flagged || false)

      const recordsRef = collection(db, 'records')
      let recordQuery: Query<DocumentData>

      if (teacherRoleId === 2) {
        recordQuery = query(recordsRef, where('student_profile_id', '==', studentProfileId), where('class_id', '==', teacherClassId))
      }
      else if (teacherRoleId === 3) {
        recordQuery = query(recordsRef, where('student_profile_id', '==', studentProfileId), where('grade_id', '==', teacherGradeId))
      }
      else {
        // エラー回避のためのデフォルトクエリ（実際には使用されない）
        throw new Error('クエリの作成に失敗しました（権限エラー）')
      }

      const querySnapshot = await getDocs(recordQuery)

      const fetchedRecords = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        let dateString = data.target_date
        if (data.target_date instanceof Timestamp) {
          dateString = data.target_date.toDate().toISOString().split('T')[0]
        }

        const memosRef = collection(db, 'teacher_memos')
        const memoQuery = query(memosRef, where('record_id', '==', doc.id))
        const memoSnapshot = await getDocs(memoQuery)

        return {
          id: doc.id,
          ...data,
          target_date: dateString,
          memoCount: memoSnapshot.size,
        } as RecordData
      }))

      fetchedRecords.sort((a, b) => b.target_date.localeCompare(a.target_date))

      setRecords(fetchedRecords)

      const formattedChartData = [...fetchedRecords]
        .sort((a, b) => a.target_date.localeCompare(b.target_date))
        .map((record) => {
          const dateParts = record.target_date.split('-')
          const month = dateParts[1].replace(/^0+/, '')
          const day = dateParts[2].replace(/^0+/, '')
          return {
            date: `${month}/${day}`,
            体調: record.physical_score,
            メンタル: record.mental_score,
          }
        })
      setChartData(formattedChartData.slice(-30))
    }
    catch (error: unknown) {
      console.error(error)

      const isFirestorePermissionError = (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied')
      const isManualPermissionError = (error instanceof Error && error.message.includes('アクセス権限がありません'))

      if (isFirestorePermissionError || isManualPermissionError) {
        setError('この生徒の情報を閲覧する権限がありません')
      }
      else {
        setError('データ取得に失敗しました')
      }
    }
    finally {
      setIsLoading(false)
    }
  }, [studentProfileId])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchStudentData(currentUser)
      }
      else {
        navigate('/login')
      }
    })

    return () => unsubscribe()
  }, [fetchStudentData, navigate])

  const handleMarkAsRead = async (recordId: string) => {
    if (teacherRoleId === 3) {
      toast({ title: '操作不可', description: '学年主任は既読ボタンを操作できません', status: 'warning', duration: 5000, isClosable: true })
      return
    }
    try {
      const db = await dbPromise
      const recordRef = doc(db, 'records', recordId)
      await updateDoc(recordRef, { is_read: true })

      setRecords((prevRecords) =>
        prevRecords.map((r) => r.id === recordId ? { ...r, is_read: true } : r),
      )
      toast({ title: 'ステータスを既読に変更しました', status: 'success', duration: 2000, isClosable: true })
    }
    catch (error) {
      console.error(error)
      toast({ title: 'ステータス更新に失敗しました', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleModalOpen = async (record: RecordData) => {
    setSelectedRecord(record)
    setIsMemoLoading(true)
    onOpen()
    try {
      const db = await dbPromise
      const memosRef = collection(db, 'teacher_memos')
      const q = query(memosRef, where('record_id', '==', record.id), orderBy('created_at', 'desc'))
      const querySnapshot = await getDocs(q)
      const fetchedMemos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MemoData[]
      setCurrentMemos(fetchedMemos)
    }
    catch (error) {
      console.error(error)
      toast({ title: 'メモ取得に失敗しました', status: 'error', duration: 3000, isClosable: true })
    }
    finally {
      setIsMemoLoading(false)
    }
  }

  const handleSaveMemo = async () => {
    const currentUser = auth.currentUser
    if (!selectedRecord || !currentUser || !newMemoText.trim()) return

    try {
      const db = await dbPromise
      const newMemoData = {
        record_id: selectedRecord.id,
        teacher_user_id: currentUser.uid,
        teacher_name: teacherName,
        memo_text: newMemoText,
        created_at: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, 'teacher_memos'), newMemoData)

      setCurrentMemos((prev) => [{ id: docRef.id, ...newMemoData, created_at: Timestamp.now() }, ...prev])
      setNewMemoText('')

      setRecords((prev) => prev.map((r) => r.id === selectedRecord.id ? { ...r, memoCount: (r.memoCount || 0) + 1 } : r))

      toast({ title: 'メモを保存しました', status: 'success', duration: 2000, isClosable: true })
    }
    catch (error) {
      console.error(error)
      toast({ title: 'メモの保存に失敗しました', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleToggleFlag = async () => {
    if (!studentProfileId) return
    if (teacherRoleId === 3) {
      toast({ title: '操作不可', description: '学年主任は「気になる」フラグを操作できません', status: 'warning', duration: 5000, isClosable: true })
      return
    }
    const newFlaggedState = !isFlagged
    try {
      const db = await dbPromise
      const studentProfileRef = doc(db, 'student_profiles', studentProfileId)
      await updateDoc(studentProfileRef, { is_flagged: newFlaggedState })
      setIsFlagged(newFlaggedState)
      toast({
        title: newFlaggedState ? '気になる生徒をマークしました' : 'マークを解除しました',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    }
    catch (error) {
      console.error(error)
      toast({ title: 'フラグ更新に失敗しました', status: 'error', duration: 3000, isClosable: true })
    }
  }

  if (isLoading) {
    return <Center h="100vh"><Spinner size="xl" /></Center>
  }

  return (
    <Box p={8} maxW="container.lg" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <HStack>
          <IconButton aria-label="戻る" icon={<ArrowBackIcon />} onClick={() => navigate(-1)} />
          <Heading as="h1" size="xl">
            {studentName}の連絡帳
          </Heading>
          <Button
            leftIcon={<WarningIcon />}
            colorScheme={isFlagged ? 'yellow' : 'gray'}
            variant={isFlagged ? 'solid' : 'outline'}
            isDisabled={teacherRoleId === 3}
            title={teacherRoleId === 3 ? '学年主任は操作できません' : ''}
            onClick={handleToggleFlag}
            size="sm"
          >
            {isFlagged ? '解除' : '気になる'}
          </Button>
        </HStack>
      </HStack>

      {error && <Alert status="error" borderRadius="md" mb={6}>{error}<AlertIcon /></Alert>}

      <Box p={4} borderWidth="1px" borderRadius="md" mb={8}>
        <Heading size="md" mb="4">コンディションの推移</Heading>
        {chartData.length > 0
          ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} width={40} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="体調" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="メンタル" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            )
          : (
              <Center p={4}><Text color="gray.500">データがありません</Text></Center>
            )}
      </Box>

      <TableContainer borderWidth="1px" borderRadius="lg">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>日付</Th>
              <Th>振り返り内容</Th>
              <Th>ステータス</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {records.length > 0
              ? (
                  records.map((record) => (
                    <Tr key={record.id}>
                      <Td>{record.target_date}</Td>
                      <Td maxW="400px" whiteSpace="pre-wrap"><Text noOfLines={2}>{record.feedback_text}</Text></Td>
                      <Td>{record.is_read ? <Tag colorScheme="green">確認済</Tag> : <Tag colorScheme="yellow">未確認</Tag>}</Td>
                      <Td>
                        <HStack>
                          <IconButton
                            aria-label="詳細とメモ"
                            icon={<ChatIcon />}
                            size="sm"
                            onClick={() => handleModalOpen(record)}
                          />
                          {!record.is_read && (
                            <Button
                              size="sm"
                              leftIcon={<CheckIcon />}
                              colorScheme="teal"
                              onClick={() => handleMarkAsRead(record.id)}
                              isDisabled={teacherRoleId === 3}
                              title={teacherRoleId === 3 ? '学年主任は操作できません' : ''}
                            >
                              既読にする
                            </Button>
                          )}
                          {record.memoCount && record.memoCount > 0 && (
                            <Badge colorScheme="blue" variant="solid" borderRadius="full" px={2}>
                              {record.memoCount}
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )
              : (
                  <Tr>
                    <Td colSpan={4} textAlign="center">
                      この生徒の記録はまだありません。
                    </Td>
                  </Tr>
                )}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>連絡帳の詳細・メモ ({selectedRecord?.target_date})</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRecord && (
              <VStack spacing={6} align="stretch">
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="md" mb={2}>生徒の記録</Heading>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Text fontWeight="bold" minW="80px">体調:</Text>
                      <Text>{selectedRecord.physical_score} / 10</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="80px">メンタル:</Text>
                      <Text>{selectedRecord.mental_score} / 10</Text>
                    </HStack>
                    <Box>
                      <Text fontWeight="bold">振り返り:</Text>
                      <Text mt={1} p={2} bg="gray.50" borderRadius="md" whiteSpace="pre-wrap" wordBreak="break-word">{selectedRecord.feedback_text}</Text>
                    </Box>
                  </VStack>
                </Box>

                <Divider />

                <Box>
                  <Heading size="md" mb={2}>担任メモ</Heading>
                  {isMemoLoading
                    ? (
                        <Center><Spinner /></Center>
                      )
                    : (
                        <VStack spacing={4} align="stretch">
                          <Box maxHeight="200px" overflowY="auto" p={2} borderWidth="1px" borderRadius="md">
                            {currentMemos.length > 0
                              ? (
                                  currentMemos.map((memo) => (
                                    <Box key={memo.id} mb={3} borderBottomWidth="1px" pb={2}>
                                      <HStack justifyContent="space-between" mb={1}>
                                        <Text fontSize="sm" fontWeight="bold">{memo.teacher_name || '不明な教員'}</Text>
                                        <Text fontSize="xs" color="gray.500">{memo.created_at.toDate().toLocaleString('ja-JP')}</Text>
                                      </HStack>
                                      <Text wordBreak="break-word" pl={2}>{memo.memo_text}</Text>
                                    </Box>
                                  ))
                                )
                              : (
                                  <Center p={4}><Text color="gray.500">メモはありません。</Text></Center>
                                )}
                          </Box>
                          <FormControl>
                            <Textarea value={newMemoText} onChange={(e) => setNewMemoText(e.target.value)} placeholder="新しいメモを追加..." />
                          </FormControl>
                        </VStack>
                      )}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              閉じる
            </Button>
            <Button colorScheme="blue" onClick={handleSaveMemo} disabled={!newMemoText.trim() || isMemoLoading}>
              メモを保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  )
}
