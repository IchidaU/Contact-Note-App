import { Alert, Box, Button, Center, FormControl, FormErrorMessage, FormLabel, Heading, Input, Spinner, VStack } from '@chakra-ui/react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.email({ error: '正しいメールアドレスを入力してください' }),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
})

type LoginFormInputs = z.infer<typeof loginSchema>

export const LoginPage = () => {
  const [authError, setAuthError] = useState('')
  const navigate = useNavigate()
  const { currentUser, isLoading } = useAuth()

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormInputs) => {
    setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password)
      navigate('/')
    }
    catch (error) {
      setAuthError('メールアドレスまたはパスワードが正しくありません')
      console.error('ログインエラー', error)
    }
  }

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return (
    <Center h="100vh" bg="gray.50">
      <Box p={8} borderWidth={1} borderRadius="lg" bg="white" w="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={6}>
            <Heading as="h1" size="lg" textAlign="center">
              連絡帳アプリ ログイン
            </Heading>

            {authError && (
              <Alert status="error" borderRadius="md">{authError}</Alert>
            )}

            <FormControl isInvalid={!!errors.email} isRequired>
              <FormLabel>メールアドレス</FormLabel>
              <Input type="email" placeholder="user@example.com" {...register('email')} />
              <FormErrorMessage>
                {errors.email && errors.email.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password} isRequired>
              <FormLabel>パスワード</FormLabel>
              <Input type="password" placeholder="********" {...register('password')} />
              <FormErrorMessage>
                {errors.password && String(errors.password.message)}
              </FormErrorMessage>
            </FormControl>

            <Button type="submit" colorScheme="teal" size="lg" width="full" isLoading={isSubmitting}>ログイン</Button>
          </VStack>
        </form>
      </Box>
    </Center>
  )
}
