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

function ensureColumn(table: string, name: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
}

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
      is_focus INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);
    CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON locations(updated_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_single_focus ON locations(is_focus) WHERE is_focus = 1;

    CREATE TABLE IF NOT EXISTS map_route_cache (
      id TEXT PRIMARY KEY,
      focus_location_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      kind TEXT NOT NULL,
      distance REAL NOT NULL,
      duration REAL NOT NULL,
      polyline TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_map_route_cache_lookup
      ON map_route_cache(focus_location_id, origin, destination, kind);
    CREATE INDEX IF NOT EXISTS idx_map_route_cache_focus_location
      ON map_route_cache(focus_location_id);
  `);

  ensureColumn('locations', 'is_focus', 'INTEGER NOT NULL DEFAULT 0');
}
