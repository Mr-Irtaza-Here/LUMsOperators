// src/utils/LocalDB.ts
import * as SQLite from "expo-sqlite";

// -----------------------------------
// OPEN DATABASE (MODERN API)
// -----------------------------------
export const db = SQLite.openDatabaseSync("expenses.db");

// -----------------------------------
// TYPES
// -----------------------------------
export type LocalExpense = {
  id?: number;
  cloudId?: string | null;
  engName: string;
  date: string;
  cost: string;
  category: string;
  type: string;
  client: string;
  status: string;
  bikeNo: string;
  description: string;
  starting: string;
  ending: string;
  distance: string;
  fuelCost: number;
  startTime: string;
  endTime: string;
  timeConsumed: number;
  deleted: number;
  synced: number;
  updatedAt: string;
};

// -----------------------------------
// INIT DATABASE
// -----------------------------------
export const initDB = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS engineers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        engName TEXT,
        deleted INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        cloudId TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cloudId TEXT,
        engName TEXT,
        date TEXT,
        cost TEXT,
        category TEXT,
        type TEXT,
        client TEXT,
        status TEXT,
        bikeNo TEXT,
        description TEXT,
        starting TEXT,
        ending TEXT,
        distance TEXT,
        fuelCost REAL DEFAULT 0,
        startTime TEXT,
        endTime TEXT,
        timeConsumed REAL DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        updatedAt TEXT
      );
    `);

    console.log("✅ Local DB initialized");
  } catch (e) {
    console.error("❌ DB init failed", e);
  }
};
// engineer functions were moved to src/EngineersDatabase for separation of concerns

// -----------------------------------
// EXPENSE FUNCTIONS
// -----------------------------------

// ADD LOCAL EXPENSE
export const addLocalExpense = async (exp: Partial<LocalExpense>) => {
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO expenses (
      cloudId, engName, date, cost, category, type, client, status, bikeNo,
      description, starting, ending, distance, fuelCost, startTime, endTime,
      timeConsumed, deleted, synced, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exp.cloudId || null,
      exp.engName || "",
      exp.date || "",
      exp.cost || "",
      exp.category || "",
      exp.type || "",
      exp.client || "",
      exp.status || "",
      exp.bikeNo || "",
      exp.description || "",
      exp.starting || "",
      exp.ending || "",
      exp.distance || "",
      exp.fuelCost || 0,
      exp.startTime || "",
      exp.endTime || "",
      exp.timeConsumed || 0,
      exp.deleted ? 1 : 0,
      exp.synced ? 1 : 0,
      exp.updatedAt || now
    ]
  );

  return result.lastInsertRowId;
};

// UPDATE LOCAL EXPENSE
export const updateLocalExpense = async (
  id: number,
  fields: Partial<LocalExpense>
) => {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE expenses SET
      cloudId = ?,
      engName = ?,
      date = ?,
      cost = ?,
      category = ?,
      type = ?,
      client = ?,
      status = ?,
      bikeNo = ?,
      description = ?,
      starting = ?,
      ending = ?,
      distance = ?,
      fuelCost = ?,
      startTime = ?,
      endTime = ?,
      timeConsumed = ?,
      deleted = ?,
      synced = ?,
      updatedAt = ?
     WHERE id = ?`,
    [
      fields.cloudId ?? null,
      fields.engName ?? "",
      fields.date ?? "",
      fields.cost ?? "",
      fields.category ?? "",
      fields.type ?? "",
      fields.client ?? "",
      fields.status ?? "",
      fields.bikeNo ?? "",
      fields.description ?? "",
      fields.starting ?? "",
      fields.ending ?? "",
      fields.distance ?? "",
      fields.fuelCost ?? 0,
      fields.startTime ?? "",
      fields.endTime ?? "",
      fields.timeConsumed ?? 0,
      fields.deleted ?? 0,
      fields.synced ?? 0,
      fields.updatedAt ?? now,
      id
    ]
  );
};

// GET ALL EXPENSES
export const getAllLocal = async (): Promise<LocalExpense[]> => {
  const rows = await db.getAllAsync<LocalExpense>(
    `SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC`
  );
  return rows ?? [];
};

// SOFT DELETE EXPENSE
export const softDeleteLocal = async (id: number) => {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE expenses SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?`,
    [now, id]
  );
};

// HARD DELETE
export const hardDeleteLocal = async (id: number) => {
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
};

// FIND BY CLOUD ID
export const findLocalByCloudId = async (cloudId: string) => {
  const rows = await db.getAllAsync<LocalExpense>(
    `SELECT * FROM expenses WHERE cloudId = ? LIMIT 1`,
    [cloudId]
  );

  return rows?.[0] ?? null;
};

// GET UNSYNCED
export const getUnsynced = async () => {
  const rows = await db.getAllAsync<LocalExpense>(
    `SELECT * FROM expenses WHERE synced = 0 ORDER BY updatedAt ASC`
  );

  return rows ?? [];
};

// FIND BY CONTENT (for duplicate prevention)
// Checks if a record with matching content exists locally without a cloudId
export const findLocalByContent = async (exp: Partial<LocalExpense>): Promise<LocalExpense | null> => {
  try {
    const rows = await db.getAllAsync<LocalExpense>(
      `SELECT * FROM expenses 
       WHERE engName = ? AND date = ? AND cost = ? AND description = ? 
       AND category = ? AND type = ? AND client = ?
       AND deleted = 0 AND cloudId IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [
        exp.engName || "",
        exp.date || "",
        exp.cost || "",
        exp.description || "",
        exp.category || "",
        exp.type || "",
        exp.client || ""
      ]
    );
    return rows?.[0] ?? null;
  } catch (e) {
    console.warn("findLocalByContent failed:", e);
    return null;
  }
};
