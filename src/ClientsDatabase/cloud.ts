// src/ClientsDatabase/cloud.ts
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, ensureSignedIn, db as firestoreDB } from "../EngineersDatabase/firebase";
import {
  addClientToDB,
  findClientByName,
  getAllClients,
  getUnsyncedClients,
  LocalClient,
  markClientAsDeleted,
  markClientAsSynced,
} from "./local";

const clientsRef = collection(firestoreDB, "clients");

export const listenToClientChanges = (callback: any) => {
  const q = query(clientsRef);

  return onSnapshot(
    q,
    (snap) => {
      const changes: any[] = [];
      snap.docChanges().forEach((c) => {
        changes.push({ type: c.type, id: c.doc.id, data: c.doc.data() });
      });
      callback(changes);
    },
    (err: any) => {
      console.error("Clients collection snapshot error:", err);
      if (err && (err.code === "permission-denied" || err.code === "failed-precondition")) {
        console.warn("Firestore permission denied for clients. Check rules and anonymous auth.");
      }
    }
  );
};

export const syncClientsToCloud = async (): Promise<void> => {
  try {
    await ensureSignedIn();

    const unsynced = await getUnsyncedClients();
    console.log("Unsynced clients:", unsynced);

    for (const c of unsynced) {
      try {
        console.log(`syncClientsToCloud: syncing id=${c.id} name=${c.name}`);
        const docRef = doc(firestoreDB, "clients", c.name);

        await setDoc(docRef, {
          clientName: c.name,
          deleted: c.deleted || 0,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp(),
        });

        const ok = await markClientAsSynced(c.id!, docRef.id);
        console.log(`syncClientsToCloud: marked id=${c.id} synced=${ok}`);
        if (!ok) console.warn(`syncClientsToCloud: verification failed for id=${c.id}`);
      } catch (err: any) {
        console.warn(`syncClientsToCloud: failed to sync id=${c.id} name=${c.name}:`, err);
      }
    }

    console.log("✅ Clients synced to Firestore");
  } catch (err: any) {
    console.error("❌ Failed to sync clients to Firestore:", err);
  }
};

export const markClientAsDeletedByName = async (name: string) => {
  const clients = await getAllClients();
  const cl = clients.find((e: LocalClient) => e.name === name);
  if (cl && cl.id != null) {
    await markClientAsDeleted(cl.id);
  }
};

export const startClientListener = (onLocalUpdate?: () => void) => {
  return (async () => {
    try {
      await ensureSignedIn();
      console.log("Clients Firebase signed-in user:", auth.currentUser?.uid ?? null);
    } catch (e) {
      console.warn("Clients listener: ensureSignedIn failed", e);
    }

    return listenToClientChanges(async (changes: any[]) => {
      for (const ch of changes) {
        const data = ch.data;
        const name = (data.clientName || data.name || "").toString();
        if (!name) continue;

        try {
          if (data.deleted === 1) {
            await markClientAsDeletedByName(name);
            continue;
          }

          const local = await findClientByName(name as string);
          if (local && local.deleted === 1) {
            // Reinforce deletion in cloud
            try {
              const docRef = doc(firestoreDB, "clients", name);
              await setDoc(
                docRef,
                { clientName: name, deleted: 1, updatedAt: new Date().toISOString(), serverUpdatedAt: serverTimestamp() },
                { merge: true }
              );
              console.log(`Re-enforced deletion in cloud for client ${name} because local row is deleted`);
            } catch (writeErr) {
              console.warn(`Failed to re-enforce deletion for client ${name}:`, writeErr);
            }
            continue;
          }

          await addClientToDB(name);
        } catch (err: any) {
          console.warn(`Error processing client "${name}":`, err);
        }
      }

      onLocalUpdate?.();
    });
  })();
};
