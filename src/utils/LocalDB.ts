//This is LocalDB.ts
// src/utils/LocalDB.ts

import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("expenses.db");

// ---------- TYPES ----------
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

  deleted: number; // 0 or 1
  synced: number;  // 0 or 1

  updatedAt: string;
};

export const deleteEngineerFromDB = (name: string) => {
  db.runSync(`DELETE FROM engineers WHERE name = ?`, [name]);
};

// ---------- INIT DB ----------
export const initDB = () => {
  db.execSync(`
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

  // Engineers table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS engineers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    deleted INTEGER DEFAULT 0,   -- 0=active, 1=deleted
    synced INTEGER DEFAULT 0     -- 0=unsynced, 1=synced
    );
  `);
};

// ---------- ADD EXPENSE ----------
export const addLocalExpense = (exp: Partial<LocalExpense>): number => {
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO expenses
     (cloudId, engName, date, cost, category, type, client, status, bikeNo,
      description, starting, ending, distance, fuelCost, startTime, endTime,
      timeConsumed, deleted, synced, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      exp.startTime || null,
      exp.endTime || null,
      exp.timeConsumed || 0,
      exp.deleted ? 1 : 0,
      exp.synced ? 1 : 0,
      exp.updatedAt || now,
    ]
  );

  const row = db.getFirstSync(
    "SELECT last_insert_rowid() AS id"
  ) as { id: number };

  return row.id;
};

// ---------- GET ALL NON-DELETED ----------
export const getAllLocal = (): LocalExpense[] => {
  return db.getAllSync(
    "SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC"
  ) as LocalExpense[];
};

// ---------- ENGINEERS ----------

// Add a new engineer
export const addEngineerToDB = (name: string, options?: { synced?: boolean }): void => {
  const trimmed = name.trim();
  if (!trimmed) return;

  const synced = options?.synced ? 1 : 0;

  db.runSync(
    `INSERT INTO engineers (name, deleted, synced)
     VALUES (?, 0, ?)
     ON CONFLICT(name) DO UPDATE SET deleted = 0, synced = ?`,
    [trimmed, synced, synced]
  );
};

export const getUnsyncedEngineers = (): { name: string; deleted: number }[] => {
  return db.getAllSync(`SELECT name, deleted FROM engineers WHERE synced = 0`);
};

export const markEngineerAsSynced = (name: string) => {
  db.runSync(`UPDATE engineers SET synced = 1 WHERE name = ?`, [name]);
};

export const markEngineerAsDeleted = (name: string, options?: { synced?: boolean }) => {
  const synced = options?.synced ? 1 : 0;
  db.runSync(
    `UPDATE engineers SET deleted = 1, synced = ? WHERE name = ?`,
    [synced, name]
  );
};

// Get all engineers
export const getAllEngineers = (): string[] => {
  const rows = db.getAllSync(`SELECT name FROM engineers WHERE deleted = 0 ORDER BY name ASC`);
  return rows.map((r: any) => r.name);
};

// ---------- GET UNSYNCED ITEMS ----------
export const getUnsynced = (): LocalExpense[] => {
  return db.getAllSync(
    "SELECT * FROM expenses WHERE synced = 0 ORDER BY updatedAt ASC"
  ) as LocalExpense[];
};

// ---------- UPDATE EXPENSE ----------
export const updateLocalExpense = (
  id: number,
  changes: Partial<LocalExpense>
): void => {
  const now = new Date().toISOString();

  const keys = Object.keys(changes);
  const values = Object.values(changes);

  const setClause = keys.map((k) => `${k} = ?`).join(", ");

  db.runSync(
    `UPDATE expenses
     SET ${setClause}, synced = 0, updatedAt = ?
     WHERE id = ?`,
    [...values, now, id]
  );
};

// ---------- MARK ITEM AS SYNCED ----------
export const markSynced = (id: number, cloudId?: string): void => {
  db.runSync(
    `UPDATE expenses SET synced = 1, cloudId = ? WHERE id = ?`,
    [cloudId || null, id]
  );
};

// ---------- FIND BY CLOUD ID ----------
export const findLocalByCloudId = (
  cloudId: string
): LocalExpense | null => {
  const res = db.getFirstSync(
    "SELECT * FROM expenses WHERE cloudId = ? LIMIT 1",
    [cloudId]
  ) as LocalExpense | undefined;

  return res ?? null;
};

// ---------- SOFT DELETE ----------
export const softDeleteLocal = (id: number): void => {
  const now = new Date().toISOString();

  db.runSync(
    `UPDATE expenses
     SET deleted = 1, synced = 0, updatedAt = ?
     WHERE id = ?`,
    [now, id]
  );
};

// ---------- HARD DELETE ----------
export const hardDeleteLocal = (id: number): void => {
  db.runSync("DELETE FROM expenses WHERE id = ?", [id]);
};


// ---------- FIND DUPLICATE BY FIELDS (no cloudId needed) ----------
export const findLocalDuplicateByFields = (item: any): LocalExpense | null => {
  const row = db.getFirstSync(
    `
    SELECT * FROM expenses 
    WHERE 
      engName = ? AND
      date = ? AND
      cost = ? AND
      category = ? AND
      type = ? AND
      client = ? AND
      status = ? AND
      bikeNo = ? AND
      description = ?
    LIMIT 1
    `,
    [
      item.engName,
      item.date,
      item.cost,
      item.category,
      item.type,
      item.client,
      item.status,
      item.bikeNo,
      item.description,
    ]
  ) as LocalExpense | undefined;

  return row ?? null;
};
