import type { DatabaseClient } from './types';

export const DATABASE_NAME = 'bollettabassa.db';
export const SCHEMA_VERSION = 1;

const schemaV1 = `
  CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    postal_code TEXT,
    city TEXT,
    latitude REAL,
    longitude REAL,
    occupants_count INTEGER CHECK (occupants_count IS NULL OR occupants_count > 0),
    area_m2 REAL CHECK (area_m2 IS NULL OR area_m2 > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appliances (
    id INTEGER PRIMARY KEY NOT NULL,
    household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    power_w REAL CHECK (power_w IS NULL OR power_w >= 0),
    energy_class TEXT,
    is_shiftable INTEGER NOT NULL DEFAULT 0 CHECK (is_shiftable IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY NOT NULL,
    household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    consumption_kwh REAL NOT NULL CHECK (consumption_kwh >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    energy_cents INTEGER CHECK (energy_cents IS NULL OR energy_cents >= 0),
    fixed_cents INTEGER CHECK (fixed_cents IS NULL OR fixed_cents >= 0),
    taxes_cents INTEGER CHECK (taxes_cents IS NULL OR taxes_cents >= 0),
    supplier_name TEXT,
    tariff_name TEXT,
    status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('draft', 'complete')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (period_end >= period_start)
  );

  CREATE TABLE IF NOT EXISTS solar_systems (
    id INTEGER PRIMARY KEY NOT NULL,
    household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    peak_power_kw REAL NOT NULL CHECK (peak_power_kw > 0),
    installation_date TEXT,
    orientation TEXT,
    tilt_deg REAL CHECK (tilt_deg IS NULL OR (tilt_deg >= 0 AND tilt_deg <= 90)),
    has_battery INTEGER NOT NULL DEFAULT 0 CHECK (has_battery IN (0, 1)),
    battery_kwh REAL CHECK (battery_kwh IS NULL OR battery_kwh >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_appliances_household_id ON appliances(household_id);
  CREATE INDEX IF NOT EXISTS idx_bills_household_period ON bills(household_id, period_start DESC);
  CREATE INDEX IF NOT EXISTS idx_solar_systems_household_id ON solar_systems(household_id);
`;

export async function migrateDatabase(db: DatabaseClient): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = version?.user_version ?? 0;

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error(`Database schema version ${currentVersion} is newer than this app supports.`);
  }

  if (currentVersion < 1) {
    await db.execAsync(schemaV1);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}
