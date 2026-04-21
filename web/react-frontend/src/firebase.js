import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB_llZVWJXVRURYXAHcA-9fZgBJzYa7ekA",
  authDomain: "wsgames-cfa61.firebaseapp.com",
  projectId: "wsgames-cfa61",
  storageBucket: "wsgames-cfa61.firebasestorage.app",
  messagingSenderId: "391350815192",
  appId: "1:391350815192:web:19b27ba4c43c6d67fecaad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getFirebaseToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken(true); // force refresh
  }
  return null;
};
