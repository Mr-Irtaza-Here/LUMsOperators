//This is database.ts

import * as SQLite from 'expo-sqlite';

// Open database using the NEW Expo API
export const db = SQLite.openDatabaseSync('expenses.db');

// Create table
export const initDB = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engName TEXT,
      displayDate TEXT,
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
      synced INTEGER DEFAULT 0
    );
  `);
};
