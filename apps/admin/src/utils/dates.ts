function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

/** 07.10.2026 */
export function formaterDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${deuxChiffres(d.getDate())}.${deuxChiffres(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 07.10.2026 à 09:12 */
export function formaterDateHeure(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${formaterDate(iso)} à ${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
}

/** « il y a 3 min », « hier », etc. pour l'historique. */
export function formaterRelatif(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const ecart = Date.now() - d;
  const min = Math.round(ecart / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} jours`;
  return formaterDate(iso);
}
