import type {
  Appliance,
  Bill,
  CreateApplianceInput,
  CreateBillInput,
  CreateHouseholdInput,
  CreateSolarSystemInput,
  DatabaseClient,
  Household,
  SolarSystem,
} from './types';

type HouseholdRow = Omit<Household, 'postalCode' | 'occupantsCount' | 'areaM2' | 'createdAt' | 'updatedAt'> & {
  postal_code: string | null;
  occupants_count: number | null;
  area_m2: number | null;
  created_at: string;
  updated_at: string;
};
type ApplianceRow = Omit<Appliance, 'householdId' | 'powerW' | 'energyClass' | 'isShiftable' | 'isActive' | 'createdAt' | 'updatedAt'> & {
  household_id: number;
  power_w: number | null;
  energy_class: string | null;
  is_shiftable: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};
type BillRow = Omit<Bill, 'householdId' | 'periodStart' | 'periodEnd' | 'consumptionKwh' | 'totalCents' | 'energyCents' | 'fixedCents' | 'taxesCents' | 'supplierName' | 'tariffName' | 'createdAt' | 'updatedAt'> & {
  household_id: number; period_start: string; period_end: string; consumption_kwh: number; total_cents: number;
  energy_cents: number | null; fixed_cents: number | null; taxes_cents: number | null; supplier_name: string | null; tariff_name: string | null;
  created_at: string; updated_at: string;
};
type SolarSystemRow = Omit<SolarSystem, 'householdId' | 'peakPowerKw' | 'installationDate' | 'tiltDeg' | 'hasBattery' | 'batteryKwh' | 'createdAt' | 'updatedAt'> & {
  household_id: number; peak_power_kw: number; installation_date: string | null; tilt_deg: number | null; has_battery: number; battery_kwh: number | null;
  created_at: string; updated_at: string;
};

const households = `id, name, postal_code, city, latitude, longitude, occupants_count, area_m2, created_at, updated_at`;
const appliances = `id, household_id, name, category, power_w, energy_class, is_shiftable, is_active, created_at, updated_at`;
const bills = `id, household_id, period_start, period_end, consumption_kwh, total_cents, energy_cents, fixed_cents, taxes_cents, supplier_name, tariff_name, status, created_at, updated_at`;
const solarSystems = `id, household_id, peak_power_kw, installation_date, orientation, tilt_deg, has_battery, battery_kwh, created_at, updated_at`;

function mapHousehold(row: HouseholdRow): Household { return { id: row.id, name: row.name, postalCode: row.postal_code, city: row.city, latitude: row.latitude, longitude: row.longitude, occupantsCount: row.occupants_count, areaM2: row.area_m2, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapAppliance(row: ApplianceRow): Appliance { return { id: row.id, householdId: row.household_id, name: row.name, category: row.category, powerW: row.power_w, energyClass: row.energy_class, isShiftable: row.is_shiftable === 1, isActive: row.is_active === 1, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapBill(row: BillRow): Bill { return { id: row.id, householdId: row.household_id, periodStart: row.period_start, periodEnd: row.period_end, consumptionKwh: row.consumption_kwh, totalCents: row.total_cents, energyCents: row.energy_cents, fixedCents: row.fixed_cents, taxesCents: row.taxes_cents, supplierName: row.supplier_name, tariffName: row.tariff_name, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapSolarSystem(row: SolarSystemRow): SolarSystem { return { id: row.id, householdId: row.household_id, peakPowerKw: row.peak_power_kw, installationDate: row.installation_date, orientation: row.orientation, tiltDeg: row.tilt_deg, hasBattery: row.has_battery === 1, batteryKwh: row.battery_kwh, createdAt: row.created_at, updatedAt: row.updated_at }; }

abstract class BaseRepository { constructor(protected readonly db: DatabaseClient) {} }

export class HouseholdRepository extends BaseRepository {
  async create(input: CreateHouseholdInput): Promise<Household> {
    const result = await this.db.runAsync('INSERT INTO households (name, postal_code, city, latitude, longitude, occupants_count, area_m2) VALUES (?, ?, ?, ?, ?, ?, ?)', [input.name, input.postalCode, input.city, input.latitude, input.longitude, input.occupantsCount, input.areaM2]);
    return this.requireById(Number(result.lastInsertRowId));
  }
  async getById(id: number): Promise<Household | null> { const row = await this.db.getFirstAsync<HouseholdRow>(`SELECT ${households} FROM households WHERE id = ?`, [id]); return row ? mapHousehold(row) : null; }
  private async requireById(id: number): Promise<Household> { const record = await this.getById(id); if (!record) throw new Error(`Household ${id} was not created.`); return record; }
}

export class ApplianceRepository extends BaseRepository {
  async create(input: CreateApplianceInput): Promise<Appliance> { const result = await this.db.runAsync('INSERT INTO appliances (household_id, name, category, power_w, energy_class, is_shiftable, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)', [input.householdId, input.name, input.category, input.powerW, input.energyClass, Number(input.isShiftable), Number(input.isActive)]); return this.requireById(Number(result.lastInsertRowId)); }
  async getById(id: number): Promise<Appliance | null> { const row = await this.db.getFirstAsync<ApplianceRow>(`SELECT ${appliances} FROM appliances WHERE id = ?`, [id]); return row ? mapAppliance(row) : null; }
  private async requireById(id: number): Promise<Appliance> { const record = await this.getById(id); if (!record) throw new Error(`Appliance ${id} was not created.`); return record; }
}

export class BillRepository extends BaseRepository {
  async create(input: CreateBillInput): Promise<Bill> { const result = await this.db.runAsync('INSERT INTO bills (household_id, period_start, period_end, consumption_kwh, total_cents, energy_cents, fixed_cents, taxes_cents, supplier_name, tariff_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [input.householdId, input.periodStart, input.periodEnd, input.consumptionKwh, input.totalCents, input.energyCents, input.fixedCents, input.taxesCents, input.supplierName, input.tariffName, input.status]); return this.requireById(Number(result.lastInsertRowId)); }
  async getById(id: number): Promise<Bill | null> { const row = await this.db.getFirstAsync<BillRow>(`SELECT ${bills} FROM bills WHERE id = ?`, [id]); return row ? mapBill(row) : null; }
  private async requireById(id: number): Promise<Bill> { const record = await this.getById(id); if (!record) throw new Error(`Bill ${id} was not created.`); return record; }
}

export class SolarSystemRepository extends BaseRepository {
  async create(input: CreateSolarSystemInput): Promise<SolarSystem> { const result = await this.db.runAsync('INSERT INTO solar_systems (household_id, peak_power_kw, installation_date, orientation, tilt_deg, has_battery, battery_kwh) VALUES (?, ?, ?, ?, ?, ?, ?)', [input.householdId, input.peakPowerKw, input.installationDate, input.orientation, input.tiltDeg, Number(input.hasBattery), input.batteryKwh]); return this.requireById(Number(result.lastInsertRowId)); }
  async getById(id: number): Promise<SolarSystem | null> { const row = await this.db.getFirstAsync<SolarSystemRow>(`SELECT ${solarSystems} FROM solar_systems WHERE id = ?`, [id]); return row ? mapSolarSystem(row) : null; }
  private async requireById(id: number): Promise<SolarSystem> { const record = await this.getById(id); if (!record) throw new Error(`Solar system ${id} was not created.`); return record; }
}
