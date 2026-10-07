export interface ResultatLien {
  etat: 'ok' | 'ko';
  statut: number | null;
  detail: string;
  url_finale?: string;
}

const ENTETES = {
  'user-agent': 'Mozilla/5.0 (compatible; ChangingWorldAdmin/1.0; +https://changing-world.local)',
  accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
};

async function tenter(url: string, methode: 'HEAD' | 'GET', delaiMs: number): Promise<Response> {
  return fetch(url, { method: methode, redirect: 'follow', headers: ENTETES, signal: AbortSignal.timeout(delaiMs) });
}

/** HEAD d'abord, GET en repli (certains serveurs refusent HEAD), 5 s de délai à chaque tentative. */
export async function verifierLien(url: string, delaiMs = 5000): Promise<ResultatLien> {
  let u: URL;
  try {
    u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocole');
  } catch {
    return { etat: 'ko', statut: null, detail: 'URL invalide' };
  }
  try {
    const tete = await tenter(u.href, 'HEAD', delaiMs);
    if (tete.ok) return { etat: 'ok', statut: tete.status, detail: `HTTP ${tete.status}`, url_finale: tete.url };
    if (tete.status === 405 || tete.status === 403 || tete.status === 400 || tete.status >= 500) {
      const corps = await tenter(u.href, 'GET', delaiMs);
      if (corps.ok) return { etat: 'ok', statut: corps.status, detail: `HTTP ${corps.status}`, url_finale: corps.url };
      return { etat: 'ko', statut: corps.status, detail: `HTTP ${corps.status}` };
    }
    return { etat: 'ko', statut: tete.status, detail: `HTTP ${tete.status}` };
  } catch (e) {
    try {
      const corps = await tenter(u.href, 'GET', delaiMs);
      if (corps.ok) return { etat: 'ok', statut: corps.status, detail: `HTTP ${corps.status}`, url_finale: corps.url };
      return { etat: 'ko', statut: corps.status, detail: `HTTP ${corps.status}` };
    } catch (e2) {
      const err = e2 instanceof Error ? e2 : e instanceof Error ? e : null;
      const detail = err?.name === 'TimeoutError' ? 'délai de 5 s dépassé' : (err?.message ?? 'erreur réseau');
      return { etat: 'ko', statut: null, detail };
    }
  }
}
