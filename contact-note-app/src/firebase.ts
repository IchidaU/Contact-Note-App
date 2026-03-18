import { initializeApp, type FirebaseApp } from 'firebase/app'
import { browserSessionPersistence, initializeAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app: FirebaseApp = initializeApp(firebaseConfig)

export const auth: Auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
})

const initializeDb = async (): Promise<Firestore> => {
  try {
    const firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    })
    console.log('Firestore memoryLocalCache initialized')
    return firestoreDb
  }
  catch (error) {
    console.error('Firestore initialization error:', error)
    if (typeof error === 'object' && error !== null) {
      if ('code' in error && error.code === 'unimplemented') {
        console.warn('memoryLocalCache failed, falling back to in-memory only (no persistence)')
        const fallbackDb = initializeFirestore(app, {})
        return fallbackDb
      }
      if ('message' in error && typeof error.message === 'string' && error.message.includes('insecure')) {
        console.warn('memoryLocalCache failed, falling back to in-memory only (no persistence)')
        const fallbackDb = initializeFirestore(app, {})
        return fallbackDb
      }
    }
    throw error
  }
}
export const dbPromise: Promise<Firestore> = initializeDb()
export const functions: Functions = getFunctions(app, 'asia-northeast1')
