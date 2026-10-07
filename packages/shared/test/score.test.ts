import { describe, expect, it } from 'vitest';
import { BAREME_DEFAUT, calculerPoints, enjeu, formaterPoints } from '../src/score.js';
import { ETAT_INITIAL, demanderIndice, repondre, vueJoueur } from '../src/etatJeu.js';
import type { ChampsJoueur } from '../src/types.js';

describe('calculerPoints : toutes les combinaisons du barème', () => {
  const cas: [number, boolean, number][] = [
    [0, true, 10],
    [0, false, -5],
    [1, true, 6],
    [1, false, -3],
    [2, true, 4],
    [2, false, -2],
    [3, true, 2],
    [3, false, -1],
  ];
  it.each(cas)('%i indice(s), juste=%s → %i', (indices, juste, attendu) => {
    expect(calculerPoints(BAREME_DEFAUT, indices, juste)).toBe(attendu);
  });

  it('borne le nombre d’indices entre 0 et 3', () => {
    expect(calculerPoints(BAREME_DEFAUT, 7, true)).toBe(2);
    expect(calculerPoints(BAREME_DEFAUT, -2, false)).toBe(-5);
  });

  it('respecte un barème personnalisé', () => {
    const bareme = { gains: [20, 12, 8, 4] as [number, number, number, number], pertes: [10, 6, 4, 2] as [number, number, number, number] };
    expect(calculerPoints(bareme, 1, true)).toBe(12);
    expect(calculerPoints(bareme, 3, false)).toBe(-2);
    expect(enjeu(bareme, 2)).toEqual({ gain: 8, perte: 4 });
  });

  it('formate les points avec le vrai signe moins', () => {
    expect(formaterPoints(10)).toBe('+10');
    expect(formaterPoints(-5)).toBe('−5');
    expect(formaterPoints(0)).toBe('0');
  });
});

const question: ChampsJoueur = {
  question: 'Q ?',
  reponse_a: 'A',
  reponse_b: 'B',
  reponse_c: 'C',
  bonne_reponse: 'c',
  indice_1: 'i1',
  indice_2: 'i2',
  indice_3: 'i3',
  commentaire: 'Com.',
  source_nom: 'S',
  source_lien: 'https://exemple.org',
};

describe('état de jeu', () => {
  it('révèle les indices un à un et fait descendre l’enjeu', () => {
    let etat = ETAT_INITIAL;
    expect(vueJoueur(question, etat, BAREME_DEFAUT).gain).toBe(10);
    etat = demanderIndice(etat);
    etat = demanderIndice(etat);
    const vue = vueJoueur(question, etat, BAREME_DEFAUT);
    expect(vue.indicesVisibles.map((i) => i.texte)).toEqual(['i1', 'i2']);
    expect(vue.gain).toBe(4);
    expect(vue.perte).toBe(2);
    expect(vue.libelleIndice).toBe('Demander le dernier indice');
  });

  it('ne dépasse pas trois indices', () => {
    let etat = ETAT_INITIAL;
    for (let i = 0; i < 5; i++) etat = demanderIndice(etat);
    expect(etat.indices).toBe(3);
    expect(vueJoueur(question, etat, BAREME_DEFAUT).peutDemanderIndice).toBe(false);
  });

  it('marque la bonne et la mauvaise réponse après le choix', () => {
    const etat = repondre(demanderIndice(ETAT_INITIAL), 'a');
    const vue = vueJoueur(question, etat, BAREME_DEFAUT);
    expect(vue.verdict).toBe('faux');
    expect(vue.points).toBe(-3);
    expect(vue.reponses.find((r) => r.lettre === 'a')?.aspect).toBe('fausse');
    expect(vue.reponses.find((r) => r.lettre === 'c')?.aspect).toBe('bonne');
    expect(vue.reponses.find((r) => r.lettre === 'b')?.aspect).toBe('estompee');
  });

  it('ne change plus d’état après la réponse', () => {
    const etat = repondre(ETAT_INITIAL, 'c');
    expect(demanderIndice(etat)).toBe(etat);
    expect(repondre(etat, 'a')).toBe(etat);
    expect(vueJoueur(question, etat, BAREME_DEFAUT).points).toBe(10);
  });
});
