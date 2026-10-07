import type { ChampsJoueur, Lettre } from './types.js';
import { LETTRES } from './types.js';
import type { Bareme } from './score.js';
import { calculerPoints, enjeu, type NbIndices } from './score.js';

/**
 * État d'une partie sur une question, indépendant de toute interface.
 * Sert à l'aperçu de l'admin aujourd'hui et à l'app joueur demain.
 */
export interface EtatPartie {
  /** Nombre d'indices révélés (0 à 3). */
  indices: NbIndices;
  /** Réponse choisie, ou null tant que le joueur n'a pas répondu. */
  choix: Lettre | null;
}

export const ETAT_INITIAL: EtatPartie = { indices: 0, choix: null };

export function demanderIndice(etat: EtatPartie): EtatPartie {
  if (etat.choix !== null || etat.indices >= 3) return etat;
  return { ...etat, indices: (etat.indices + 1) as NbIndices };
}

export function repondre(etat: EtatPartie, choix: Lettre): EtatPartie {
  if (etat.choix !== null) return etat;
  return { ...etat, choix };
}

export interface IndiceVisible {
  numero: 1 | 2 | 3;
  texte: string;
  /** « 10 → 6 » : l'enjeu avant et après cet indice. */
  descente: { avant: number; apres: number };
}

export interface ReponseVue {
  lettre: Lettre;
  texte: string;
  /** Apparence de la ligne de réponse. */
  aspect: 'neutre' | 'estompee' | 'bonne' | 'fausse';
  /** Étiquette affichée à droite de la réponse. */
  mention: 'BONNE RÉPONSE' | 'VOTRE RÉPONSE' | null;
}

export interface VueJoueur {
  phase: 'question' | 'reponse';
  verdict: 'juste' | 'faux' | null;
  indicesVisibles: IndiceVisible[];
  reponses: ReponseVue[];
  /** Enjeu courant pendant la phase question. */
  gain: number;
  perte: number;
  /** Points obtenus une fois la réponse donnée. */
  points: number | null;
  indicesUtilises: NbIndices;
  peutDemanderIndice: boolean;
  libelleIndice: string;
  compteurIndices: string;
  /** Descente du barème : 10 → 6 → 4 → 2, avec l'index courant. */
  descenteBareme: number[];
}

export function texteReponse(q: ChampsJoueur, lettre: Lettre): string {
  return lettre === 'a' ? q.reponse_a : lettre === 'b' ? q.reponse_b : q.reponse_c;
}

export function texteIndice(q: ChampsJoueur, numero: 1 | 2 | 3): string {
  return numero === 1 ? q.indice_1 : numero === 2 ? q.indice_2 : q.indice_3;
}

/** Première lettre qui n'est pas la bonne réponse, pour simuler une réponse fausse. */
export function premiereMauvaiseLettre(bonne: Lettre): Lettre {
  return LETTRES.find((l) => l !== bonne) ?? 'a';
}

/** Dérive tout ce que l'écran joueur doit afficher à partir de la question, de l'état et du barème. */
export function vueJoueur(q: ChampsJoueur, etat: EtatPartie, bareme: Bareme): VueJoueur {
  const { gain, perte } = enjeu(bareme, etat.indices);
  const repondu = etat.choix !== null;
  const juste = repondu && etat.choix === q.bonne_reponse;

  const indicesVisibles: IndiceVisible[] = ([1, 2, 3] as const)
    .filter((n) => n <= etat.indices)
    .map((n) => ({
      numero: n,
      texte: texteIndice(q, n),
      descente: { avant: bareme.gains[n - 1] ?? 0, apres: bareme.gains[n] ?? 0 },
    }));

  const reponses: ReponseVue[] = LETTRES.map((lettre) => {
    const texte = texteReponse(q, lettre);
    if (!repondu) return { lettre, texte, aspect: 'neutre', mention: null };
    if (lettre === q.bonne_reponse) {
      return { lettre, texte, aspect: 'bonne', mention: juste ? 'VOTRE RÉPONSE' : 'BONNE RÉPONSE' };
    }
    if (lettre === etat.choix) return { lettre, texte, aspect: 'fausse', mention: 'VOTRE RÉPONSE' };
    return { lettre, texte, aspect: 'estompee', mention: null };
  });

  return {
    phase: repondu ? 'reponse' : 'question',
    verdict: repondu ? (juste ? 'juste' : 'faux') : null,
    indicesVisibles,
    reponses,
    gain,
    perte,
    points: repondu ? calculerPoints(bareme, etat.indices, juste) : null,
    indicesUtilises: etat.indices,
    peutDemanderIndice: !repondu && etat.indices < 3,
    libelleIndice:
      etat.indices >= 3
        ? "Plus d'indice disponible"
        : etat.indices === 2
          ? 'Demander le dernier indice'
          : 'Demander un indice',
    compteurIndices: `${etat.indices} / 3`,
    descenteBareme: [...bareme.gains],
  };
}

export function libelleIndicesUtilises(n: number): string {
  if (n === 0) return 'Aucun indice utilisé';
  if (n === 1) return '1 indice utilisé';
  return `${n} indices utilisés`;
}
