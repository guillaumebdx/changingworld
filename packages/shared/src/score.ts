export interface Bareme {
  /** Gains pour 0, 1, 2 et 3 indices utilisés. */
  gains: [number, number, number, number];
  /** Pertes (valeurs positives) pour 0, 1, 2 et 3 indices utilisés. */
  pertes: [number, number, number, number];
}

export const BAREME_DEFAUT: Bareme = {
  gains: [10, 6, 4, 2],
  pertes: [5, 3, 2, 1],
};

export type NbIndices = 0 | 1 | 2 | 3;

export function bornerIndices(n: number): NbIndices {
  if (!Number.isFinite(n)) return 0;
  return Math.min(3, Math.max(0, Math.floor(n))) as NbIndices;
}

/** Points obtenus pour une réponse, selon le nombre d'indices utilisés. Négatif si la réponse est fausse. */
export function calculerPoints(bareme: Bareme, indicesUtilises: number, juste: boolean): number {
  const n = bornerIndices(indicesUtilises);
  return juste ? bareme.gains[n] : -bareme.pertes[n];
}

/** L'enjeu courant : ce que le joueur gagne ou perd s'il répond maintenant. */
export function enjeu(bareme: Bareme, indicesUtilises: number): { gain: number; perte: number } {
  const n = bornerIndices(indicesUtilises);
  return { gain: bareme.gains[n], perte: bareme.pertes[n] };
}

/** Formate un score signé avec le vrai signe moins typographique. */
export function formaterPoints(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${Math.abs(points)}`;
  return '0';
}

export function baremeValide(b: unknown): b is Bareme {
  if (!b || typeof b !== 'object') return false;
  const { gains, pertes } = b as Partial<Bareme>;
  const ok = (t: unknown) => Array.isArray(t) && t.length === 4 && t.every((x) => typeof x === 'number' && Number.isFinite(x));
  return ok(gains) && ok(pertes);
}
