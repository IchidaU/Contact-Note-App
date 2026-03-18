import type { User } from 'firebase/auth'
import type { Timestamp } from 'firebase/firestore'

export type RecordData = {
  id: string
  target_date: string
  physical_score: number
  mental_score: number
  is_read: boolean
  feedback_text: string
  memoCount?: number
  class_id: string
  grade_id: number
  student_profile_id: string
  created_at: Timestamp
}

export type StudentData = {
  id: string
  name: string
  isSubmitted: boolean
  physical_score?: number
  mental_score?: number
}

export type MemoData = {
  id: string
  record_id: string
  teacher_user_id: string
  teacher_name?: string
  memo_text: string
  created_at: Timestamp
}

export type CreateUserResult = {
  result: string
}

export type ChartData = {
  date: string
  体調: number
  メンタル: number
}

export type FlaggedStudentData = {
  id: string
  name: string
  className: string
  classId: string
  gradeName: string
}

export type AuthContextType = {
  currentUser: User | null
  role: number | null
  isLoading: boolean
  error: string | null
}
