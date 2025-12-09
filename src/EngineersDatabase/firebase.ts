// src/EngineersDatabase/firebase.ts
// Template initializer for a SECOND Firebase project dedicated to engineers.
// Steps for you:
// 1. Create a new Firebase project in the console and enable Firestore + Authentication (anonymous sign-in).
// 2. In the Firebase project settings, register a web app and copy the config object.
// 3. Paste the config below into the `firebaseConfig` constant.

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config for EngineersNameList project
const firebaseConfig = {
  apiKey: "AIzaSyCJIAnyOT4Rr8uPBhyCo5cNIBJwf1SdLxc",
  authDomain: "engineersnamelist.firebaseapp.com",
  projectId: "engineersnamelist",
  storageBucket: "engineersnamelist.firebasestorage.app",
  messagingSenderId: "459260116000",
  appId: "1:459260116000:web:26fc51e319ff9c88559045"
};

const app = initializeApp(firebaseConfig, "EngineersProject");
export const db = getFirestore(app);
export const auth = getAuth(app);

const STORAGE_KEY = "@eng_firebase_anon_uid";

export const ensureSignedIn = async (): Promise<User> => {
  try {
    // No storage access in web-native code path here; you can add AsyncStorage if needed.
    return new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      });

      // fallback: sign in anonymously if not signed in in a short timeout
      setTimeout(async () => {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (err) {
          reject(err);
        }
      }, 500);
    });
  } catch (e) {
    console.error("EngineersProject Firebase auth failed", e);
    throw e;
  }
};
