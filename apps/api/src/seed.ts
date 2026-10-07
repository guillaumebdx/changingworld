import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';
import { BAREME_DEFAUT, type Impact, type Lettre, type Statut } from '@changing-world/shared';
import { lireEnv, RACINE, type Env } from './env.js';
import { ouvrirBase, schema, type Db } from './db/index.js';
import { PROMPT_SYSTEME_INITIAL, PROMPTS_FORMATS_INITIAUX, PROMPT_FORMAT_GENERIQUE } from './ia/promptsInitiaux.js';
import { creerPromptAvecVersion } from './services/prompts.js';
import { ajouterHistorique, prochainNumero } from './services/questions.js';
import { reglageExiste } from './services/reglages.js';

const { categories, sousCategories, formats, prompts, questions, reglages } = schema;

/** Couleurs du design (README des maquettes), par début de nom de catégorie. */
const COULEURS: [string, string][] = [
  ['Démographie', '#A8432C'],
  ['Économie', '#1D5B45'],
  ['Santé', '#A3344F'],
  ['Technologie', '#2A4A80'],
  ['Transport', '#8A6516'],
  ['Urbanisation', '#4D4669'],
  ['Agriculture', '#5F6B22'],
  ['Éducation', '#1E6274'],
];

/** Cible par défaut quand le fichier n'en donne pas : visible dans les compteurs. */
const CIBLE_PAR_DEFAUT = 10;

interface TaxonomieJson {
  categorie: string;
  sous_categories: string[];
}

interface FormatJson {
  code: string;
  nom: string;
  actif: boolean;
  gabarit: string | null;
  exemple: string | null;
  reponses: string | null;
  ressort: string | null;
}

interface QuestionJson {
  question: string;
  reponse_a: string;
  reponse_b: string;
  reponse_c: string;
  bonne_reponse: string;
  indice_1: string;
  indice_2: string;
  indice_3: string;
  commentaire: string;
  source_nom: string;
  source_lien: string;
  statut: string;
  commentaire_interne: string | null;
  categorie: string;
  sous_categorie: string;
  fait: string | null;
  chiffres: string | null;
  calculs: string | null;
  resultat: string | null;
  type: string;
  impact: string;
}

function lireJson<T>(nom: string, dossier: string): T {
  return JSON.parse(readFileSync(resolve(dossier, nom), 'utf8')) as T;
}

function couleurPour(nom: string): string {
  return COULEURS.find(([prefixe]) => nom.startsWith(prefixe))?.[1] ?? '#514940';
}

function normaliserImpact(brut: string): Impact {
  const n = brut.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (n === 'CHOC') return 'CHOC';
  if (n === 'SURPRENANT') return 'SURPRENANT';
  return 'INTERESSANT';
}

function normaliserStatut(brut: string): Statut {
  const ok: Statut[] = ['brouillon_ia', 'a_affiner', 'validee', 'non_retenue'];
  return ok.includes(brut as Statut) ? (brut as Statut) : 'a_affiner';
}

/** Devine le format d'une question de Bernard à partir de sa formulation. */
function devinerFormat(q: QuestionJson): string {
  const t = q.question.toLowerCase();
  if (/plus .*ou moins|plus élevé ou moins|plus ou moins/.test(t)) return 'sens_ampleur';
  if (/^en \d{4}.*combien|même trajet|valait/.test(t)) return 'ancrage';
  if (/combien de temps a-t-il fallu|pour que .* (double|triple|atteigne)/.test(t)) return 'duree';
  if (/quel moment|quelle époque|quel siècle|quelle année/.test(t)) return 'datation';
  if (/quelle? ét(ait|aient)|quel était/.test(t)) return 'niveau';
  return 'niveau';
}

export interface ResultatSeed {
  categories: number;
  sousCategories: number;
  formats: number;
  prompts: number;
  questions: number;
}

/** Charge /seed dans la base. Idempotent : ce qui existe déjà (par nom, code ou intitulé) est conservé. */
export function chargerSeed(db: Db, env: Env, dossierSeed = resolve(RACINE, 'seed')): ResultatSeed {
  const resultat: ResultatSeed = { categories: 0, sousCategories: 0, formats: 0, prompts: 0, questions: 0 };

  // Taxonomie
  const taxo = lireJson<TaxonomieJson[]>('taxonomie.json', dossierSeed);
  taxo.forEach((cat, iCat) => {
    let ligne = db.select().from(categories).where(eq(categories.nom, cat.categorie)).get();
    if (!ligne) {
      ligne = db.insert(categories).values({ nom: cat.categorie, couleur: couleurPour(cat.categorie), ordre: iCat }).returning().get();
      resultat.categories++;
    }
    cat.sous_categories.forEach((nom, iSous) => {
      const existante = db
        .select()
        .from(sousCategories)
        .where(and(eq(sousCategories.categorie_id, ligne!.id), eq(sousCategories.nom, nom)))
        .get();
      if (!existante) {
        db.insert(sousCategories)
          .values({ categorie_id: ligne!.id, nom, nb_questions_cible: CIBLE_PAR_DEFAUT, ordre: iSous })
          .run();
        resultat.sousCategories++;
      }
    });
  });

  // Sous-catégorie manquante utilisée par une question de Bernard
  const techno = db.select().from(categories).where(eq(categories.nom, 'Technologie & Innovation')).get();
  if (techno) {
    const vapeur = db
      .select()
      .from(sousCategories)
      .where(and(eq(sousCategories.categorie_id, techno.id), eq(sousCategories.nom, 'Machine à vapeur')))
      .get();
    if (!vapeur) {
      db.insert(sousCategories)
        .values({ categorie_id: techno.id, nom: 'Machine à vapeur', nb_questions_cible: CIBLE_PAR_DEFAUT, ordre: 4 })
        .run();
      resultat.sousCategories++;
    }
  }

  // Formats
  const fmts = lireJson<FormatJson[]>('formats.json', dossierSeed);
  for (const f of fmts) {
    if (!db.select().from(formats).where(eq(formats.code, f.code)).get()) {
      db.insert(formats)
        .values({
          code: f.code,
          nom: f.nom,
          gabarit: f.gabarit,
          exemple: f.exemple,
          reponses: f.reponses,
          ressort: f.ressort,
          actif: f.actif,
        })
        .run();
      resultat.formats++;
    }
  }

  // Prompts : système + un par format actif
  if (!db.select().from(prompts).where(isNull(prompts.format_id)).get()) {
    creerPromptAvecVersion(db, {
      format_id: null,
      nom: 'Prompt système commun',
      contenu: PROMPT_SYSTEME_INITIAL,
      note: 'Version initiale : règles éditoriales, mécanique du jeu, méthode.',
    });
    resultat.prompts++;
  }
  for (const f of db.select().from(formats).where(eq(formats.actif, true)).all()) {
    if (!db.select().from(prompts).where(eq(prompts.format_id, f.id)).get()) {
      creerPromptAvecVersion(db, {
        format_id: f.id,
        nom: f.nom,
        contenu: PROMPTS_FORMATS_INITIAUX[f.code] ?? PROMPT_FORMAT_GENERIQUE,
        note: 'Version initiale.',
      });
      resultat.prompts++;
    }
  }

  // Questions de Bernard
  const qs = lireJson<QuestionJson[]>('questions-bernard.json', dossierSeed);
  for (const q of qs) {
    if (db.select().from(questions).where(eq(questions.question, q.question)).get()) continue;
    const cat = db
      .select()
      .from(categories)
      .all()
      .find((c) => c.nom === q.categorie || c.nom.startsWith(q.categorie));
    if (!cat) {
      console.warn(`Catégorie inconnue « ${q.categorie} » : question ignorée.`);
      continue;
    }
    let sous = db
      .select()
      .from(sousCategories)
      .where(and(eq(sousCategories.categorie_id, cat.id), eq(sousCategories.nom, q.sous_categorie)))
      .get();
    if (!sous) {
      sous = db
        .insert(sousCategories)
        .values({ categorie_id: cat.id, nom: q.sous_categorie, nb_questions_cible: CIBLE_PAR_DEFAUT, ordre: 99 })
        .returning()
        .get();
      resultat.sousCategories++;
    }
    const format = db.select().from(formats).where(eq(formats.code, devinerFormat(q))).get();
    if (!format) continue;
    const statut = normaliserStatut(q.statut);
    const bonne = (['a', 'b', 'c'].includes(q.bonne_reponse) ? q.bonne_reponse : 'a') as Lettre;
    const insere = db
      .insert(questions)
      .values({
        numero: prochainNumero(db),
        categorie_id: cat.id,
        sous_categorie_id: sous.id,
        format_id: format.id,
        impact: normaliserImpact(q.impact),
        question: q.question,
        reponse_a: q.reponse_a,
        reponse_b: q.reponse_b,
        reponse_c: q.reponse_c,
        bonne_reponse: bonne,
        indice_1: q.indice_1,
        indice_2: q.indice_2,
        indice_3: q.indice_3,
        commentaire: q.commentaire,
        source_nom: q.source_nom,
        source_lien: q.source_lien,
        fait: q.fait ?? '',
        chiffres: q.chiffres ?? '',
        calculs: q.calculs ?? '',
        resultat: q.resultat ?? '',
        statut,
        date_examen: statut === 'brouillon_ia' ? null : new Date().toISOString(),
        commentaire_interne: q.commentaire_interne,
        modele_ia: null,
      })
      .returning({ id: questions.id })
      .get();
    ajouterHistorique(db, insere.id, 'bernard');
    resultat.questions++;
  }

  // Réglages par défaut
  if (!reglageExiste(db, 'bareme')) db.insert(reglages).values({ cle: 'bareme', valeur: JSON.stringify(BAREME_DEFAUT) }).run();
  if (!reglageExiste(db, 'modele_ia')) db.insert(reglages).values({ cle: 'modele_ia', valeur: env.OPENAI_MODEL }).run();
  if (!reglageExiste(db, 'temperature')) db.insert(reglages).values({ cle: 'temperature', valeur: '0.7' }).run();

  return resultat;
}

const lanceDirectement = process.argv[1]?.replace(/\\/g, '/').endsWith('/seed.ts');
if (lanceDirectement) {
  const env = lireEnv();
  const db = ouvrirBase(env.DATABASE_PATH);
  const r = chargerSeed(db, env);
  console.log(
    `Seed terminé : ${r.categories} catégories, ${r.sousCategories} sous-catégories, ${r.formats} formats, ${r.prompts} prompts, ${r.questions} questions ajoutés.`,
  );
  console.log(`Base : ${env.DATABASE_PATH}`);
}
