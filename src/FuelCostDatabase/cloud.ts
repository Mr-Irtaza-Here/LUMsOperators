// src/FuelCostDatabase/cloud.ts
// Cloud sync for single shared fuel cost value
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ensureSignedIn, db as firestoreDB } from "./firebase";
import {
  getFuelCostSetting,
  getUnsyncedFuelCost,
  markFuelCostAsSynced,
  setFuelCostValue
} from "./local";

// Document reference for the global fuel cost setting
const FUEL_COST_DOC_ID = "global_fuel_cost";
const fuelCostDocRef = doc(firestoreDB, "fuel_settings", FUEL_COST_DOC_ID);

// Sync local fuel cost to Firestore
export const syncFuelCostToCloud = async (): Promise<void> => {
  try {
    await ensureSignedIn();
    const unsynced = await getUnsyncedFuelCost();

    if (!unsynced || unsynced.id == null) {
      console.log("No unsynced fuel cost to push");
      return;
    }

    console.log(`Syncing fuel cost ${unsynced.cost} to cloud...`);

    await setDoc(fuelCostDocRef, {
      cost: unsynced.cost,
      updatedAt: unsynced.updatedAt || new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });

    const ok = await markFuelCostAsSynced(unsynced.id, FUEL_COST_DOC_ID);
    if (ok) {
      console.log("✅ Fuel cost synced to Firestore");
    } else {
      console.warn("Failed to mark fuel cost as synced locally");
    }
  } catch (err) {
    console.error("❌ Failed to sync fuel cost to Firestore:", err);
  }
};

// Listen to Firestore fuel cost changes
export const listenToFuelCostChanges = (callback: (cost: number | null) => void) => {
  return onSnapshot(
    fuelCostDocRef,
    async (snap) => {
      if (!snap.exists()) {
        console.log("No fuel cost document in Firestore yet");
        callback(null);
        return;
      }

      const data = snap.data();
      const cloudCost = data?.cost;
      const cloudUpdatedAt = data?.updatedAt || "";

      if (cloudCost != null) {
        // Check if cloud data is newer than local
        const localSetting = await getFuelCostSetting();

        // Only update local if cloud is different and potentially newer
        // Or if local doesn't exist
        if (!localSetting || localSetting.cost !== cloudCost) {
          const localUpdatedAt = localSetting?.updatedAt || "";

          // If local has unsynced changes, prefer local (it will be pushed later)
          if (localSetting && localSetting.synced === 0) {
            console.log("Local has unsynced changes, skipping cloud update");
            return;
          }

          // Cloud is the source of truth for synced data
          console.log(`Updating local fuel cost from cloud: ${cloudCost}`);
          await setFuelCostValue(cloudCost, 1); // Mark as synced since it came from cloud
          callback(cloudCost);
        }
      }
    },
    (err) => {
      console.error("Fuel cost Firestore listener error:", err);
      if (err && (err.code === "permission-denied" || err.code === "failed-precondition")) {
        console.warn(
          "Firestore permission denied. Verify Firestore rules allow reading 'fuel_settings' and ensure Anonymous Auth is enabled."
        );
      }
    }
  );
};

// Start the fuel cost listener with a callback for UI updates
export const startFuelCostListener = (onCostUpdate?: (cost: number | null) => void) => {
  return (async () => {
    try {
      await ensureSignedIn();
      console.log("Starting fuel cost Firestore listener...");
    } catch (e) {
      console.warn("Fuel cost listener: ensureSignedIn failed", e);
    }

    return listenToFuelCostChanges((cost) => {
      onCostUpdate?.(cost);
    });
  })();
};
