import { db } from './connection.js';

const houseColumns = [
  ['id', 'TEXT PRIMARY KEY'],
  ['name', 'TEXT NOT NULL'],
  ['status', "TEXT NOT NULL DEFAULT 'watching'"],
  ['bedroom_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['living_room_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['bathroom_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['source_channel', 'TEXT'],
  ['address', 'TEXT NOT NULL'],
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['rent_price', 'INTEGER NOT NULL'],
  ['rent_payment_periods', 'TEXT'],
  ['property_fee', 'INTEGER'],
  ['water_fee_per_ton', 'REAL'],
  ['electricity_fee_per_kwh', 'REAL'],
  ['other_fee', 'INTEGER'],
  ['phone', 'TEXT'],
  ['wechat', 'TEXT'],
  ['contact_notes', 'TEXT'],
  ['created_at', 'TEXT NOT NULL'],
  ['updated_at', 'TEXT NOT NULL']
] as const;

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS houses (
      ${houseColumns.map(([name, type]) => `${name} ${type}`).join(',\n      ')}
    );

    CREATE INDEX IF NOT EXISTS idx_houses_status ON houses(status);
    CREATE INDEX IF NOT EXISTS idx_houses_source_channel ON houses(source_channel);
    CREATE INDEX IF NOT EXISTS idx_houses_rent_price ON houses(rent_price);
    CREATE INDEX IF NOT EXISTS idx_houses_updated_at ON houses(updated_at);

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
