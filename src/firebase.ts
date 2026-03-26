import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'default');

export async function fetchFromFirebase(userId: string): Promise<{ mentaculous: Record<string, any> | null; mentorder: string[] | null; updatedAt: string | null }> {
  const docRef = doc(db, 'mentaculous_2026', userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { mentaculous: null, mentorder: null, updatedAt: null };

  const data = snap.data();
  let mentaculous: any = data.mentaculous;
  let mentorder: any = data.mentorder;
  const updatedAt: string | null = data.updatedAt || null;

  if (typeof mentaculous === 'string') {
    try { mentaculous = JSON.parse(mentaculous); } catch { mentaculous = {}; }
  }
  if (typeof mentorder === 'string') {
    try { mentorder = JSON.parse(mentorder); } catch { mentorder = []; }
  }

  return { mentaculous: mentaculous || {}, mentorder: mentorder || [], updatedAt };
}

export async function saveToFirebase(userId: string, mentaculousData: Record<string, any>, orderData: string[]): Promise<void> {
  const docRef = doc(db, 'mentaculous_2026', userId);
  await setDoc(docRef, {
    mentaculous: JSON.stringify(mentaculousData),
    mentorder: JSON.stringify(orderData),
    updatedAt: new Date().toISOString(),
  });
}
