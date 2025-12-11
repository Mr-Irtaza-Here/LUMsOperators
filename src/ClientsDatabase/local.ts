// src/ClientsDatabase/local.ts
import { db } from "../utils/LocalDB";

export type LocalClient = {
  id?: number;
  name: string;
  cloudId?: string | null;
  synced: number;
  deleted: number;
};

export const initClientsTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);

    // Ensure expected columns exist; if not, add them.
    try {
      const cols: any[] = await db.getAllAsync(`PRAGMA table_info(clients)`);
      const names = (cols ?? []).map((c) => c.name);

      if (!names.includes("name")) {
        await db.runAsync(`ALTER TABLE clients ADD COLUMN name TEXT`);
      }
      if (!names.includes("deleted")) {
        await db.runAsync(`ALTER TABLE clients ADD COLUMN deleted INTEGER DEFAULT 0`);
      }
      if (!names.includes("synced")) {
        await db.runAsync(`ALTER TABLE clients ADD COLUMN synced INTEGER DEFAULT 0`);
      }
      if (!names.includes("cloudId")) {
        await db.runAsync(`ALTER TABLE clients ADD COLUMN cloudId TEXT`);
      }

      console.log("✅ Clients table ready (migrated columns if needed)");
    } catch (mErr) {
      console.warn("Clients table migration check failed:", mErr);
    }
  } catch (e) {
    console.error("❌ Failed to init clients table", e);
  }
};

export const findClientByName = async (name: string): Promise<LocalClient | null> => {
  try {
    const trimmed = name.trim();
    const rows = await db.getAllAsync<LocalClient>(
      `SELECT * FROM clients WHERE lower(name) = lower(?) LIMIT 1`,
      [trimmed]
    );

    return rows?.[0] ?? null;
  } catch (e) {
    console.warn("findClientByName failed:", e);
    return null;
  }
};

export const addClientToDB = async (clientName: string): Promise<LocalClient> => {
  const trimmed = clientName.trim();

  // check existing (case-insensitive)
  const existing = await findClientByName(trimmed);
  if (existing) {
    if (existing.deleted === 1) {
      await db.runAsync(`UPDATE clients SET deleted = 0, synced = 0 WHERE id = ?`, [existing.id!]);
      return { ...existing, deleted: 0, synced: 0 };
    }
    return existing;
  }

  const insert = async () => {
    const result = await db.runAsync(
      `INSERT INTO clients (name, synced, deleted, cloudId) VALUES (?, 0, 0, null)`,
      [trimmed]
    );

    return {
      id: result.lastInsertRowId,
      name: trimmed,
      cloudId: null,
      deleted: 0,
      synced: 0,
    };
  };

  try {
    return await insert();
  } catch (e: any) {
    console.error("❌ Add client failed (first attempt)", e);
    try {
      await initClientsTable();
      return await insert();
    } catch (e2: any) {
      console.error("❌ Add client failed (after retry)", e2);
      const msg = e2?.message || e?.message || String(e2) || String(e);
      throw new Error(`Failed to insert client: ${msg}`);
    }
  }
};

export const getAllClients = async (): Promise<LocalClient[]> => {
  const rows = await db.getAllAsync<LocalClient>(`SELECT * FROM clients WHERE deleted = 0 ORDER BY id ASC`);
  return rows ?? [];
};

export const markClientAsDeleted = async (id: number) => {
  await db.runAsync(`UPDATE clients SET deleted = 1, synced = 0 WHERE id = ?`, [id]);
};

export const getUnsyncedClients = async (): Promise<LocalClient[]> => {
  const rows = await db.getAllAsync<LocalClient>(`SELECT * FROM clients WHERE synced = 0`);
  return rows ?? [];
};

export const markClientAsSynced = async (id: number, cloudId: string): Promise<boolean> => {
  try {
    await db.runAsync(`UPDATE clients SET synced = 1, cloudId = ? WHERE id = ?`, [cloudId, id]);
    const rows = await db.getAllAsync<LocalClient>(`SELECT * FROM clients WHERE id = ? LIMIT 1`, [id]);
    const updated = rows?.[0];
    const ok = !!updated && updated.synced === 1 && (updated.cloudId === cloudId || updated.cloudId == null);
    console.log(`markClientAsSynced: id=${id} cloudId=${cloudId} result=${ok}`);
    return ok;
  } catch (e) {
    console.warn(`markClientAsSynced failed for id=${id} cloudId=${cloudId}:`, e);
    return false;
  }
};
