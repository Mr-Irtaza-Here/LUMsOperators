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
          // Mark as synced after successful cloud update
          await updateLocalExpense(item.id, { ...item, synced: 1 });
        } else {
          const cloudId = await uploadExpenseToCloud(item);
          // Save cloudId AND mark as synced to prevent duplicates
          await updateLocalExpense(item.id, { ...item, cloudId, synced: 1 });
        }
        continue;
      }

      if (!item.cloudId) {
        const cloudId = await uploadExpenseToCloud(item);
        // CRITICAL: Save cloudId to SQLite so duplicate prevention works
        await updateLocalExpense(item.id, { ...item, cloudId, synced: 1 });
      } else {
        await updateExpenseInCloud(item.cloudId, item);
        // Mark as synced after successful cloud update
        await updateLocalExpense(item.id, { ...item, synced: 1 });
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
              // Only update if it doesn't already have a DIFFERENT cloudId
              // (this prevents cross-linking unrelated records)
              if (!contentMatch.cloudId || contentMatch.cloudId === cloudId) {
                console.log(`Linking local record ${contentMatch.id} to cloudId ${cloudId}`);
                await updateLocalExpense(contentMatch.id, { ...cloudRow, synced: 1, cloudId });
              } else {
                // This record already has a different cloudId - it's a different document
                // Only insert if there's no record AT ALL with this cloudId
                console.log(`Record ${contentMatch.id} already has cloudId ${contentMatch.cloudId}, checking for duplicates...`);
                // Double-check there's no existing record with this exact cloudId
                // before inserting (race condition safety)
                const existingWithCloudId = await findLocalByCloudId(cloudId);
                if (!existingWithCloudId) {
                  await addLocalExpense({ ...cloudRow, synced: 1, cloudId });
                }
              }
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
