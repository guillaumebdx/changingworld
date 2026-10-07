export class ErreurApi extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly corps: unknown = null,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

export const EVENEMENT_DECONNEXION = 'cw:deconnexion';

interface OptionsApi extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit | null;
}

/** Appel JSON vers l'API. Les erreurs HTTP deviennent des ErreurApi avec le message du serveur. */
export async function api<T>(chemin: string, options: OptionsApi = {}): Promise<T> {
  const { json, headers, ...reste } = options;
  const res = await fetch(chemin, {
    credentials: 'same-origin',
    ...reste,
    headers: {
      accept: 'application/json',
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: json !== undefined ? JSON.stringify(json) : reste.body,
  });
  if (!res.ok) throw await versErreur(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function versErreur(res: Response): Promise<ErreurApi> {
  let corps: unknown = null;
  let message = `Le serveur a répondu ${res.status}.`;
  try {
    corps = await res.json();
    const m = (corps as { erreur?: string }).erreur;
    if (m) message = m;
  } catch {
    // corps non JSON
  }
  if (res.status === 401) window.dispatchEvent(new Event(EVENEMENT_DECONNEXION));
  if (res.status === 429 && !corps) message = 'Trop de tentatives. Patientez une minute.';
  return new ErreurApi(res.status, message, corps);
}

export type GestionnaireSSE = (evenement: string, donnees: unknown) => void;

/** Lit un flux Server-Sent Events et appelle `surEvenement` pour chaque message. */
export async function lireSSE(res: Response, surEvenement: GestionnaireSSE, signal?: AbortSignal): Promise<void> {
  if (!res.body) return;
  const lecteur = res.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = '';
  const traiterBloc = (bloc: string) => {
    let evenement = 'message';
    const lignesDonnees: string[] = [];
    for (const ligne of bloc.split('\n')) {
      if (ligne.startsWith('event:')) evenement = ligne.slice(6).trim();
      else if (ligne.startsWith('data:')) lignesDonnees.push(ligne.slice(5).trimStart());
    }
    if (lignesDonnees.length === 0) return;
    const brut = lignesDonnees.join('\n');
    let donnees: unknown = brut;
    try {
      donnees = JSON.parse(brut);
    } catch {
      // données non JSON : on transmet la chaîne
    }
    surEvenement(evenement, donnees);
  };
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { value, done } = await lecteur.read();
      if (done) break;
      tampon += decodeur.decode(value, { stream: true });
      let index: number;
      while ((index = tampon.indexOf('\n\n')) !== -1) {
        const bloc = tampon.slice(0, index);
        tampon = tampon.slice(index + 2);
        if (bloc.trim()) traiterBloc(bloc);
      }
    }
    if (tampon.trim()) traiterBloc(tampon);
  } finally {
    lecteur.releaseLock();
  }
}

/** POST JSON dont la réponse est un flux SSE. */
export async function fluxSSE(chemin: string, json: unknown, surEvenement: GestionnaireSSE, signal?: AbortSignal): Promise<void> {
  const res = await fetch(chemin, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(json),
    signal,
  });
  if (!res.ok) throw await versErreur(res);
  await lireSSE(res, surEvenement, signal);
}
