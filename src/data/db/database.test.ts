import { DatabaseService } from './database-service';
import { SCHEMA_VERSION } from './schema';
import { ApplianceRepository, BillRepository, HouseholdRepository, SolarSystemRepository } from './repositories';
import type { DatabaseClient } from './types';

class MemoryDatabase implements DatabaseClient {
  public readonly statements: string[] = [];
  private version = 0;
  private nextId = 1;
  private readonly records = new Map<number, Record<string, unknown>>();

  async execAsync(source: string): Promise<void> {
    this.statements.push(source);
    const version = source.match(/PRAGMA user_version = (\d+)/);
    if (version) this.version = Number(version[1]);
  }
  async runAsync(source: string, params: readonly unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const table = source.match(/INSERT INTO (households|appliances|bills|solar_systems)/)?.[1];
    if (!table) throw new Error(`Unsupported query: ${source}`);
    const columns = source.match(/\(([^)]+)\) VALUES/)?.[1].split(', ').map((value) => value.trim()) ?? [];
    const id = this.nextId++;
    const row: Record<string, unknown> = { id, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
    columns.forEach((column, index) => { row[column] = params[index] ?? null; });
    this.records.set(id, row);
    return { lastInsertRowId: id, changes: 1 };
  }
  async getFirstAsync<T>(source: string, params: readonly unknown[] = []): Promise<T | null> {
    if (source.includes('PRAGMA user_version')) return { user_version: this.version } as T;
    return (this.records.get(Number(params[0])) as T | undefined) ?? null;
  }
  async getAllAsync<T>(): Promise<T[]> { return []; }
}

describe('DatabaseService', () => {
  it('opens a database and applies schema version 1 exactly once', async () => {
    const database = new MemoryDatabase();
    const open = jest.fn(async () => database);
    const service = new DatabaseService(open, 'test.db');

    await service.getDatabase();
    await service.getDatabase();

    expect(open).toHaveBeenCalledTimes(1);
    expect(database.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS households');
    expect(database.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS appliances');
    expect(database.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS bills');
    expect(database.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS solar_systems');
    expect(await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;')).toEqual({ user_version: SCHEMA_VERSION });
  });
});

describe('repositories', () => {
  it('inserts and reads the first domain records', async () => {
    const database = new MemoryDatabase();
    const household = await new HouseholdRepository(database).create({ name: 'Casa Motta', postalCode: '20100', city: 'Milano', latitude: null, longitude: null, occupantsCount: 2, areaM2: 75 });
    const appliance = await new ApplianceRepository(database).create({ householdId: household.id, name: 'Lavatrice', category: 'laundry', powerW: 2000, energyClass: 'A', isShiftable: true, isActive: true });
    const bill = await new BillRepository(database).create({ householdId: household.id, periodStart: '2026-01-01', periodEnd: '2026-01-31', consumptionKwh: 210, totalCents: 6500, energyCents: 4200, fixedCents: 1200, taxesCents: 1100, supplierName: 'Fornitore', tariffName: 'Domestica', status: 'complete' });
    const solarSystem = await new SolarSystemRepository(database).create({ householdId: household.id, peakPowerKw: 4.5, installationDate: '2024-05-01', orientation: 'south', tiltDeg: 30, hasBattery: false, batteryKwh: null });

    expect(household.name).toBe('Casa Motta');
    expect(appliance.isShiftable).toBe(true);
    expect(bill.totalCents).toBe(6500);
    expect(solarSystem.peakPowerKw).toBe(4.5);
  });
});
