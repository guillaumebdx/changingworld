import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema.js';

export type Db = BetterSQLite3Database<typeof schema>;

const DOSSIER_MIGRATIONS = resolve(import.meta.dirname, '../../drizzle');

/** Ouvre (et crée si besoin) la base SQLite, puis applique les migrations versionnées. */
export function ouvrirBase(chemin: string): Db {
  if (chemin !== ':memory:') {
    mkdirSync(dirname(chemin), { recursive: true });
  }
  const sqlite = new Database(chemin);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: DOSSIER_MIGRATIONS });
  return db;
}

export { schema };
