import { BAREME_DEFAUT, baremeValide, type Reglages } from '@changing-world/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import type { Env } from '../env.js';

const { reglages } = schema;

export function lireReglages(db: Db, env: Env): Reglages {
  const lignes = db.select().from(reglages).all();
  const table = new Map(lignes.map((l) => [l.cle, l.valeur]));
  let bareme = BAREME_DEFAUT;
  const brut = table.get('bareme');
  if (brut) {
    try {
      const parse = JSON.parse(brut) as unknown;
      if (baremeValide(parse)) bareme = parse;
    } catch {
      // barème illisible : on garde la valeur par défaut
    }
  }
  const temperature = Number(table.get('temperature') ?? 0.7);
  return {
    bareme,
    modele_ia: table.get('modele_ia') || env.OPENAI_MODEL,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
  };
}

export function ecrireReglages(db: Db, valeurs: Reglages): void {
  const entrees: [string, string][] = [
    ['bareme', JSON.stringify(valeurs.bareme)],
    ['modele_ia', valeurs.modele_ia],
    ['temperature', String(valeurs.temperature)],
  ];
  for (const [cle, valeur] of entrees) {
    db.insert(reglages).values({ cle, valeur }).onConflictDoUpdate({ target: reglages.cle, set: { valeur } }).run();
  }
}

export function reglageExiste(db: Db, cle: string): boolean {
  return db.select().from(reglages).where(eq(reglages.cle, cle)).get() !== undefined;
}
