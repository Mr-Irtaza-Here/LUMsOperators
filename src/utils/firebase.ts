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
  try {
    // 1️⃣ Check if UID exists in AsyncStorage
    const storedUid = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedUid) {
      console.log("🔑 Using stored UID:", storedUid);
      // Wait for onAuthStateChanged to confirm user object
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        });
      });
    }

    // 2️⃣ No UID → Sign in anonymously
    const credential = await signInAnonymously(auth);
    console.log("🔥 Anonymous login OK, UID:", credential.user.uid);

    // 3️⃣ Save UID in AsyncStorage
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
