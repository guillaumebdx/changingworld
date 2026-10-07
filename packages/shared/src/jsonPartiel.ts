/**
 * Lecture tolérante d'un objet JSON en cours de streaming.
 * On ne gère que des valeurs chaînes de premier niveau : c'est le cas de nos schémas de génération.
 * Les champs terminés sont renvoyés complets, le champ en cours est renvoyé tel qu'il est écrit.
 */
export function extraireChampsPartiels(json: string): Record<string, string> {
  const resultat: Record<string, string> = {};
  const motif = /"([a-zA-Z0-9_]+)"\s*:\s*"((?:[^"\\]|\\.)*\\?)("|$)/g;
  for (const m of json.matchAll(motif)) {
    const cle = m[1]!;
    const brut = m[2] ?? '';
    const termine = m[3] === '"';
    resultat[cle] = decoderChaine(termine ? brut : retirerEchappementIncomplet(brut));
  }
  return resultat;
}

function retirerEchappementIncomplet(s: string): string {
  // Une barre oblique inverse seule en fin de flux : on l'ignore jusqu'au prochain morceau.
  return s.endsWith('\\') && !s.endsWith('\\\\') ? s.slice(0, -1) : s;
}

function decoderChaine(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    // Séquence unicode coupée au milieu : on garde ce qui est lisible.
    return s
      .replace(/\\u[0-9a-fA-F]{0,3}$/, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}
