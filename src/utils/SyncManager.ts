//This is a SynManager.ts
// src/utils/SyncManager.ts
import { serverTimestamp } from "firebase/firestore";
import { listenToEngineerChanges } from "./CloudDB";
import { findLocalDuplicateByFields, getUnsyncedEngineers, markEngineerAsSynced } from "./LocalDB";

import {
  addLocalExpense,
  findLocalByCloudId,
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

import { addEngineerToDB, markEngineerAsDeleted } from "./LocalDB";

export const startEngineerListener = (onLocalUpdate?: () => void) => {
  return listenToEngineerChanges((changes: any[]) => {
    for (const ch of changes) {
      const data = ch.data;
      const name = data.name;
      if (!name) continue;

      if (data.deleted === 1) {
        markEngineerAsDeleted(name, { synced: true });
      } else {
        addEngineerToDB(name, { synced: true });
      }
    }

    // notify caller (UI) to re-query SQLite
    if (onLocalUpdate) {
      try { onLocalUpdate(); } catch(e){ console.warn(e); }
    }
  });
};

// ---------- ENGINEERS SYNC ----------
export const syncEngineersToCloud = async (): Promise<void> => {
  try {
    await ensureSignedIn();

    const unsynced = getUnsyncedEngineers();
    console.log("Unsynced engineers:", unsynced);

    for (const eng of unsynced) {
      const docRef = doc(firestoreDB, "engineers", eng.name);

      if (eng.deleted === 1) {
        await setDoc(docRef, {
          name: eng.name,
          deleted: 1,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });

      } else {
        await setDoc(docRef, {
          name: eng.name,
          deleted: eng.deleted,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });

      }

      markEngineerAsSynced(eng.name);    // mark synced locally
    }

    console.log("✅ Engineers synced to Firestore");

  } catch (err) {
    console.error("❌ Failed to sync engineers:", err);
  }
};

// -----------------------------------------------------------
// PUSH UNSYNCED LOCAL ROWS TO FIRESTORE
// -----------------------------------------------------------
export const pushUnsyncedToCloud = async () => {
  try {
    const unsynced = getUnsynced();

    for (const item of unsynced) {
      if (!item.id) continue;

      // -------------------------
      // CASE 1: SOFT-DELETED ITEM
      // -------------------------
      if (item.deleted === 1) {
        if (item.cloudId) {
          await updateExpenseInCloud(item.cloudId, item);
          markSynced(item.id, item.cloudId);
        } else {
          const cloudId = await uploadExpenseToCloud(item);

          // ⭐ FIX HERE — immediately attach cloudId locally
          markSynced(item.id, cloudId);
        }
        continue;
      }

      // -------------------------
      // CASE 2: CREATE NEW ITEM
      // -------------------------
      if (!item.cloudId) {
        const cloudId = await uploadExpenseToCloud(item);

        // ⭐ FIX HERE — attach cloudId immediately BEFORE listener fires
        markSynced(item.id, cloudId);

      } else {
        // -------------------------
        // CASE 3: UPDATE EXISTING ITEM
        // -------------------------
        await updateExpenseInCloud(item.cloudId, item);
        markSynced(item.id, item.cloudId);
      }
    }

  } catch (err) {
    console.error("pushUnsyncedToCloud ERROR:", err);
  }
};


// -----------------------------------------------------------
// REALTIME FIRESTORE LISTENER → APPLY CLOUD → LOCAL
// -----------------------------------------------------------
export const startRealTimeCloudListener = (onLocalChange?: () => void) => {

  const unsubscribe = listenToCloudChanges(async (changes: any[]) => {
    try {
      for (const ch of changes) {
        const cloudId = ch.cloudId;
        const cloudData = ch.data;

        // Convert Firestore row → LocalExpense shape
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

        // ⭐ CRITICAL: Find existing local row using cloudId
        const local = findLocalByCloudId(cloudId);

        // -------------------------
        // CASE 1: NEW ROW FROM CLOUD
        // -------------------------
        if (!local) {

          // ⭐ NEW — check if this row already exists locally (duplicate protection)
          const possible = findLocalDuplicateByFields(cloudRow);

          if (possible) {
            // ⭐ update instead of inserting (prevent duplicate)
            updateLocalExpense(possible.id!, {
              ...cloudRow,
              synced: 1,
              cloudId,
              updatedAt: cloudRow.updatedAt,
            });
            continue;
          }

          // No duplicate → safe to insert
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

        // -------------------------
        // CASE 2: EXISTS LOCALLY → CHECK TIMESTAMPS
        // -------------------------
        const cloudTs = new Date(cloudRow.updatedAt || "").getTime();
        const localTs = new Date(local.updatedAt || "").getTime();

        if (isNaN(localTs) || isNaN(cloudTs) || cloudTs > localTs) {

          // handle delete
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
