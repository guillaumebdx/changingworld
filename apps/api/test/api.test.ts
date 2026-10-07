import { beforeAll, describe, expect, it } from 'vitest';
import { creerApp, type App } from '../src/app.js';
import { LimiteurTentatives } from '../src/auth.js';
import { ouvrirBase } from '../src/db/index.js';
import { lireEnv } from '../src/env.js';
import { ClientDemo } from '../src/ia/client.js';
import { chargerSeed } from '../src/seed.js';

const MOT_DE_PASSE = 'secret-de-test';
let app: App;
let cookie = '';

async function connecter(): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
    body: JSON.stringify({ mot_de_passe: MOT_DE_PASSE }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie.split(';')[0]!;
}

function admin(chemin: string, init: RequestInit = {}) {
  return app.request(chemin, {
    ...init,
    headers: { 'content-type': 'application/json', cookie, ...(init.headers as Record<string, string> | undefined) },
  });
}

/** Lit un flux SSE complet et renvoie les événements. */
function lireSSE(texte: string): { event: string; data: unknown }[] {
  return texte
    .split('\n\n')
    .filter((bloc) => bloc.trim())
    .map((bloc) => {
      const event = bloc.match(/^event: (.+)$/m)?.[1] ?? 'message';
      const data = bloc.match(/^data: (.+)$/m)?.[1] ?? '{}';
      return { event, data: JSON.parse(data) as unknown };
    });
}

beforeAll(() => {
  const env = lireEnv({
    ADMIN_PASSWORD: MOT_DE_PASSE,
    SESSION_SECRET: 'un-secret-de-test-suffisamment-long',
    OPENAI_API_KEY: null,
    DATABASE_PATH: ':memory:',
    TEST: true,
    PRODUCTION: false,
  });
  const db = ouvrirBase(':memory:');
  chargerSeed(db, env);
  app = creerApp({ db, env, ia: new ClientDemo(0), limiteur: new LimiteurTentatives(5, 60_000) });
});

describe('authentification', () => {
  it('refuse la route admin sans session', async () => {
    const res = await app.request('/api/admin/questions');
    expect(res.status).toBe(401);
  });

  it('refuse un mauvais mot de passe puis limite les tentatives', async () => {
    const tenter = () =>
      app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.99' },
        body: JSON.stringify({ mot_de_passe: 'faux' }),
      });
    for (let i = 0; i < 5; i++) expect((await tenter()).status).toBe(401);
    expect((await tenter()).status).toBe(429);
  });

  it('ouvre une session avec le bon mot de passe et la ferme', async () => {
    cookie = await connecter();
    expect(cookie.startsWith('cw_session=')).toBe(true);
    const session = await admin('/api/auth/session');
    expect(((await session.json()) as { connecte: boolean }).connecte).toBe(true);

    const liste = await admin('/api/admin/questions');
    expect(liste.status).toBe(200);
    const corps = (await liste.json()) as { questions: unknown[] };
    expect(corps.questions).toHaveLength(5);

    const sortie = await admin('/api/auth/logout', { method: 'POST' });
    expect(sortie.status).toBe(200);
    const cookieEfface = sortie.headers.get('set-cookie') ?? '';
    const apres = await app.request('/api/admin/questions', { headers: { cookie: cookieEfface.split(';')[0]! } });
    expect(apres.status).toBe(401);
  });
});

describe('routes publiques', () => {
  it('ne renvoie que les questions validées, sans champs internes', async () => {
    const res = await app.request('/api/public/questions');
    expect(res.status).toBe(200);
    const { questions } = (await res.json()) as { questions: Record<string, unknown>[] };
    expect(questions).toHaveLength(4);
    for (const q of questions) {
      expect(q).not.toHaveProperty('statut');
      expect(q).not.toHaveProperty('fait');
      expect(q).not.toHaveProperty('chiffres');
      expect(q).not.toHaveProperty('calculs');
      expect(q).not.toHaveProperty('resultat');
      expect(q).not.toHaveProperty('commentaire_interne');
      expect(q).not.toHaveProperty('prompt_version_id');
      expect(q).toHaveProperty('bonne_reponse');
      expect(q).toHaveProperty('categorie');
    }
    expect(questions.some((q) => String(q.question).includes('New York'))).toBe(false);
  });

  it('expose la taxonomie avec la sous-catégorie « Machine à vapeur »', async () => {
    const res = await app.request('/api/public/taxonomie');
    const { categories } = (await res.json()) as { categories: { nom: string; sous_categories: { nom: string }[] }[] };
    expect(categories).toHaveLength(8);
    const techno = categories.find((c) => c.nom.startsWith('Technologie'));
    expect(techno?.sous_categories.map((s) => s.nom)).toContain('Machine à vapeur');
  });
});

describe('cycle de vie d’une question', () => {
  let id = 0;

  it('crée une question au hasard puis la génère en streaming', async () => {
    cookie = cookie || (await connecter());
    const creation = await admin('/api/admin/questions', { method: 'POST', body: JSON.stringify({}) });
    expect(creation.status).toBe(201);
    const { question } = (await creation.json()) as { question: { id: number; statut: string; numero: number } };
    id = question.id;
    expect(question.statut).toBe('brouillon_ia');
    expect(question.numero).toBe(6);

    const gen = await admin(`/api/admin/questions/${id}/generer`, { method: 'POST', body: JSON.stringify({ consigne: 'test' }) });
    expect(gen.status).toBe(200);
    expect(gen.headers.get('content-type')).toContain('text/event-stream');
    const evenements = lireSSE(await gen.text());
    expect(evenements.some((e) => e.event === 'champ')).toBe(true);
    const fin = evenements.find((e) => e.event === 'fin');
    expect(fin).toBeDefined();
    const q = (fin!.data as { question: { question: string; prompt_version_id: number | null; modele_ia: string } }).question;
    expect(q.question.length).toBeGreaterThan(10);
    expect(q.prompt_version_id).not.toBeNull();
    expect(q.modele_ia).toContain('démo');
  });

  it('régénère un champ et garde une trace dans l’historique', async () => {
    const avant = await admin(`/api/admin/questions/${id}`);
    const { question } = (await avant.json()) as { question: Record<string, unknown> };
    const contenu = Object.fromEntries(
      [
        'question',
        'reponse_a',
        'reponse_b',
        'reponse_c',
        'bonne_reponse',
        'indice_1',
        'indice_2',
        'indice_3',
        'commentaire',
        'source_nom',
        'source_lien',
        'fait',
        'chiffres',
        'calculs',
        'resultat',
        'impact',
      ].map((k) => [k, question[k]]),
    );
    const regen = await admin(`/api/admin/questions/${id}/regenerer`, {
      method: 'POST',
      body: JSON.stringify({ champ: 'indice_2', consigne: 'moins évident', contenu }),
    });
    expect(regen.status).toBe(200);
    const fin = lireSSE(await regen.text()).find((e) => e.event === 'fin');
    expect(fin).toBeDefined();
    expect((fin!.data as { champs: Record<string, string> }).champs).toHaveProperty('indice_2');

    const hist = await admin(`/api/admin/questions/${id}/historique`);
    const { historique } = (await hist.json()) as { historique: { auteur: string }[] };
    expect(historique.length).toBeGreaterThanOrEqual(2);
    expect(historique.every((h) => h.auteur === 'ia')).toBe(true);
  });

  it('refuse la validation si un champ joueur manque, puis valide et publie', async () => {
    const avant = await admin(`/api/admin/questions/${id}`);
    const { question } = (await avant.json()) as { question: Record<string, unknown> };
    const base = {
      ...question,
      categorie_id: question.categorie_id,
      sous_categorie_id: question.sous_categorie_id,
      format_id: question.format_id,
    };
    const casse = await admin(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify({ ...base, indice_3: '' }) });
    expect(casse.status).toBe(200);
    const refus = await admin(`/api/admin/questions/${id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'validee' }) });
    expect(refus.status).toBe(409);

    const repare = await admin(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(base) });
    expect(repare.status).toBe(200);
    const ok = await admin(`/api/admin/questions/${id}/statut`, {
      method: 'POST',
      body: JSON.stringify({ statut: 'validee', commentaire_interne: 'Relu.' }),
    });
    expect(ok.status).toBe(200);
    const { question: validee } = (await ok.json()) as { question: { statut: string; date_examen: string | null } };
    expect(validee.statut).toBe('validee');
    expect(validee.date_examen).not.toBeNull();

    const publiques = await app.request('/api/public/questions');
    const { questions } = (await publiques.json()) as { questions: { id: number }[] };
    expect(questions.some((q) => q.id === id)).toBe(true);
  });

  it('signale l’incohérence de la question sur l’espérance de vie côté données', async () => {
    const liste = await admin('/api/admin/questions?q=esperance');
    const { questions } = (await liste.json()) as { questions: { resultat: string; reponse_a: string; bonne_reponse: string }[] };
    expect(questions).toHaveLength(1);
    expect(questions[0]!.resultat).toBe('Environ 40 ans');
    expect(questions[0]!.bonne_reponse).toBe('a');
    expect(questions[0]!.reponse_a).toBe('Environ 33 ans');
  });
});

describe('prompts', () => {
  it('crée une version à chaque enregistrement et l’active', async () => {
    const liste = await admin('/api/admin/prompts');
    const { prompts } = (await liste.json()) as { prompts: { id: number; format_id: number | null; version_active: { version: number } }[] };
    expect(prompts.length).toBeGreaterThanOrEqual(6);
    const systeme = prompts.find((p) => p.format_id === null)!;
    expect(systeme.version_active.version).toBe(1);

    const creation = await admin(`/api/admin/prompts/${systeme.id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ contenu: 'Nouveau prompt {{exemples}} {{questions_existantes}}', note_de_version: 'Test' }),
    });
    expect(creation.status).toBe(201);
    const detail = await admin(`/api/admin/prompts/${systeme.id}`);
    const { versions } = (await detail.json()) as { versions: { version: number; active: boolean }[] };
    expect(versions).toHaveLength(2);
    expect(versions[0]!.version).toBe(2);
    expect(versions[0]!.active).toBe(true);
    expect(versions[1]!.active).toBe(false);
  });

  it('exporte un classeur xlsx', async () => {
    const res = await admin('/api/admin/export.xlsx');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    const octets = new Uint8Array(await res.arrayBuffer());
    // Signature ZIP d'un fichier Office Open XML
    expect(octets[0]).toBe(0x50);
    expect(octets[1]).toBe(0x4b);
  });
});
