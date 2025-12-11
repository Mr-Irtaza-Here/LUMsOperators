// src/utils/SyncManager.ts

import {
  addLocalExpense,
  findLocalByCloudId,
  findLocalByContent,
  getUnsynced,
  softDeleteLocal,
  updateLocalExpense,
} from "./LocalDB";

import {
  listenToCloudChanges,
  updateExpenseInCloud,
  uploadExpenseToCloud,
} from "./CloudDB";

import type { LocalExpense } from "./LocalDB";

// Engineers syncing/listening moved to src/EngineersDatabase

// ---------------- PUSH UNSYNCED EXPENSES ----------------
export const pushUnsyncedToCloud = async () => {
  try {
    const unsynced = await getUnsynced();

    for (const item of unsynced) {
      if (!item.id) continue;

      if (item.deleted === 1) {
        if (item.cloudId) {
          await updateExpenseInCloud(item.cloudId, item);
        } else {
          const cloudId = await uploadExpenseToCloud(item);
          item.cloudId = cloudId;
        }
        continue;
      }

      if (!item.cloudId) {
        const cloudId = await uploadExpenseToCloud(item);
        item.cloudId = cloudId;
      } else {
        await updateExpenseInCloud(item.cloudId, item);
      }
    }
  } catch (err: any) {
    console.error("pushUnsyncedToCloud ERROR:", err);
  }
};

// ---------------- REALTIME CLOUD LISTENER ----------------
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

        const local = await findLocalByCloudId(cloudId);

        if (!local) {
          if (cloudRow.deleted !== 1) {
            // Check if this might be our own data that just got synced
            // (prevents duplicates when Firestore echoes back our own data)
            const contentMatch = await findLocalByContent(cloudRow);
            if (contentMatch && contentMatch.id) {
              // Update existing local record with cloudId instead of inserting duplicate
              console.log(`Linking local record ${contentMatch.id} to cloudId ${cloudId}`);
              await updateLocalExpense(contentMatch.id, { ...cloudRow, synced: 1, cloudId });
            } else {
              // Genuinely new data from another user - insert it
              await addLocalExpense({ ...cloudRow, synced: 1, cloudId });
            }
          }
          continue;
        }


        const cloudTs = new Date(cloudRow.updatedAt || "").getTime();
        const localTs = new Date(local.updatedAt || "").getTime();

        if (isNaN(localTs) || isNaN(cloudTs) || cloudTs > localTs) {
          if (cloudRow.deleted === 1) {
            await softDeleteLocal(local.id!);
          } else {
            await updateLocalExpense(local.id!, {
              ...cloudRow,
              synced: 1,
              updatedAt: cloudRow.updatedAt,
            });
          }
        }
      }

      onLocalChange?.();
    } catch (err: any) {
      console.warn("Error applying cloud changes:", err);
    }
  });

  return unsubscribe;
};
