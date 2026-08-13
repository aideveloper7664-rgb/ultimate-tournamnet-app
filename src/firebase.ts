import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  equalTo,
  onValue,
  runTransaction,
  off,
  limitToLast,
  serverTimestamp,
  limitToFirst,
  onChildAdded
} from 'firebase/database';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
} from 'firebase/auth';

import firebaseAppletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  ...firebaseAppletConfig
};

export const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '5a9a4df0c64cde49735902ccdc60b7af';

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        indexedDBLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence
      ],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch (e) {
    return getAuth(app);
  }
})();

export async function uploadImageToImgBB(file: File): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error("ImgBB API Key is not configured.");
  }
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (result.success) {
    return result.data.url;
  } else {
    throw new Error(result.error?.message || 'Failed to upload image.');
  }
}

export async function recordTransaction(
  userId: string,
  type: string,
  amount: number,
  description: string,
  details: Record<string, any> = {}
) {
  if (!userId) return;
  const transactionRef = ref(db, `transactions/${userId}`);
  const newTransaction = {
    type,
    amount,
    description,
    timestamp: serverTimestamp(),
    ...details
  };
  try {
    await push(transactionRef, newTransaction);
    console.log(`Transaction recorded: ${type}, Amount: ${amount}`);
  } catch (e) {
    console.error("Transaction record failed:", e);
  }
}

export {
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  equalTo,
  onValue,
  runTransaction,
  off,
  limitToLast,
  serverTimestamp,
  limitToFirst,
  onChildAdded,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
};
