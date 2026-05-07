import { db } from './connection.js';

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT,
      source_url TEXT,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      rent_price INTEGER NOT NULL,
      deposit_amount INTEGER,
      agency_fee INTEGER,
      area_sqm REAL,
      layout TEXT,
      floor TEXT,
      orientation TEXT,
      available_date TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_listings_rent_price ON listings(rent_price);
    CREATE INDEX IF NOT EXISTS idx_listings_updated_at ON listings(updated_at);

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);
    CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON locations(updated_at);
  `);
}
