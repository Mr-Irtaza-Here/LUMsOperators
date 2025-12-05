//This is SyncManager.ts
// src/utils/SyncManager.ts
import { serverTimestamp } from "firebase/firestore";
import { listenToEngineerChanges } from "./CloudDB";
import {
  addEngineerToDB,
  findLocalDuplicateByFields,
  getUnsyncedEngineers,
  LocalEngineer,
  markEngineerAsDeleted,
  markEngineerAsSynced
} from "./LocalDB";

import {
  addLocalExpense,
  findLocalByCloudId,
  getAllEngineers,
  getUnsynced,
  markSynced,
  softDeleteLocal,
  updateLocalExpense
} from "./LocalDB";

import {
  listenToCloudChanges,
  updateExpenseInCloud,
  uploadExpenseToCloud
} from "./CloudDB";

import type { LocalExpense } from "./LocalDB";

import { doc, setDoc } from "firebase/firestore";
import { ensureSignedIn, db as firestoreDB } from "../utils/firebase"; // adjust path

// ---------------- ENGINEER LISTENER ----------------
export const startEngineerListener = (onLocalUpdate?: () => void) => {
  return listenToEngineerChanges((changes: any[]) => {
    for (const ch of changes) {
      const data = ch.data;
      const name = data.name;
      if (!name) continue;

      if (data.deleted === 1) {
        markEngineerAsDeletedByName(name, true); // 🔹 no await
      } else {
        addEngineerToDB(name, true); // 🔹 no await, synced=true
      }
    }

    if (onLocalUpdate) {
      try { onLocalUpdate(); } catch(e){ console.warn(e); }
    }
  });
};


// ---------------- ENGINEERS SYNC ----------------
export const syncEngineersToCloud = async (): Promise<void> => {
  try {
    await ensureSignedIn();

    const unsynced = getUnsyncedEngineers(); // 🔹 no await
    console.log("Unsynced engineers:", unsynced);

    for (const eng of unsynced) {
      const docRef = doc(firestoreDB, "engineers", eng.engName);

      if (eng.deleted === 1) {
        await setDoc(docRef, {
          name: eng.engName,
          deleted: 1,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          name: eng.engName,
          deleted: eng.deleted,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });
      }

      markEngineerAsSynced(eng.id!, docRef.id); // 🔹 synchronous
    }

    console.log("✅ Engineers synced to Firestore");

  } catch (err) {
    console.error("❌ Failed to sync engineers:", err);
  }
};

// ---------------- PUSH UNSYNCED EXPENSES ----------------
export const pushUnsyncedToCloud = async () => {
  try {
    const unsynced = getUnsynced();

    for (const item of unsynced) {
      if (!item.id) continue;

      if (item.deleted === 1) {
        if (item.cloudId) {
          await updateExpenseInCloud(item.cloudId, item);
          markSynced(item.id, item.cloudId);
        } else {
          const cloudId = await uploadExpenseToCloud(item);
          markSynced(item.id, cloudId);
        }
        continue;
      }

      if (!item.cloudId) {
        const cloudId = await uploadExpenseToCloud(item);
        markSynced(item.id, cloudId);
      } else {
        await updateExpenseInCloud(item.cloudId, item);
        markSynced(item.id, item.cloudId);
      }
    }

  } catch (err) {
    console.error("pushUnsyncedToCloud ERROR:", err);
  }
};

// ---------------- REALTIME FIRESTORE LISTENER ----------------
export const startRealTimeCloudListener = (onLocalChange?: () => void) => {
  const unsubscribe = listenToCloudChanges(async (changes: any[]) => {
    try {
      for (const ch of changes) {
        const cloudId = ch.cloudId;
        const cloudData = ch.data;

        const cloudRow: Partial<LocalExpense> = {
          cloudId,
          engName: cloudData.engName,
          date: cloudData.date,
          cost: cloudData.cost,
          category: cloudData.category,
          type: cloudData.type,
          client: cloudData.client,
          status: cloudData.status,
          bikeNo: cloudData.bikeNo,
          description: cloudData.description,
          starting: cloudData.starting,
          ending: cloudData.ending,
          distance: cloudData.distance,
          fuelCost: cloudData.fuelCost,
          startTime: cloudData.startTime,
          endTime: cloudData.endTime,
          timeConsumed: cloudData.timeConsumed,
          deleted: cloudData.deleted,
          updatedAt: cloudData.updatedAt,
          synced: 1,
        };

        const local = findLocalByCloudId(cloudId);

        if (!local) {
          const possible = findLocalDuplicateByFields(cloudRow);

          if (possible) {
            updateLocalExpense(possible.id!, {
              ...cloudRow,
              synced: 1,
              cloudId,
              updatedAt: cloudRow.updatedAt,
            });
            continue;
          }

          if (cloudRow.deleted !== 1) {
            addLocalExpense({
              ...cloudRow,
              synced: 1,
              cloudId,
              updatedAt: cloudRow.updatedAt,
            });
          }
          continue;
        }

        const cloudTs = new Date(cloudRow.updatedAt || "").getTime();
        const localTs = new Date(local.updatedAt || "").getTime();

        if (isNaN(localTs) || isNaN(cloudTs) || cloudTs > localTs) {
          if (cloudRow.deleted === 1) {
            softDeleteLocal(local.id!);
          } else {
            updateLocalExpense(local.id!, {
              ...cloudRow,
              synced: 1,
              updatedAt: cloudRow.updatedAt,
            } as any);
          }
        }
      }

      if (onLocalChange) onLocalChange();

    } catch (err) {
      console.warn("Error applying cloud changes:", err);
    }
  });

  return unsubscribe;
};

// ------------- Helper for EngineerManager fixes -------------
export const markEngineerAsDeletedByName = async (name: string, synced: boolean = false) => {
  const engineers = await getAllEngineers(); // await the promise
  const eng = engineers.find((e: LocalEngineer) => e.engName === name);
  if (eng && eng.id != null) {
    await markEngineerAsDeleted(eng.id); // await deletion
  }
};