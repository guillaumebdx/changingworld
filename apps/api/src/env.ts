import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Racine du dépôt (apps/api/src → ../../..). */
export const RACINE = resolve(import.meta.dirname, '../../..');

const cheminEnv = resolve(RACINE, '.env');
if (existsSync(cheminEnv)) {
  try {
    process.loadEnvFile(cheminEnv);
  } catch {
    // Un .env illisible n'empêche pas le démarrage : les variables peuvent venir de l'environnement.
  }
}

export interface Env {
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  OPENAI_API_KEY: string | null;
  OPENAI_MODEL: string;
  DATABASE_PATH: string;
  PORT: number;
  PRODUCTION: boolean;
  TEST: boolean;
}

export function lireEnv(surcharges: Partial<Env> = {}): Env {
  const env = process.env;
  const production = env.NODE_ENV === 'production';
  const test = env.NODE_ENV === 'test' || env.VITEST === 'true';
  const databasePath = env.DATABASE_PATH ?? './data/changing-world.sqlite';
  return {
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ?? (production ? '' : 'changez-moi'),
    SESSION_SECRET: env.SESSION_SECRET ?? (production ? '' : 'secret-de-developpement-a-remplacer-absolument'),
    OPENAI_API_KEY: env.OPENAI_API_KEY?.trim() || null,
    OPENAI_MODEL: env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    DATABASE_PATH: databasePath === ':memory:' ? databasePath : resolve(RACINE, databasePath),
    PORT: Number(env.PORT ?? 3001),
    PRODUCTION: production,
    TEST: test,
    ...surcharges,
  };
}

export function verifierEnv(env: Env): string[] {
  const erreurs: string[] = [];
  if (!env.ADMIN_PASSWORD) erreurs.push('ADMIN_PASSWORD est vide.');
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) erreurs.push('SESSION_SECRET doit faire au moins 16 caractères.');
  return erreurs;
}
