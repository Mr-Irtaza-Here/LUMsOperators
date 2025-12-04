//This is CloudDB.ts
// src/utils/CloudDB.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db as firestoreDB } from "./firebase";
 // <-- your Firebase config
import { LocalExpense } from "./LocalDB";

const engineersRef = collection(firestoreDB, "engineers");

export const listenToEngineerChanges = (callback:any) => {
  // fallback to updatedAt if serverUpdatedAt missing
  const q = query(engineersRef); // remove orderBy for now

  return onSnapshot(q, (snap) => {
    const changes:any[] = [];

    snap.docChanges().forEach((c) => {
      changes.push({
        type: c.type,
        id: c.doc.id,
        data: c.doc.data(),
      });
    });

    callback(changes);
  });
};

// Firestore collection reference
const expensesRef = collection(firestoreDB, "expenses");

// -----------------------------------------
// UPLOAD NEW EXPENSE TO CLOUD (CREATE)
// -----------------------------------------
export const uploadExpenseToCloud = async (exp: LocalExpense): Promise<string> => {
  const docRef = await addDoc(expensesRef, {
    cloudId: exp.cloudId || null,
    engName: exp.engName,
    date: exp.date,
    cost: exp.cost,
    category: exp.category,
    type: exp.type,
    client: exp.client,
    status: exp.status,
    bikeNo: exp.bikeNo,
    description: exp.description,
    starting: exp.starting,
    ending: exp.ending,
    distance: exp.distance,
    fuelCost: exp.fuelCost,
    startTime: exp.startTime,
    endTime: exp.endTime,
    timeConsumed: exp.timeConsumed,
    deleted: exp.deleted,
    updatedAt: exp.updatedAt, // local timestamp
    serverUpdatedAt: serverTimestamp(), // cloud timestamp
  });

  return docRef.id;
};

// -----------------------------------------
// UPDATE EXISTING EXPENSE IN CLOUD
// -----------------------------------------
export const updateExpenseInCloud = async (cloudId: string, exp: LocalExpense) => {
  const ref = doc(firestoreDB, "expenses", cloudId);

  await updateDoc(ref, {
    engName: exp.engName,
    date: exp.date,
    cost: exp.cost,
    category: exp.category,
    type: exp.type,
    client: exp.client,
    status: exp.status,
    bikeNo: exp.bikeNo,
    description: exp.description,
    starting: exp.starting,
    ending: exp.ending,
    distance: exp.distance,
    fuelCost: exp.fuelCost,
    startTime: exp.startTime,
    endTime: exp.endTime,
    timeConsumed: exp.timeConsumed,
    deleted: exp.deleted,
    updatedAt: exp.updatedAt,
    serverUpdatedAt: serverTimestamp(),
  });
};

// -----------------------------------------
// DELETE EXPENSE IN CLOUD (SOFT DELETE)
// -----------------------------------------
export const deleteExpenseInCloud = async (cloudId: string) => {
  const ref = doc(firestoreDB, "expenses", cloudId);

  await updateDoc(ref, {
    deleted: 1,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
};

// -----------------------------------------
// LISTEN FOR REAL-TIME CLOUD CHANGES
// -----------------------------------------
export const listenToCloudChanges = (
  callback: (changes: any[]) => void
) => {
  const q = query(expensesRef, orderBy("serverUpdatedAt"));

  return onSnapshot(q, (snapshot) => {
    const changes: any[] = [];

    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const cloudId = change.doc.id;

      changes.push({
        type: change.type, // added, modified, removed
        cloudId,
        data,
      });
    });

    callback(changes);
  });
};

// -----------------------------------------
// FETCH ONE DOCUMENT FROM CLOUD
// -----------------------------------------
export const getCloudExpense = async (cloudId: string) => {
  const ref = doc(firestoreDB, "expenses", cloudId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    cloudId: snap.id,
    ...snap.data(),
  };
};
