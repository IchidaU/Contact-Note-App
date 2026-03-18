import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { signOut } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable, type HttpsCallableResult } from 'firebase/functions'
import z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Alert, AlertIcon, Box, Button, Center, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Select, Spinner, useToast, VStack } from '@chakra-ui/react'

import { auth, dbPromise, functions } from '../firebase'
import type { CreateUserResult } from '../types'

const userCreationSchema = z.object({
  name: z.string().trim().min(1, { error: '名前は必須です' }),
  email: z.email({ error: '正しいメールアドレスを入力してください' }),
  password: z.string().min(6, { error: 'パスワードは6文字以上で入力してください' }),
  role_id: z.string(),
  class_id: z.string().optional(),
  grade_id: z.string().optional(),
})
  .refine((data) => data.role_id !== '', {
    error: '役割を選択してください',
    path: ['role_id'],
  })
  .refine((data) => {
    if ((data.role_id === '1' || data.role_id === '2') && (!data.class_id || data.class_id === '')) {
      return false
    }
    return true
  }, {
    error: '生徒または担任にはクラスの割り当てが必要です',
    path: ['class_id'],
  })
  .refine((data) => {
    if (data.role_id === '3' && (!data.grade_id || data.grade_id === '')) {
      return false
    }
    return true
  }, {
    error: '学年主任には学年の割り当てが必要です',
    path: ['grade_id'],
  })

type UserCreationInputs = z.infer<typeof userCreationSchema>

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [roles, setRoles] = useState<{ id: string, name: string }[]>([])
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([])
  const [grades, setGrades] = useState<{ id: string, name: string }[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    reset,
    // watch,
    control,
  } = useForm<UserCreationInputs>({
    resolver: zodResolver(userCreationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: '',
      class_id: '',
      grade_id: '',
    },
    mode: 'onSubmit',
  })

  const roleId = useWatch({
    control,
    name: 'role_id',
    defaultValue: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await dbPromise
        const rolesSnapshot = await getDocs(collection(db, 'roles'))
        const rolesData = rolesSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
        setRoles(rolesData)

        const gradesSnapshot = await getDocs(collection(db, 'grades'))
        const gradesData = gradesSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
        gradesData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        setGrades(gradesData)

        const gradeMap = new Map()
        gradesData.forEach((grade) => {
          gradeMap.set(grade.id, grade.name)
          gradeMap.set(Number(grade.id), grade.name)
        })

        const classesSnapshot = await getDocs(collection(db, 'classes'))
        const classesData = classesSnapshot.docs.map((classDoc) => {
          const classData = classDoc.data()
          const gradeName = gradeMap.get(classData.grade_id.toString()) || ''
          const className = `${gradeName} ${classData.name}`
          return {
            id: classDoc.id,
            name: className,
          }
        })
        classesData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        setClasses(classesData)
      }
      catch (error) {
        console.error('Failed to fetch initial data:', error)

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
          setError('ブラウザのセキュリティ設定（サードパーティCookieのブロックなど）により、データの読み込みがブロックされました。設定を見直すか、別のブラウザをお試しください。')
        }
        toast({
          title: 'データの取得に失敗しました',
          description: error instanceof Error ? error.message : '不明なエラー',
          status: 'error',
          duration: 9000,
          isClosable: true,
        })
      }
      finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    }
    catch (error) {
      console.error('ログアウトエラー', error)
    }
  }

  const onSubmit = async (data: UserCreationInputs) => {
    try {
      const createUserFunc = httpsCallable(functions, 'createUser')
      const result = await createUserFunc(data) as HttpsCallableResult<CreateUserResult>
      reset()
      toast({
        title: result.data.result,
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      })
    }
    catch (error: unknown) {
      console.error('User creation error:', error)
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const firebaseError = error as { code: string }
        if (firebaseError.code === 'functions/already-exists') {
          toast({
            title: 'ユーザーの作成に失敗しました',
            description: 'このメールアドレスは既に登録されています',
            status: 'error',
            duration: 9000,
            isClosable: true,
            position: 'top',
          })
          return
        }
      }
      toast({
        title: 'ユーザーの作成に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top',
      })
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
    <Box p={8} maxW="container.lg" mx="auto">
      <HStack justifyContent="space-between" mb={8}>
        <Heading as="h1" size="xl">
          管理者画面
        </Heading>
        <Button onClick={handleLogout} colorScheme="red">ログアウト</Button>
      </HStack>

      {error && <Alert status="error"><AlertIcon />{error}</Alert>}

      <Box p={6} borderWidth="1px" borderRadius="lg">
        <Heading size="lg" mb={6}>新規ユーザー作成</Heading>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel>氏名</FormLabel>
              <Input {...register('name')} />
              <FormErrorMessage>{errors.name && String(errors.name.message)}</FormErrorMessage>
            </FormControl>
            <FormControl isRequired isInvalid={!!errors.email}>
              <FormLabel>メールアドレス</FormLabel>
              <Input type="email" {...register('email')} />
              <FormErrorMessage>{errors.email && String(errors.email.message)}</FormErrorMessage>
            </FormControl>
            <FormControl isRequired isInvalid={!!errors.password}>
              <FormLabel>初期パスワード</FormLabel>
              <Input type="password" {...register('password')} />
              <FormErrorMessage>{errors.password && String(errors.password.message)}</FormErrorMessage>
            </FormControl>
            <FormControl isRequired isInvalid={!!errors.role_id}>
              <FormLabel>役割</FormLabel>
              <Controller
                name="role_id"
                control={control}
                render={({ field }) => (
                  <Select placeholder="役割を選択" {...field}>
                    {roles.filter((role) => role.id !== '99').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
              <FormErrorMessage>{errors.role_id && String(errors.role_id.message)}</FormErrorMessage>
            </FormControl>
            {(roleId === '1' || roleId === '2') && (
              <FormControl isRequired isInvalid={!!errors.class_id}>
                <FormLabel>クラス</FormLabel>
                <Controller
                  name="class_id"
                  control={control}
                  render={({ field }) => (
                    <Select placeholder="クラスを選択" {...field}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                <FormErrorMessage>{errors.class_id && String(errors.class_id.message)}</FormErrorMessage>
              </FormControl>
            )}
            {roleId === '3' && (
              <FormControl isRequired isInvalid={!!errors.grade_id}>
                <FormLabel>学年</FormLabel>
                <Controller
                  name="grade_id"
                  control={control}
                  render={({ field }) => (
                    <Select placeholder="学年を選択" {...field}>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                <FormErrorMessage>{errors.grade_id && String(errors.grade_id.message)}</FormErrorMessage>
              </FormControl>
            )}
            <Button mt={4} colorScheme="teal" type="submit" isLoading={isSubmitting}>ユーザーを作成</Button>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
