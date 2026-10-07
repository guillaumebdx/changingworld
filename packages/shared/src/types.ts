export const STATUTS = ['brouillon_ia', 'a_affiner', 'validee', 'non_retenue'] as const;
export type Statut = (typeof STATUTS)[number];

export const IMPACTS = ['INTERESSANT', 'SURPRENANT', 'CHOC'] as const;
export type Impact = (typeof IMPACTS)[number];

export const LETTRES = ['a', 'b', 'c'] as const;
export type Lettre = (typeof LETTRES)[number];

export const LIBELLES_STATUT: Record<Statut, string> = {
  brouillon_ia: 'Brouillon IA',
  a_affiner: 'À affiner',
  validee: 'Validée',
  non_retenue: 'Non retenue',
};

export const LIBELLES_IMPACT: Record<Impact, string> = {
  INTERESSANT: 'Intéressant',
  SURPRENANT: 'Surprenant',
  CHOC: 'Choc',
};

/** Les champs que voit le joueur. */
export interface ChampsJoueur {
  question: string;
  reponse_a: string;
  reponse_b: string;
  reponse_c: string;
  bonne_reponse: Lettre;
  indice_1: string;
  indice_2: string;
  indice_3: string;
  commentaire: string;
  source_nom: string;
  source_lien: string;
}

/** Les champs de travail, jamais affichés au joueur. */
export interface ChampsCoulisses {
  fait: string;
  chiffres: string;
  calculs: string;
  resultat: string;
}

/** Le contenu éditable d'une question (joueur + coulisses + impact). */
export interface ContenuQuestion extends ChampsJoueur, ChampsCoulisses {
  impact: Impact;
}

export type ChampTexte = keyof Omit<ContenuQuestion, 'bonne_reponse' | 'impact'>;

export const CHAMPS_JOUEUR_TEXTE = [
  'question',
  'reponse_a',
  'reponse_b',
  'reponse_c',
  'indice_1',
  'indice_2',
  'indice_3',
  'commentaire',
  'source_nom',
  'source_lien',
] as const satisfies readonly ChampTexte[];

export const CHAMPS_COULISSES = ['fait', 'chiffres', 'calculs', 'resultat'] as const satisfies readonly ChampTexte[];

export const LIBELLES_CHAMP: Record<keyof ContenuQuestion, string> = {
  fait: 'Fait',
  chiffres: 'Chiffres',
  calculs: 'Calculs',
  resultat: 'Résultat',
  question: 'Question',
  reponse_a: 'Réponse A',
  reponse_b: 'Réponse B',
  reponse_c: 'Réponse C',
  bonne_reponse: 'Bonne réponse',
  indice_1: 'Indice 1',
  indice_2: 'Indice 2',
  indice_3: 'Indice 3',
  commentaire: 'Commentaire',
  source_nom: 'Source',
  source_lien: 'Lien source',
  impact: 'Impact',
};

/** Une question complète telle que servie à l'admin. */
export interface Question extends ContenuQuestion {
  id: number;
  numero: number;
  created_at: string;
  updated_at: string;
  categorie_id: number;
  sous_categorie_id: number;
  format_id: number;
  statut: Statut;
  date_examen: string | null;
  commentaire_interne: string | null;
  prompt_version_id: number | null;
  modele_ia: string | null;
}

/** Une question enrichie des libellés pour l'affichage. */
export interface QuestionAffichee extends Question {
  categorie_nom: string;
  categorie_couleur: string;
  sous_categorie_nom: string;
  format_nom: string;
  format_code: string;
  prompt_version_numero: number | null;
  prompt_nom: string | null;
}

/** Une question telle que servie à l'app joueur (aucun champ interne). */
export interface QuestionPublique extends ChampsJoueur {
  id: number;
  numero: number;
  categorie: { id: number; nom: string; couleur: string };
  sous_categorie: { id: number; nom: string };
  format: { id: number; code: string; nom: string };
  impact: Impact;
}

export interface Categorie {
  id: number;
  nom: string;
  couleur: string;
  ordre: number;
}

export interface SousCategorie {
  id: number;
  categorie_id: number;
  nom: string;
  nb_questions_cible: number | null;
  ordre: number;
}

export interface Format {
  id: number;
  code: string;
  nom: string;
  gabarit: string | null;
  exemple: string | null;
  reponses: string | null;
  ressort: string | null;
  actif: boolean;
}

export interface Prompt {
  id: number;
  format_id: number | null;
  nom: string;
  created_at: string;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version: number;
  contenu: string;
  note_de_version: string | null;
  active: boolean;
  created_at: string;
}

export interface EntreeHistorique {
  id: number;
  question_id: number;
  snapshot: ContenuQuestion & { statut?: Statut; commentaire_interne?: string | null };
  auteur: 'ia' | 'bernard';
  created_at: string;
}

export interface RemarqueRelecture {
  gravite: 'bloquant' | 'important' | 'mineur';
  sujet: string;
  detail: string;
}
