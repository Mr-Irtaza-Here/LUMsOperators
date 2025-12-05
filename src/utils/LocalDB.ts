//This is my LocalDB
// src/utils/LocalDB.ts
// Types for Expo SQLite
type SQLTransaction = any;
type SQLResultSet = {
  insertId: number;
  rowsAffected: number;
  rows: { length: number; item: (index: number) => any };
};
type SQLError = any;


import * as SQLite from "expo-sqlite";

// Using `any` is fine here to avoid TypeScript SQLite headaches
export const db: any = SQLite.openDatabaseSync("expenses.db");

// ---------- TYPES ----------
export type LocalEngineer = {
  id?: number;
  engName: string;
  cloudId?: string | null;
  synced: boolean;
  deleted?: number; // 0=active, 1=deleted
};

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

// ---------- INIT DB ----------
// Completely recreate engineers table safely
export const initDB = () => {
  // --- EXPENSE TABLE ---
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

  // --- ENGINEERS TABLE ---
  db.execSync(`
    CREATE TABLE IF NOT EXISTS engineers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engName TEXT,
      deleted INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      cloudId TEXT
    );
  `);

  // --- SAFE MIGRATIONS (NO CRASH EVEN IF COLUMN EXISTS) ---
  try { db.execSync(`ALTER TABLE engineers ADD COLUMN cloudId TEXT;`); } catch (_) {}
  try { db.execSync(`ALTER TABLE engineers ADD COLUMN deleted INTEGER DEFAULT 0;`); } catch (_) {}
  try { db.execSync(`ALTER TABLE engineers ADD COLUMN synced INTEGER DEFAULT 0;`); } catch (_) {}

  console.log("✅ Engineers table ready");
};


// ---------- EXPENSE FUNCTIONS ----------
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
      exp.startTime || "",
      exp.endTime || "",
      exp.timeConsumed || 0,
      exp.deleted ? 1 : 0,
      exp.synced ? 1 : 0,
      exp.updatedAt || now,
    ]
  );

  const row = db.getFirstSync("SELECT last_insert_rowid() AS id") as { id: number };
  return row.id;
};

export const getAllLocal = (): LocalExpense[] => {
  return db.getAllSync("SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC") as LocalExpense[];
};

export const updateLocalExpense = (id: number, changes: Partial<LocalExpense>): void => {
  const now = new Date().toISOString();
  const keys = Object.keys(changes);
  const values = Object.values(changes);
  const setClause = keys.map(k => `${k} = ?`).join(", ");

  db.runSync(
    `UPDATE expenses SET ${setClause}, synced = 0, updatedAt = ? WHERE id = ?`,
    [...values, now, id]
  );
};

export const markSynced = (id: number, cloudId?: string): void => {
  db.runSync(`UPDATE expenses SET synced = 1, cloudId = ? WHERE id = ?`, [cloudId || null, id]);
};

export const softDeleteLocal = (id: number): void => {
  const now = new Date().toISOString();
  db.runSync(`UPDATE expenses SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?`, [now, id]);
};

export const hardDeleteLocal = (id: number): void => {
  db.runSync("DELETE FROM expenses WHERE id = ?", [id]);
};

export const findLocalByCloudId = (cloudId: string): LocalExpense | null => {
  const res = db.getFirstSync("SELECT * FROM expenses WHERE cloudId = ? LIMIT 1", [cloudId]) as LocalExpense | undefined;
  return res ?? null;
};

export const getUnsynced = (): LocalExpense[] => {
  return db.getAllSync("SELECT * FROM expenses WHERE synced = 0 ORDER BY updatedAt ASC") as LocalExpense[];
};

export const findLocalDuplicateByFields = (item: any): LocalExpense | null => {
  const row = db.getFirstSync(
    `SELECT * FROM expenses 
     WHERE engName = ? AND date = ? AND cost = ? AND category = ? AND type = ? 
       AND client = ? AND status = ? AND bikeNo = ? AND description = ?
     LIMIT 1`,
    [item.engName, item.date, item.cost, item.category, item.type, item.client, item.status, item.bikeNo, item.description]
  ) as LocalExpense | undefined;

  return row ?? null;
};

// ---------- ENGINEER FUNCTIONS ----------
// ---------- ENGINEER FUNCTIONS (SYNC VERSION) ----------

// Add engineer
// Add engineer
export const addEngineerToDB = (engName: string, synced: boolean = false): LocalEngineer => {
  db.runSync(
    `INSERT INTO engineers (engName, deleted, synced, cloudId) VALUES (?, ?, ?, ?);`,
    [engName, 0, synced ? 1 : 0, null]
  );

  const row = db.getFirstSync("SELECT last_insert_rowid() AS id") as { id: number };
  return {
    id: row.id,
    engName,
    deleted: 0,
    synced,
    cloudId: null,
  };
};

// Get all engineers
export const getAllEngineers = (): LocalEngineer[] => {
  return db.getAllSync("SELECT * FROM engineers WHERE deleted = 0 ORDER BY id ASC") as LocalEngineer[];
};

// Mark engineer as deleted
export const markEngineerAsDeleted = (id: number): void => {
  db.runSync(`UPDATE engineers SET deleted = 1, synced = 0 WHERE id = ?`, [id]);
};

// Mark engineer as synced
export const markEngineerAsSynced = (id: number, cloudId: string): void => {
  db.runSync(`UPDATE engineers SET synced = 1, cloudId = ? WHERE id = ?`, [cloudId, id]);
};

// Get all unsynced engineers
export const getUnsyncedEngineers = (): LocalEngineer[] => {
  return db.getAllSync(`SELECT * FROM engineers WHERE synced = 0`) as LocalEngineer[];
};

// Optional: Mark engineer as deleted by name (if needed for sync listener)
export const markEngineerAsDeletedByName = (name: string, synced: boolean = false): void => {
  db.runSync(
    `UPDATE engineers SET deleted = 1, synced = ? WHERE engName = ?`,
    [synced ? 1 : 0, name]
  );
};
