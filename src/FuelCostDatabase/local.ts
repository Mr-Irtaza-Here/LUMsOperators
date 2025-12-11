// src/FuelCostDatabase/local.ts
// Simplified single-value fuel cost storage for global sharing across all users
import { db } from "../utils/LocalDB";

export type FuelCostSetting = {
  id?: number;
  cost: number;
  cloudId?: string | null;
  synced: number;
  updatedAt: string;
};

// Initialize the fuel_cost_settings table
export const initFuelCostSettingsTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS fuel_cost_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);

    const cols: any[] = await db.getAllAsync(`PRAGMA table_info(fuel_cost_settings)`);
    const names = (cols ?? []).map((c) => c.name);

    if (!names.includes("cost")) await db.runAsync(`ALTER TABLE fuel_cost_settings ADD COLUMN cost REAL`);
    if (!names.includes("synced")) await db.runAsync(`ALTER TABLE fuel_cost_settings ADD COLUMN synced INTEGER DEFAULT 0`);
    if (!names.includes("cloudId")) await db.runAsync(`ALTER TABLE fuel_cost_settings ADD COLUMN cloudId TEXT`);
    if (!names.includes("updatedAt")) await db.runAsync(`ALTER TABLE fuel_cost_settings ADD COLUMN updatedAt TEXT`);

    console.log("✅ Fuel cost settings table ready");
  } catch (e) {
    console.error("❌ Failed to init fuel cost settings table", e);
  }
};

// Get the current fuel cost value (returns null if not set)
export const getFuelCostValue = async (): Promise<number | null> => {
  try {
    const rows = await db.getAllAsync<FuelCostSetting>(
      `SELECT * FROM fuel_cost_settings ORDER BY id DESC LIMIT 1`
    );
    return rows?.[0]?.cost ?? null;
  } catch (e) {
    console.warn("getFuelCostValue failed:", e);
    return null;
  }
};

// Get the full fuel cost setting record (for syncing)
export const getFuelCostSetting = async (): Promise<FuelCostSetting | null> => {
  try {
    const rows = await db.getAllAsync<FuelCostSetting>(
      `SELECT * FROM fuel_cost_settings ORDER BY id DESC LIMIT 1`
    );
    return rows?.[0] ?? null;
  } catch (e) {
    console.warn("getFuelCostSetting failed:", e);
    return null;
  }
};

// Set or update the fuel cost value
export const setFuelCostValue = async (cost: number, synced: number = 0): Promise<void> => {
  try {
    const existing = await getFuelCostSetting();
    const now = new Date().toISOString();

    if (existing && existing.id) {
      // Update existing record
      await db.runAsync(
        `UPDATE fuel_cost_settings SET cost = ?, synced = ?, updatedAt = ? WHERE id = ?`,
        [cost, synced, now, existing.id]
      );
    } else {
      // Insert new record
      await db.runAsync(
        `INSERT INTO fuel_cost_settings (cost, synced, cloudId, updatedAt) VALUES (?, ?, null, ?)`,
        [cost, synced, now]
      );
    }
    console.log(`✅ Fuel cost set to ${cost}, synced=${synced}`);
  } catch (e) {
    console.error("setFuelCostValue failed:", e);
    // Try initializing table and retry
    await initFuelCostSettingsTable();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO fuel_cost_settings (cost, synced, cloudId, updatedAt) VALUES (?, ?, null, ?)`,
      [cost, synced, now]
    );
  }
};

// Get unsynced fuel cost (if any)
export const getUnsyncedFuelCost = async (): Promise<FuelCostSetting | null> => {
  try {
    const rows = await db.getAllAsync<FuelCostSetting>(
      `SELECT * FROM fuel_cost_settings WHERE synced = 0 ORDER BY id DESC LIMIT 1`
    );
    return rows?.[0] ?? null;
  } catch (e) {
    console.warn("getUnsyncedFuelCost failed:", e);
    return null;
  }
};

// Mark fuel cost as synced
export const markFuelCostAsSynced = async (id: number, cloudId: string): Promise<boolean> => {
  try {
    await db.runAsync(
      `UPDATE fuel_cost_settings SET synced = 1, cloudId = ? WHERE id = ?`,
      [cloudId, id]
    );
    console.log(`✅ Fuel cost id=${id} marked as synced with cloudId=${cloudId}`);
    return true;
  } catch (e) {
    console.warn(`markFuelCostAsSynced failed for id=${id}:`, e);
    return false;
  }
};
