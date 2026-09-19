export type Household = {
  id: number;
  name: string;
  postalCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  occupantsCount: number | null;
  areaM2: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateHouseholdInput = Omit<Household, 'id' | 'createdAt' | 'updatedAt'>;

export type Appliance = {
  id: number;
  householdId: number;
  name: string;
  category: string | null;
  powerW: number | null;
  energyClass: string | null;
  isShiftable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateApplianceInput = Omit<Appliance, 'id' | 'createdAt' | 'updatedAt'>;

export type Bill = {
  id: number;
  householdId: number;
  periodStart: string;
  periodEnd: string;
  consumptionKwh: number;
  totalCents: number;
  energyCents: number | null;
  fixedCents: number | null;
  taxesCents: number | null;
  supplierName: string | null;
  tariffName: string | null;
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
};

export type CreateBillInput = Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>;

export type SolarSystem = {
  id: number;
  householdId: number;
  peakPowerKw: number;
  installationDate: string | null;
  orientation: string | null;
  tiltDeg: number | null;
  hasBattery: boolean;
  batteryKwh: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSolarSystemInput = Omit<SolarSystem, 'id' | 'createdAt' | 'updatedAt'>;

export type DatabaseClient = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: readonly unknown[]): Promise<{ lastInsertRowId: number | bigint; changes: number }>;
  getFirstAsync<T>(source: string, params?: readonly unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: readonly unknown[]): Promise<T[]>;
  closeAsync?(): Promise<void>;
};
