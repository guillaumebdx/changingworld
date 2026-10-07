import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import type { Env } from './env.js';

export const NOM_COOKIE = 'cw_session';
const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/** Compare deux chaînes en temps constant, via leurs empreintes SHA-256 (même longueur garantie). */
export function comparerEnTempsConstant(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

/** Limiteur en mémoire : au plus `max` tentatives par fenêtre glissante et par clé (IP). */
export class LimiteurTentatives {
  private tentatives = new Map<string, number[]>();

  constructor(
    private readonly max = 5,
    private readonly fenetreMs = 60_000,
  ) {}

  /** Renvoie true si la tentative est autorisée (et l'enregistre). */
  autoriser(cle: string, maintenant = Date.now()): boolean {
    const liste = (this.tentatives.get(cle) ?? []).filter((t) => maintenant - t < this.fenetreMs);
    if (liste.length >= this.max) {
      this.tentatives.set(cle, liste);
      return false;
    }
    liste.push(maintenant);
    this.tentatives.set(cle, liste);
    return true;
  }

  reinitialiser(cle: string): void {
    this.tentatives.delete(cle);
  }
}

export function adresseClient(c: Context): string {
  const transmis = c.req.header('x-forwarded-for');
  if (transmis) return transmis.split(',')[0]!.trim();
  const info = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket
    ?.remoteAddress;
  return info ?? 'inconnue';
}

export async function ouvrirSession(c: Context, env: Env): Promise<void> {
  const expiration = Date.now() + DUREE_SESSION_MS;
  await setSignedCookie(c, NOM_COOKIE, String(expiration), env.SESSION_SECRET, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: env.PRODUCTION,
    path: '/',
    maxAge: DUREE_SESSION_MS / 1000,
  });
}

export function fermerSession(c: Context): void {
  deleteCookie(c, NOM_COOKIE, { path: '/' });
}

export async function sessionValide(c: Context, env: Env): Promise<boolean> {
  const valeur = await getSignedCookie(c, env.SESSION_SECRET, NOM_COOKIE);
  if (!valeur) return false;
  const expiration = Number(valeur);
  return Number.isFinite(expiration) && expiration > Date.now();
}

export function exigerSession(env: Env): MiddlewareHandler {
  return async (c, next) => {
    if (!(await sessionValide(c, env))) {
      return c.json({ erreur: 'Connexion requise.' }, 401);
    }
    await next();
  };
}
