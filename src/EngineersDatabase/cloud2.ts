// This is cloud2.ts
// src/EngineersDatabase/cloud2.ts
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, ensureSignedIn, db as firestoreDB } from "./firebase";
import {
  addEngineerToDB,
  findEngineerByName,
  getAllEngineers,
  getUnsyncedEngineers,
  LocalEngineer,
  markEngineerAsDeleted,
  markEngineerAsSynced,
} from "./local";

// Listen to engineers collection changes in Firestore
const engineersRef = collection(firestoreDB, "engineers");

export const listenToEngineerChanges = (callback: any) => {
  const q = query(engineersRef);

  return onSnapshot(
    q,
    (snap) => {
      const changes: any[] = [];

      snap.docChanges().forEach((c) => {
        changes.push({
          type: c.type,
          id: c.doc.id,
          data: c.doc.data(),
        });
      });

      callback(changes);
    },
    (err: any) => {
      console.error("Engineers collection snapshot error:", err);
      if (err && (err.code === "permission-denied" || err.code === "failed-precondition")) {
        console.warn(
          "Firestore permission denied. Verify Firestore rules allow this client to read 'engineers' and ensure Anonymous Auth is enabled for the Engineers project."
        );
      }
    }
  );
};

export const syncEngineersToCloud = async (): Promise<void> => {
  try {
    await ensureSignedIn();

    const unsynced = await getUnsyncedEngineers();
    console.log("Unsynced engineers:", unsynced);

    for (const eng of unsynced) {
      try {
        console.log(`syncEngineersToCloud: syncing id=${eng.id} name=${eng.engName}`);
        const docRef = doc(firestoreDB, "engineers", eng.engName);

        await setDoc(docRef, {
          engName: eng.engName,
          deleted: eng.deleted || 0,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });

        const ok = await markEngineerAsSynced(eng.id!, docRef.id);
        console.log(`syncEngineersToCloud: marked id=${eng.id} synced=${ok}`);
        if (!ok) {
          console.warn(`syncEngineersToCloud: verification failed for id=${eng.id}`);
        }
      } catch (err: any) {
        console.warn(`syncEngineersToCloud: failed to sync id=${eng.id} name=${eng.engName}:`, err);
      }
    }

    console.log("✅ Engineers synced to Engineers Firestore");
  } catch (err: any) {
    console.error("❌ Failed to sync engineers to Engineers project:", err);
  }
};

export const markEngineerAsDeletedByName = async (name: string) => {
  const engineers = await getAllEngineers();
  const eng = engineers.find((e: LocalEngineer) => e.engName === name);
  if (eng && eng.id != null) {
    await markEngineerAsDeleted(eng.id);
  }
};

export const startEngineerListener = (onLocalUpdate?: () => void) => {
  return (async () => {
    try {
      await ensureSignedIn();
      console.log("Engineers Firebase signed-in user:", auth.currentUser?.uid ?? null);
    } catch (e) {
      console.warn("Engineers listener: ensureSignedIn failed", e);
    }

    return listenToEngineerChanges(async (changes: any[]) => {
      for (const ch of changes) {
        const data = ch.data;
        const name = (data.engName || data.name || "").toString();
        if (!name) continue;

        try {
          // If remote marks deleted === 1, apply deletion locally.
          if (data.deleted === 1) {
            await markEngineerAsDeletedByName(name);
            continue;
          }

          // Remote indicates not-deleted. Check local state to avoid accidental undeletion.
          const local = await findEngineerByName(name as string);
          if (local && local.deleted === 1) {
            // Local has been deleted. Re-enforce deletion in cloud to avoid flip-flop.
            try {
              const docRef = doc(firestoreDB, "engineers", name);
              await setDoc(docRef, {
                engName: name,
                deleted: 1,
                updatedAt: new Date().toISOString(),
                serverUpdatedAt: serverTimestamp(),
              }, { merge: true });
              console.log(`Re-enforced deletion in cloud for ${name} because local row is deleted`);
            } catch (writeErr) {
              console.warn(`Failed to re-enforce deletion for ${name}:`, writeErr);
            }
            continue;
          }

          // Otherwise, ensure the engineer exists locally (add or undelete)
          await addEngineerToDB(name);
        } catch (err: any) {
          console.warn(`Error processing engineer "${name}":`, err);
        }
      }

      onLocalUpdate?.();
    });
  })();
};
