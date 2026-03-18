import { Box, Button, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Slider, SliderFilledTrack, SliderMark, SliderThumb, SliderTrack, Text, Textarea, useToast, VStack } from '@chakra-ui/react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { auth, dbPromise } from '../firebase'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const recordSchema = z.object({
  target_date: z.string().trim().min(1, { error: '日付は必須です' }),
  physical_score: z.number().min(0).max(10),
  mental_score: z.number().min(0).max(10),
  feedback_text: z.string()
    .trim().min(1, { error: '振り返り内容は必須です' })
    .max(1000, { error: '1000文字以内で入力してください' }),
})

type RecordFormInputs = z.infer<typeof recordSchema>

export const RecordEntryPage = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormInputs>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      target_date: new Date().toISOString().split('T')[0],
      physical_score: 5,
      mental_score: 5,
      feedback_text: '',
    },
  })

  const onSubmit = async (values: RecordFormInputs) => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast({ title: 'ログインしていません', status: 'error', duration: 5000, isClosable: true })
      return
    }

    try {
      const db = await dbPromise
      const studentProfileRef = doc(db, 'student_profiles', currentUser.uid)
      const studentProfileSnap = await getDoc(studentProfileRef)
      if (!studentProfileSnap.exists()) throw new Error('生徒情報が見つかりません')

      const studentData = studentProfileSnap.data()
      const classId = studentData.class_id
      const gradeId = studentData.grade_id

      if (!classId || !gradeId) {
        throw new Error('生徒のクラス情報または学年情報が不完全です')
      }

      await addDoc(collection(db, 'records'), {
        student_profile_id: currentUser.uid,
        class_id: classId,
        grade_id: gradeId,
        target_date: values.target_date,
        physical_score: values.physical_score,
        mental_score: values.mental_score,
        feedback_text: values.feedback_text,
        is_read: false,
        created_at: serverTimestamp(),
      })

      toast({
        title: '連絡帳を提出しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate('/student/dashboard')
    }
    catch (error) {
      console.error('Record submission error:', error)
      toast({
        title: '連絡帳の提出に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Box p={8} maxW="container.md" mx="auto">
      <Heading as="h1" size="xl" mb={8}>
        連絡帳の記入
      </Heading>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={6} align="stretch">
          <FormControl isInvalid={!!errors.target_date} isRequired>
            <FormLabel>日付</FormLabel>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              {...register('target_date')}
            />
            <FormErrorMessage>{errors.target_date?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.physical_score} isRequired>
            <Controller
              name="physical_score"
              control={control}
              render={({ field }) => (
                <>
                  <FormLabel>今日の体調</FormLabel>
                  <Slider {...field} min={1} max={10} step={1} pt={6} pb={2}>
                    <SliderMark value={1} mt="1" ml="-2.5" fontSize="sm">
                      1: 悪い
                    </SliderMark>
                    <SliderMark value={5} mt="1" ml="-2.5" fontSize="sm">
                      5: 普通
                    </SliderMark>
                    <SliderMark value={10} mt="1" ml="-4" fontSize="sm" whiteSpace="nowrap">
                      10: 絶好調
                    </SliderMark>
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb boxSize={6}>
                      <Text fontWeight="bold">{field.value}</Text>
                    </SliderThumb>
                  </Slider>
                </>
              )}
            />
          </FormControl>

          <FormControl isInvalid={!!errors.mental_score} isRequired>

            <Controller
              name="mental_score"
              control={control}
              render={({ field }) => (
                <>
                  <FormLabel>今日のメンタル</FormLabel>
                  <Slider {...field} min={1} max={10} step={1} pt={6} pb={2}>
                    <SliderMark value={1} mt="1" ml="-2.5" fontSize="sm">
                      1: 悪い
                    </SliderMark>
                    <SliderMark value={5} mt="1" ml="-2.5" fontSize="sm">
                      5: 普通
                    </SliderMark>
                    <SliderMark value={10} mt="1" ml="-4" fontSize="sm" whiteSpace="nowrap">
                      10: 絶好調
                    </SliderMark>
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb boxSize={6}>
                      <Text fontWeight="bold">{field.value}</Text>
                    </SliderThumb>
                  </Slider>
                </>
              )}
            />
          </FormControl>

          <FormControl isInvalid={!!errors.feedback_text} isRequired>
            <FormLabel>今日の振り返り</FormLabel>
            <Textarea rows={6} {...register('feedback_text')} />
            <FormErrorMessage>{errors.feedback_text?.message}</FormErrorMessage>
          </FormControl>

          <HStack justifyContent="flex-end" spacing={4}>
            <Button variant="ghost" onClick={() => navigate('/student/dashboard')}>キャンセル</Button>
            <Button type="submit" colorScheme="teal" isLoading={isSubmitting}>提出する</Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  )
}
