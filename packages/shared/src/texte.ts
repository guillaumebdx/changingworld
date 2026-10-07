/** Normalise un texte pour les comparaisons : minuscules, sans accents, sans ponctuation, espaces réduits. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrait les nombres d'un texte (gère « 1 800 », « 1,041 », « 7500 », « 33 »). */
export function extraireNombres(texte: string): number[] {
  const resultats: number[] = [];
  // \s couvre l'espace, l'espace insécable (U+00A0) et l'espace fine insécable (U+202F)
  const motif = /\d+(?:\s\d{3})*(?:[.,]\d+)?/g;
  for (const m of texte.matchAll(motif)) {
    const brut = m[0].replace(/\s/g, '').replace(',', '.');
    const n = Number(brut);
    if (Number.isFinite(n)) resultats.push(n);
  }
  return resultats;
}

/** Mots d'au moins 3 lettres, normalisés. */
export function mots(texte: string): string[] {
  return normaliser(texte)
    .split(' ')
    .filter((m) => m.length >= 3);
}

const MOTS_VIDES = new Set([
  'les',
  'des',
  'une',
  'dans',
  'pour',
  'que',
  'qui',
  'est',
  'ete',
  'etait',
  'sur',
  'par',
  'avec',
  'plus',
  'moins',
  'combien',
  'quel',
  'quelle',
  'quels',
  'quelles',
  'quand',
  'temps',
  'ans',
  'annee',
  'annees',
  'environ',
  'eleve',
  'elevee',
  'partir',
  'fallu',
  'moment',
  'epoque',
]);

/** Coefficient de Dice sur les bigrammes de caractères des mots significatifs. */
export function similarite(a: string, b: string): number {
  const bigrammes = (texte: string) => {
    const sac = new Map<string, number>();
    const na = mots(texte).filter((m) => !MOTS_VIDES.has(m)).join(' ');
    for (let i = 0; i < na.length - 1; i++) {
      const bg = na.slice(i, i + 2);
      if (bg.includes(' ')) continue;
      sac.set(bg, (sac.get(bg) ?? 0) + 1);
    }
    return sac;
  };
  const sa = bigrammes(a);
  const sb = bigrammes(b);
  let commun = 0;
  for (const [bg, n] of sa) commun += Math.min(n, sb.get(bg) ?? 0);
  const total = [...sa.values()].reduce((s, n) => s + n, 0) + [...sb.values()].reduce((s, n) => s + n, 0);
  return total === 0 ? 0 : (2 * commun) / total;
}

/** Nombre de phrases approximatif (séparateurs . ! ? suivis d'une majuscule ou de la fin). */
export function compterPhrases(texte: string): number {
  const t = texte.trim();
  if (!t) return 0;
  const morceaux = t.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý«(])/);
  return morceaux.filter((m) => m.trim().length > 0).length;
}

export function estUrlValide(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
