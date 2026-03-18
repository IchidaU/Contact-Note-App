import { HttpsError, onCall } from 'firebase-functions/https'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

admin.initializeApp()
const db = admin.firestore()

const updateCustomClaims =async (userId: string) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            logger.info(`User ${userId} does not exist`)
            return admin.auth().setCustomUserClaims(userId, null)
        }

        const userData = userDoc.data()

        if (!userData) {
            logger.warn(`User doc ${userId} exists but data is undefined`)
            return
        }

        const roleId = userData?.role_id
        const claims: { [key: string]: any } = { role: roleId }
        
        if (roleId === 1) {
            const profileDoc = await db.collection('student_profiles').doc(userId).get()
            if (profileDoc.exists) {
                const profileData = profileDoc.data()
                if (profileData) {
                    claims.grade = profileData.grade_id
                    claims.class = profileData.class_id
                }
            }
        } else if (roleId === 2) {
            const profileDoc = await db.collection('teacher_profiles').doc(userId).get()
            if (profileDoc.exists) {
                const profileData = profileDoc.data()
                if (profileData) {
                    claims.grade = profileData.grade_id
                    claims.class = profileData.class_id
                }
            }
        } else if (roleId === 3) {
            const profileDoc = await db.collection('teacher_profiles').doc(userId).get()
            if (profileDoc.exists) {
                const profileData = profileDoc.data()
                if (profileData) {
                    claims.grade = profileData.grade_id
                }
            }
        }
        await admin.auth().setCustomUserClaims(userId, claims)
        logger.info(`Custom claims updated for user ${userId}`, claims)
    } catch (error) {
        logger.error(`Error updating custom claims for user ${userId}: ${error}`)
    }
}

export const onUserChange = onDocumentWritten(
    {
        region: 'asia-northeast1',
        document: 'users/{userId}',
    },
    async (event) => {
        const userId = event.params.userId
        await updateCustomClaims(userId)

        try {
            if (!event.data || !event.data.after.exists) {
                logger.info(`User ${userId} deleted or data missing, skipping name sync`)
                return
            }

            const userData = event.data.after.data()

            if (!userData || userData.role_id !== 1) {
                logger.info(`User ${userId} is not a student, skipping name sync`)
                return
            }

            const newName = userData.name

            const oldName = event.data.before.exists ? event.data.before.data()?.name : undefined

            if (oldName === newName) {
                logger.info(`User ${userId} name unchanged, skipping name sync`)
            }

            const studentProfileRef = db.collection('student_profiles').doc(userId)
            const studentProfileDoc = await studentProfileRef.get()

            if (studentProfileDoc.exists) {
                await studentProfileRef.set({ name: newName }, { merge: true })
                logger.info(`Synced name for student ${userId} to ${newName}`)
            }
        } catch (error) {
            logger.error(`Error syncing name for student ${userId}: ${error}`)
        }
    }
)

export const onStudentProfileChange = onDocumentWritten(
    {
        region: 'asia-northeast1',
        document: 'student_profiles/{userId}',
    },
    async (event) => {
        const userId = event.params.userId
        await updateCustomClaims(userId)
    }
)

export const onTeacherProfileChange = onDocumentWritten(
    {
        region: 'asia-northeast1',
        document: 'teacher_profiles/{userId}',
    },
    async (event) => {
        const userId = event.params.userId
        await updateCustomClaims(userId)
    }
)

export const createUser = onCall({ region: 'asia-northeast1'}, async (request) => {
    logger.info('--- createUser function triggered ---', { structuredData: true })

    if (!request.auth) {
        logger.warn('Unauthenticated call to createUser',)
        throw new HttpsError(
            "unauthenticated",
            "この機能を利用するには認証が必要です",
        )
    }

    const callerUid = request.auth.uid
    logger.info(`Caller UID: ${callerUid}`)

    const userDocRef = db.collection('users').doc(callerUid)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
        logger.error('User does not exist')
        throw new HttpsError(
            "not-found",
            "ユーザー情報が見つかりません",
        )
    }

    const userData = userDoc.data()
    const userRoleId = userData?.role_id
    logger.info(`User role ID: ${userRoleId} (type: ${typeof userRoleId})`)

    if (userRoleId !== 99) {
        logger.error(`Permission denied. User role_id is "${userRoleId}"`)
        throw new HttpsError(
            "permission-denied",
            "この操作を実行する権限がありません",
        )
    }

    logger.info('Admin permission check passed')

    const { name, email, password, role_id, class_id, grade_id } = request.data

    if (!name || !email || !password || !role_id) {
        throw new HttpsError(
            "invalid-argument",
            "全ての必須項目を入力してください",
        )
    }

    let userRecord: admin.auth.UserRecord | undefined

    try {
        userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        })

        const roleIdNumber = parseInt(role_id, 10)

        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            role_id: roleIdNumber,
        })

        if (roleIdNumber === 1) {
            if (!class_id) {
                await admin.auth().deleteUser(userRecord.uid)
                throw new HttpsError(
                    "invalid-argument",
                    "生徒にはクラスの割り当てが必要です",
                )
            }

            const classDocRef = db.collection('classes').doc(class_id)
            const classDoc = await classDocRef.get()
            const classData = classDoc.data()
            if (!classDoc.exists || !classData?.grade_id) {
                logger.error(`Class document ${class_id} not found or has no grade_id`)
                await admin.auth().deleteUser(userRecord.uid)
                throw new HttpsError("not-found", "割り当てられた学年情報が見つかりません")
            }
            const studentGradeId = classDoc.data()?.grade_id

            await db.collection('student_profiles').doc(userRecord.uid).set({
                user_id: userRecord.uid,
                name: name,
                class_id: class_id,
                grade_id: studentGradeId,
                status: "在籍中",
                is_flagged: false,
            })
        } else if (roleIdNumber ===2) {
            if (!class_id) {
                await admin.auth().deleteUser(userRecord.uid)
                throw new HttpsError(
                    "invalid-argument",
                    "担任にはクラスの割り当てが必要です",
                )
            }

            const classDocRef = db.collection('classes').doc(class_id)
            const classDoc = await classDocRef.get()
            const classData = classDoc.data()
            if (!classDoc.exists || !classData?.grade_id) {
                logger.error(`Class document ${class_id} not found or has no grade_id`)
                await admin.auth().deleteUser(userRecord.uid)
                throw new HttpsError("not-found", "割り当てられた学年情報が見つかりません")
            }
            const teacherGradeId = classDoc.data()?.grade_id
            await db.collection('teacher_profiles').doc(userRecord.uid).set({
                user_id: userRecord.uid,
                class_id: class_id,
                grade_id: teacherGradeId,
            })
        } else if (roleIdNumber === 3) {
            if (!grade_id) {
                await admin.auth().deleteUser(userRecord.uid)
                throw new HttpsError(
                    "invalid-argument",
                    "学年主任には担当学年の割り当てが必要です",
                )
            }
            await db.collection('teacher_profiles').doc(userRecord.uid).set({
                user_id: userRecord.uid,
                grade_id: parseInt(grade_id, 10),
            })
        }

        await updateCustomClaims(userRecord.uid)

        return { result: `${name}さんのアカウントを作成しました` }
        } catch (error: unknown) {
            logger.error("Error creating user:", error)
            if (userRecord) {
                const uidToDelete = userRecord.uid
                logger.info(`Attempting to rollback user: ${uidToDelete}`)
                await admin.auth().deleteUser(uidToDelete).catch((deleteUser) => {
                    logger.error(`Failed to rollback user: ${uidToDelete}`, deleteUser)
                })
            }
            if (error && typeof error === "object" && "code" in error) {
                const firebaseError = error as { code: string; message: string }
                if (firebaseError.code === "auth/email-already-exists") {
                    throw new HttpsError(
                        "already-exists",
                        "このメールアドレスは既に登録されています",
                    )
                }
                if (firebaseError.code && typeof firebaseError.code === "string" && firebaseError.code.startsWith("auth/")) {
                    throw new HttpsError("internal", firebaseError.message)
                }
            }
            throw new HttpsError(
                "internal",
                "アカウントの作成中にエラーが発生しました",
            )
        }
})
