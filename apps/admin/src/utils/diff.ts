export interface LigneDiff {
  type: 'egal' | 'ajout' | 'retrait';
  texte: string;
}

/** Diff ligne à ligne par plus longue sous-séquence commune. Suffisant pour des prompts de quelques dizaines de lignes. */
export function diffLignes(avant: string, apres: string): LigneDiff[] {
  const a = avant.split('\n');
  const b = apres.split('\n');
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const resultat: LigneDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      resultat.push({ type: 'egal', texte: a[i]! });
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      resultat.push({ type: 'retrait', texte: a[i]! });
      i++;
    } else {
      resultat.push({ type: 'ajout', texte: b[j]! });
      j++;
    }
  }
  while (i < n) resultat.push({ type: 'retrait', texte: a[i++]! });
  while (j < m) resultat.push({ type: 'ajout', texte: b[j++]! });
  return resultat;
}
