// src/EngineersDatabase/local.ts
import { db } from "../utils/LocalDB";

export type LocalEngineer = {
  id?: number;
  engName: string;
  cloudId?: string | null;
  synced: number;
  deleted: number;
};

export const initEngineersTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS engineers (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);

    // Ensure expected columns exist; if not, add them.
    try {
      const cols: any[] = await db.getAllAsync(`PRAGMA table_info(engineers)`);
      const names = (cols ?? []).map((c) => c.name);

      if (!names.includes("engName")) {
        await db.runAsync(`ALTER TABLE engineers ADD COLUMN engName TEXT`);
      }
      if (!names.includes("deleted")) {
        await db.runAsync(`ALTER TABLE engineers ADD COLUMN deleted INTEGER DEFAULT 0`);
      }
      if (!names.includes("synced")) {
        await db.runAsync(`ALTER TABLE engineers ADD COLUMN synced INTEGER DEFAULT 0`);
      }
      if (!names.includes("cloudId")) {
        await db.runAsync(`ALTER TABLE engineers ADD COLUMN cloudId TEXT`);
      }

      console.log("✅ Engineers table ready (migrated columns if needed)");
    } catch (mErr) {
      console.warn("Engineers table migration check failed:", mErr);
    }
  } catch (e) {
    console.error("❌ Failed to init engineers table", e);
  }
};

export const findEngineerByName = async (
  name: string
): Promise<LocalEngineer | null> => {
  try {
    const trimmed = name.trim();
    const rows = await db.getAllAsync<LocalEngineer>(
      `SELECT * FROM engineers WHERE lower(engName) = lower(?) LIMIT 1`,
      [trimmed]
    );

    return rows?.[0] ?? null;
  } catch (e) {
    console.warn("findEngineerByName failed:", e);
    return null;
  }
};

export const addEngineerToDB = async (
  engName: string
): Promise<LocalEngineer> => {
  const trimmed = engName.trim();

  // 1) check existing (case-insensitive)
  const existing = await findEngineerByName(trimmed);
  if (existing) {
    // if previously deleted, undelete and mark unsynced so it will sync
    if (existing.deleted === 1) {
      await db.runAsync(`UPDATE engineers SET deleted = 0, synced = 0 WHERE id = ?`, [existing.id!]);
      return { ...existing, deleted: 0, synced: 0 };
    }

    // already exists and active — return it
    return existing;
  }

  // 2) insert new
  const insert = async () => {
    const result = await db.runAsync(
      `INSERT INTO engineers (engName, synced, deleted, cloudId)
       VALUES (?, 0, 0, null)`,
      [trimmed]
    );

    return {
      id: result.lastInsertRowId,
      engName: trimmed,
      cloudId: null,
      deleted: 0,
      synced: 0,
    };
  };

  try {
    return await insert();
  } catch (e: any) {
    console.error("❌ Add engineer failed (first attempt)", e);
    // Try to ensure table exists and retry once
    try {
      await initEngineersTable();
      return await insert();
    } catch (e2: any) {
      console.error("❌ Add engineer failed (after retry)", e2);
      // surface the original error message where possible
      const msg = e2?.message || e?.message || String(e2) || String(e);
      throw new Error(`Failed to insert engineer: ${msg}`);
    }
  }
};

export const getAllEngineers = async (): Promise<LocalEngineer[]> => {
  const rows = await db.getAllAsync<LocalEngineer>(
    `SELECT * FROM engineers WHERE deleted = 0 ORDER BY id ASC`
  );
  return rows ?? [];
};

export const markEngineerAsDeleted = async (id: number) => {
  // Mark as deleted locally and mark as unsynced so the deletion is pushed to Firestore
  await db.runAsync(`UPDATE engineers SET deleted = 1, synced = 0 WHERE id = ?`, [id]);
};

export const getUnsyncedEngineers = async (): Promise<LocalEngineer[]> => {
  // Return all rows that need syncing (including deletions).
  const rows = await db.getAllAsync<LocalEngineer>(
    `SELECT * FROM engineers WHERE synced = 0`
  );
  return rows ?? [];
};

export const markEngineerAsSynced = async (id: number, cloudId: string): Promise<boolean> => {
  try {
    await db.runAsync(
      `UPDATE engineers SET synced = 1, cloudId = ? WHERE id = ?`,
      [cloudId, id]
    );

    // verify update
    const rows = await db.getAllAsync<LocalEngineer>(`SELECT * FROM engineers WHERE id = ? LIMIT 1`, [id]);
    const updated = rows?.[0];
    const ok = !!updated && updated.synced === 1 && (updated.cloudId === cloudId || updated.cloudId == null);
    console.log(`markEngineerAsSynced: id=${id} cloudId=${cloudId} result=${ok}`);
    return ok;
  } catch (e) {
    console.warn(`markEngineerAsSynced failed for id=${id} cloudId=${cloudId}:`, e);
    return false;
  }
};
