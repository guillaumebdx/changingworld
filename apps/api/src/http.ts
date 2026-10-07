import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

/** Lit et valide le corps JSON d'une requête. Renvoie une 400 lisible en cas d'erreur. */
export async function lireCorps<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  let brut: unknown;
  try {
    brut = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Le corps de la requête doit être du JSON.' });
  }
  const resultat = schema.safeParse(brut);
  if (!resultat.success) {
    const premiere = resultat.error.issues[0];
    const chemin = premiere?.path.join('.') ?? '';
    throw new HTTPException(400, {
      message: `Données invalides${chemin ? ` (${chemin})` : ''} : ${premiere?.message ?? 'schéma non respecté'}.`,
    });
  }
  return resultat.data;
}

export function lireId(c: Context, nom = 'id'): number {
  const n = Number(c.req.param(nom));
  if (!Number.isInteger(n) || n <= 0) throw new HTTPException(400, { message: `Identifiant « ${nom} » invalide.` });
  return n;
}

export function introuvable(quoi: string): HTTPException {
  return new HTTPException(404, { message: `${quoi} introuvable.` });
}

export function conflit(message: string): HTTPException {
  return new HTTPException(409, { message });
}

export function hasard<T>(liste: T[]): T | undefined {
  if (liste.length === 0) return undefined;
  return liste[Math.floor(Math.random() * liste.length)];
}
