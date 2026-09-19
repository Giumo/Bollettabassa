import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, migrateDatabase } from './schema';
import type { DatabaseClient } from './types';

type OpenDatabase = (name: string) => Promise<DatabaseClient>;

export class DatabaseService {
  private databasePromise: Promise<DatabaseClient> | null = null;

  constructor(
    private readonly openDatabase: OpenDatabase = (name) =>
      SQLite.openDatabaseAsync(name) as unknown as Promise<DatabaseClient>,
    private readonly databaseName = DATABASE_NAME,
  ) {}

  async getDatabase(): Promise<DatabaseClient> {
    if (!this.databasePromise) {
      this.databasePromise = this.openAndMigrate();
    }

    try {
      return await this.databasePromise;
    } catch (error) {
      this.databasePromise = null;
      throw error;
    }
  }

  async close(): Promise<void> {
    const database = this.databasePromise ? await this.databasePromise : null;
    this.databasePromise = null;
    await database?.closeAsync?.();
  }

  private async openAndMigrate(): Promise<DatabaseClient> {
    const database = await this.openDatabase(this.databaseName);
    await migrateDatabase(database);
    return database;
  }
}

export const databaseService = new DatabaseService();
