// src/FuelCostDatabase/firebase.ts
// Uses the EngineersNameList Firebase project for fuel cost syncing
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config for EngineersNameList project (same as EngineersDatabase)
const firebaseConfig = {
  apiKey: "AIzaSyCJIAnyOT4Rr8uPBhyCo5cNIBJwf1SdLxc",
  authDomain: "engineersnamelist.firebaseapp.com",
  projectId: "engineersnamelist",
  storageBucket: "engineersnamelist.firebasestorage.app",
  messagingSenderId: "459260116000",
  appId: "1:459260116000:web:26fc51e319ff9c88559045"
};

const app = initializeApp(firebaseConfig, "FuelCostProject");
export const db = getFirestore(app);
export const auth = getAuth(app);

export const ensureSignedIn = async (): Promise<User> => {
  try {
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
    console.error("FuelCostProject Firebase auth failed", e);
    throw e;
  }
};
