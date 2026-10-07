import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';

const { prompts, promptVersions } = schema;

export function creerPromptAvecVersion(db: Db, p: { format_id: number | null; nom: string; contenu: string; note: string }) {
  const prompt = db.insert(prompts).values({ format_id: p.format_id, nom: p.nom }).returning().get();
  const version = db
    .insert(promptVersions)
    .values({ prompt_id: prompt.id, version: 1, contenu: p.contenu, note_de_version: p.note, active: true })
    .returning()
    .get();
  return { prompt, version };
}

/** Garantit qu'un format possède un prompt (v1 initiale ou générique). Renvoie true s'il a fallu le créer. */
export function assurerPromptDuFormat(
  db: Db,
  format: { id: number; code: string; nom: string },
  initiaux: Record<string, string>,
  generique: string,
): boolean {
  const existant = db.select({ id: prompts.id }).from(prompts).where(eq(prompts.format_id, format.id)).get();
  if (existant) return false;
  creerPromptAvecVersion(db, {
    format_id: format.id,
    nom: format.nom,
    contenu: initiaux[format.code] ?? generique,
    note: initiaux[format.code] ? 'Version initiale.' : 'Version initiale (gabarit générique).',
  });
  return true;
}

/** Crée une nouvelle version (jamais de modification en place) et l'active. */
export function ajouterVersion(db: Db, promptId: number, contenu: string, note: string | null) {
  const max = db
    .select({ m: sql<number | null>`max(${promptVersions.version})` })
    .from(promptVersions)
    .where(eq(promptVersions.prompt_id, promptId))
    .get()?.m;
  const numero = (max ?? 0) + 1;
  db.update(promptVersions).set({ active: false }).where(eq(promptVersions.prompt_id, promptId)).run();
  return db
    .insert(promptVersions)
    .values({ prompt_id: promptId, version: numero, contenu, note_de_version: note, active: true })
    .returning()
    .get();
}

export function activerVersion(db: Db, promptId: number, versionId: number): boolean {
  const v = db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.id, versionId), eq(promptVersions.prompt_id, promptId)))
    .get();
  if (!v) return false;
  db.update(promptVersions).set({ active: false }).where(eq(promptVersions.prompt_id, promptId)).run();
  db.update(promptVersions).set({ active: true }).where(eq(promptVersions.id, versionId)).run();
  return true;
}
