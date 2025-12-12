//This is FireBase.ts
// src/utils/firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8CKlTTMEdhRpqFVNQwq0eI8lvarD4JHc",
  authDomain: "engineerexpensesapp.firebaseapp.com",
  projectId: "engineerexpensesapp",
  storageBucket: "engineerexpensesapp.firebasestorage.app",
  messagingSenderId: "445309183998",
  appId: "1:445309183998:web:d99785fd6b3d924ba482af",
  measurementId: "G-LH2SWWSRJJ",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const STORAGE_KEY = "@firebase_anon_uid";

// ----------------------
// Manual Persistence Logic
// ----------------------
export const ensureSignedIn = async (): Promise<User> => {
  // Return immediately if already signed in - no delay needed
  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    // Check AsyncStorage for stored UID
    const storedUid = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedUid) {
      console.log("🔑 Using stored UID:", storedUid);
    }

    // Sign in anonymously
    const credential = await signInAnonymously(auth);
    console.log("🔥 Anonymous login OK, UID:", credential.user.uid);

    // Save UID in AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, credential.user.uid);

    return credential.user;

  } catch (e) {
    console.error("❌ Firebase auth failed", e);
    throw e;
  }
};

// ----------------------
// Optional: Listen to Auth Changes
// ----------------------
onAuthStateChanged(auth, (user) => {
  if (user) console.log("🔐 Firebase user:", user.uid);
});

