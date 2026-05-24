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
  ['earnest_money', 'INTEGER'],
  ['deposit', 'INTEGER'],
  ['property_fee', 'INTEGER'],
  ['water_fee_per_ton', 'REAL'],
  ['electricity_fee_per_kwh', 'REAL'],
  ['custom_fees', 'TEXT'],
  ['fee_notes', 'TEXT'],
  ['contact_name', 'TEXT'],
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

    CREATE TABLE IF NOT EXISTS viewing_schedules (
      id TEXT PRIMARY KEY,
      house_id TEXT NOT NULL,
      viewing_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_viewing_schedules_house_id ON viewing_schedules(house_id);
    CREATE INDEX IF NOT EXISTS idx_viewing_schedules_viewing_at ON viewing_schedules(viewing_at);

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

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
  `);

  ensureColumn('locations', 'is_focus', 'INTEGER NOT NULL DEFAULT 0');

  ensureColumn('houses', 'earnest_money', 'INTEGER');
  ensureColumn('houses', 'deposit', 'INTEGER');
  ensureColumn('houses', 'custom_fees', 'TEXT');
  ensureColumn('houses', 'contact_name', 'TEXT');
  ensureColumn('houses', 'fee_notes', 'TEXT');

  ensureColumn('map_route_cache', 'commute_mode', "TEXT NOT NULL DEFAULT 'driving'");

  // Rebuild unique index to include commute_mode
  db.exec('DROP INDEX IF EXISTS idx_map_route_cache_lookup');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_map_route_cache_lookup
    ON map_route_cache(focus_location_id, origin, destination, commute_mode, kind)`);

  migrateViewingSchedulesFromHouseColumn();
  migrateViewingSchedulesToIndependentPK();
}

function migrateViewingSchedulesToIndependentPK() {
  const tableInfo = db.prepare('PRAGMA table_info(viewing_schedules)').all() as Array<{ name: string; pk: number }>;
  const hasTable = tableInfo.length > 0;
  if (!hasTable) return;

  const pkColumns = tableInfo.filter((col) => col.pk > 0);
  const hasCompositePK = pkColumns.length === 2 && pkColumns.some((col) => col.name === 'house_id') && pkColumns.some((col) => col.name === 'id');
  if (!hasCompositePK) return;

  db.exec(`
    CREATE TABLE viewing_schedules_v2 (
      id TEXT PRIMARY KEY,
      house_id TEXT NOT NULL,
      viewing_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );

    INSERT INTO viewing_schedules_v2 (id, house_id, viewing_at, note, created_at, updated_at)
    SELECT id, house_id, viewing_at, note, created_at, updated_at FROM viewing_schedules;

    DROP TABLE viewing_schedules;

    ALTER TABLE viewing_schedules_v2 RENAME TO viewing_schedules;
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_viewing_schedules_house_id ON viewing_schedules(house_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_viewing_schedules_viewing_at ON viewing_schedules(viewing_at)');
}

function migrateViewingSchedulesFromHouseColumn() {
  const columns = db.prepare('PRAGMA table_info(houses)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'viewing_schedules')) {
    return;
  }

  const rows = db
    .prepare('SELECT id, viewing_schedules FROM houses WHERE viewing_schedules IS NOT NULL AND viewing_schedules != ?')
    .all('') as Array<{ id: string; viewing_schedules: string }>;

  if (!rows.length) {
    return;
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO viewing_schedules (
      house_id, id, viewing_at, note, created_at, updated_at
    ) VALUES (
      @house_id, @id, @viewing_at, @note, @created_at, @updated_at
    )
  `);

  const transaction = db.transaction((items: typeof rows) => {
    for (const row of items) {
      const schedules = parseLegacyViewingSchedules(row.viewing_schedules);
      for (const schedule of schedules) {
        insert.run({
          house_id: row.id,
          id: schedule.id,
          viewing_at: schedule.viewingAt,
          note: schedule.note ?? null,
          created_at: now,
          updated_at: now
        });
      }
    }
  });

  transaction(rows);
}

function parseLegacyViewingSchedules(value: string): Array<{ id: string; viewingAt: string; note?: string }> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is { id: string; viewingAt: string; note?: string } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).viewingAt === 'string' &&
        ((item as Record<string, unknown>).note === undefined || typeof (item as Record<string, unknown>).note === 'string')
    );
  } catch {
    return [];
  }
}
