import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId
};

const app = initializeApp(firebaseConfig);

const firestoreDatabaseId = (firebaseConfigJson as any).firestoreDatabaseId;
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);

  console.error('Firestore Raw Error:', error);

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error Summary:', JSON.stringify(errInfo));

  if (errMessage.toLowerCase().includes('offline') || errMessage.toLowerCase().includes('api-key')) {
    console.error("HINT: This usually means the Firebase project isn't reachable. Check Project ID and API Key.");
  }

  throw new Error(JSON.stringify(errInfo));
}

export { OperationType };

// Connection heartbeat — deferred so it never blocks app startup / first paint.
// (Previously ran eagerly at module load and forced a network round-trip on every boot.)
if (typeof window !== 'undefined') {
  const runHeartbeat = () => {
    getDocFromServer(doc(db, '_connection_test_', 'test')).catch(err => {
      const msg = (err.message || '').toLowerCase();
      // permission-denied on the test path is expected and means the connection is fine
      if (!msg.includes('permission-denied') && !msg.includes('missing or insufficient permissions')) {
        console.warn("Firestore heartbeat failed:", err.message);
      }
    });
  };
  // Use idle callback when available, otherwise a short timeout, so it runs after the UI is interactive.
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runHeartbeat, { timeout: 3000 });
  } else {
    setTimeout(runHeartbeat, 1500);
  }
}
