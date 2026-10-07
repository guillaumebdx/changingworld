import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BAREME_DEFAUT,
  IMPACTS,
  LETTRES,
  LIBELLES_IMPACT,
  ORDRE_GENERATION,
  demanderIndice,
  premiereMauvaiseLettre,
  repondre,
  verifierQuestion,
  type ChampRegenerable,
  type ContenuQuestion,
  type Controle,
  type EtatLien,
  type EtatPartie,
  type Impact,
  type Lettre,
  type MiseAJourQuestion,
  type QuestionAffichee,
  type RemarqueRelecture,
  type Statut,
} from '@changing-world/shared';
import { ErreurApi, fluxSSE } from '../api/client';
import {
  useChangerStatut,
  useEnregistrerQuestion,
  useFormats,
  useHistorique,
  useIntitules,
  useInvaliderQuestion,
  useQuestion,
  useQuestions,
  useReglages,
  useRelecture,
  useRestaurer,
  useSupprimerQuestion,
  useTaxonomie,
  useVerifierLien,
} from '../api/hooks';
import { Bouton } from '../components/ui/Bouton';
import { Selection, ZoneTexte } from '../components/ui/Champ';
import { EnTetePage } from '../components/ui/EnTetePage';
import { Avis, Chargement, Erreur } from '../components/ui/Etats';
import { EtiquetteStatut } from '../components/ui/Etiquettes';
import { IconeChevron } from '../components/ui/Icones';
import { BoutonRegenerer, ChampGenere } from '../components/editeur/ChampGenere';
import { Historique } from '../components/editeur/Historique';
import { PointsAVerifier } from '../components/editeur/PointsAVerifier';
import { RelectureIA } from '../components/editeur/RelectureIA';
import { PhonePreview } from '../components/joueur/PhonePreview';
import { QuestionCard } from '../components/joueur/QuestionCard';
import { ETAT_APERCU_INITIAL, SelecteurEtat, type EtatApercu } from '../components/joueur/SelecteurEtat';
import { formaterDateHeure } from '../utils/dates';

interface Formulaire extends ContenuQuestion {
  categorie_id: number;
  sous_categorie_id: number;
  format_id: number;
  commentaire_interne: string;
}

function depuisQuestion(q: QuestionAffichee): Formulaire {
  return {
    question: q.question,
    reponse_a: q.reponse_a,
    reponse_b: q.reponse_b,
    reponse_c: q.reponse_c,
    bonne_reponse: q.bonne_reponse,
    indice_1: q.indice_1,
    indice_2: q.indice_2,
    indice_3: q.indice_3,
    commentaire: q.commentaire,
    source_nom: q.source_nom,
    source_lien: q.source_lien,
    fait: q.fait,
    chiffres: q.chiffres,
    calculs: q.calculs,
    resultat: q.resultat,
    impact: q.impact,
    categorie_id: q.categorie_id,
    sous_categorie_id: q.sous_categorie_id,
    format_id: q.format_id,
    commentaire_interne: q.commentaire_interne ?? '',
  };
}

function contenuDepuis(f: Formulaire): ContenuQuestion {
  const { categorie_id: _c, sous_categorie_id: _s, format_id: _f, commentaire_interne: _i, ...contenu } = f;
  return contenu;
}

function corpsDepuis(f: Formulaire): MiseAJourQuestion {
  return { ...contenuDepuis(f), categorie_id: f.categorie_id, sous_categorie_id: f.sous_categorie_id, format_id: f.format_id, commentaire_interne: f.commentaire_interne || null };
}

interface Generation {
  active: boolean;
  /** 'tout' pour une génération complète, sinon la cible régénérée. */
  cible: 'tout' | ChampRegenerable | null;
  champCourant: string | null;
  erreur: string | null;
}

const GENERATION_INACTIVE: Generation = { active: false, cible: null, champCourant: null, erreur: null };

const CHAMPS_PAR_CIBLE: Record<ChampRegenerable, string[]> = {
  fait: ['fait'],
  chiffres: ['chiffres'],
  calculs: ['calculs'],
  resultat: ['resultat'],
  question: ['question'],
  reponses: ['reponse_a', 'reponse_b', 'reponse_c', 'bonne_reponse'],
  indice_1: ['indice_1'],
  indice_2: ['indice_2'],
  indice_3: ['indice_3'],
  commentaire: ['commentaire'],
  source: ['source_nom', 'source_lien'],
};

export default function Editeur() {
  const { id } = useParams();
  const idNum = Number(id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const question = useQuestion(idNum);
  const liste = useQuestions({});
  const taxonomie = useTaxonomie();
  const formats = useFormats();
  const reglages = useReglages();
  const intitules = useIntitules();
  const historique = useHistorique(idNum);
  const enregistrer = useEnregistrerQuestion(idNum);
  const changerStatut = useChangerStatut(idNum);
  const restaurer = useRestaurer(idNum);
  const relecture = useRelecture(idNum);
  const verifLien = useVerifierLien();
  const supprimer = useSupprimerQuestion();
  const invalider = useInvaliderQuestion();

  const [form, setForm] = useState<Formulaire | null>(null);
  const [formPour, setFormPour] = useState<number | null>(null);
  const [sauvegarde, setSauvegarde] = useState('');
  const [generation, setGeneration] = useState<Generation>(GENERATION_INACTIVE);
  const [apercu, setApercu] = useState<EtatApercu>(ETAT_APERCU_INITIAL);
  const [coulissesOuvertes, setCoulissesOuvertes] = useState(false);
  const [lien, setLien] = useState<{ url: string; etat: EtatLien; detail?: string }>({ url: '', etat: 'inconnu' });
  const [remarques, setRemarques] = useState<RemarqueRelecture[] | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [refusValidation, setRefusValidation] = useState<Controle[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationLancee = useRef(false);

  const bareme = reglages.data?.reglages.bareme ?? BAREME_DEFAUT;

  /* ---- Initialisation du formulaire quand la question arrive ou change ---- */
  useEffect(() => {
    if (!question.data || formPour === question.data.id) return;
    const f = depuisQuestion(question.data);
    setForm(f);
    setSauvegarde(JSON.stringify(f));
    setFormPour(question.data.id);
    setGeneration(GENERATION_INACTIVE);
    setApercu(ETAT_APERCU_INITIAL);
    setRemarques(null);
    setMessage(null);
    setRefusValidation(null);
    setLien({ url: f.source_lien, etat: 'inconnu' });
    generationLancee.current = false;
    abortRef.current?.abort();
  }, [question.data, formPour]);

  // Annule la génération si on quitte la page
  useEffect(() => () => abortRef.current?.abort(), []);

  const modifie = form !== null && JSON.stringify(form) !== sauvegarde;

  const majChamp = useCallback(<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) => {
    setForm((f) => (f ? { ...f, [champ]: valeur } : f));
  }, []);

  /* ---- Génération en streaming ---- */
  const traiterFlux = useCallback(
    (cible: 'tout' | ChampRegenerable) => (evenement: string, donnees: unknown) => {
      if (evenement === 'champ') {
        const { champ, valeur } = donnees as { champ: string; valeur: string };
        setForm((f) => (f ? { ...f, [champ]: valeur } : f));
        setGeneration((g) => ({ ...g, champCourant: champ }));
      } else if (evenement === 'fin') {
        const q = (donnees as { question: QuestionAffichee }).question;
        const f = depuisQuestion(q);
        setForm((prec) =>
          cible === 'tout' || !prec
            ? f
            : { ...prec, ...Object.fromEntries(CHAMPS_PAR_CIBLE[cible].map((c) => [c, f[c as keyof Formulaire]])) },
        );
        setSauvegarde(JSON.stringify(cible === 'tout' ? f : { ...f }));
        setLien({ url: f.source_lien, etat: 'inconnu' });
        invalider(idNum, q);
      } else if (evenement === 'erreur') {
        setGeneration((g) => ({ ...g, erreur: (donnees as { message: string }).message }));
      }
    },
    [idNum, invalider],
  );

  const lancerGeneration = useCallback(
    async (consigne: string | null) => {
      abortRef.current?.abort();
      const controleur = new AbortController();
      abortRef.current = controleur;
      setGeneration({ active: true, cible: 'tout', champCourant: null, erreur: null });
      setRemarques(null);
      try {
        await fluxSSE(`/api/admin/questions/${idNum}/generer`, { consigne: consigne ?? undefined }, traiterFlux('tout'), controleur.signal);
      } catch (e) {
        if (!controleur.signal.aborted) setGeneration((g) => ({ ...g, erreur: e instanceof Error ? e.message : String(e) }));
      } finally {
        if (!controleur.signal.aborted) setGeneration((g) => ({ ...g, active: false, cible: null, champCourant: null }));
      }
    },
    [idNum, traiterFlux],
  );

  const lancerRegeneration = useCallback(
    async (cible: ChampRegenerable, consigne: string) => {
      if (!form) return;
      abortRef.current?.abort();
      const controleur = new AbortController();
      abortRef.current = controleur;
      setGeneration({ active: true, cible, champCourant: null, erreur: null });
      try {
        await fluxSSE(
          `/api/admin/questions/${idNum}/regenerer`,
          { champ: cible, consigne: consigne || undefined, contenu: contenuDepuis(form) },
          traiterFlux(cible),
          controleur.signal,
        );
      } catch (e) {
        if (!controleur.signal.aborted) setGeneration((g) => ({ ...g, erreur: e instanceof Error ? e.message : String(e) }));
      } finally {
        if (!controleur.signal.aborted) setGeneration((g) => ({ ...g, active: false, cible: null, champCourant: null }));
      }
    },
    [form, idNum, traiterFlux],
  );

  // Démarrage automatique après « Nouvelle question »
  useEffect(() => {
    if (!form || formPour !== idNum || generationLancee.current) return;
    if (params.get('generer') === '1') {
      generationLancee.current = true;
      const consigne = params.get('consigne');
      setParams({}, { replace: true });
      void lancerGeneration(consigne);
    }
  }, [form, formPour, idNum, params, setParams, lancerGeneration]);

  const annulerGeneration = () => {
    abortRef.current?.abort();
    setGeneration(GENERATION_INACTIVE);
  };

  /* ---- Enregistrement et statut ---- */
  const sauver = useCallback(async (): Promise<boolean> => {
    if (!form) return false;
    try {
      const q = await enregistrer.mutateAsync(corpsDepuis(form));
      const f = depuisQuestion(q);
      setSauvegarde(JSON.stringify({ ...form, ...f }));
      setForm((prec) => (prec ? { ...prec, ...f } : f));
      setMessage({ type: 'ok', texte: `Enregistrée à ${formaterDateHeure(q.updated_at).split(' à ')[1] ?? ''}` });
      return true;
    } catch (e) {
      setMessage({ type: 'erreur', texte: e instanceof Error ? e.message : 'Enregistrement impossible.' });
      return false;
    }
  }, [enregistrer, form]);

  const appliquerStatut = useCallback(
    async (statut: Statut) => {
      if (!form) return;
      setRefusValidation(null);
      if (modifie && !(await sauver())) return;
      try {
        await changerStatut.mutateAsync({ statut, commentaire_interne: form.commentaire_interne || null });
        setMessage({
          type: 'ok',
          texte: statut === 'validee' ? 'Question validée : elle est disponible pour l’app.' : statut === 'a_affiner' ? 'Question marquée « à affiner ».' : 'Question écartée.',
        });
      } catch (e) {
        if (e instanceof ErreurApi && e.status === 409) {
          setRefusValidation(((e.corps as { controles?: Controle[] })?.controles ?? []) as Controle[]);
        } else {
          setMessage({ type: 'erreur', texte: e instanceof Error ? e.message : 'Changement de statut impossible.' });
        }
      }
    },
    [changerStatut, form, modifie, sauver],
  );

  // Raccourcis clavier
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (modifie) void sauver();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void appliquerStatut('validee');
      }
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [modifie, sauver, appliquerStatut]);

  /* ---- Lien source ---- */
  const verifierLien = useCallback(
    (url: string) => {
      if (!url.trim()) return;
      setLien({ url, etat: 'en_cours' });
      verifLien.mutate(url, {
        onSuccess: (r) => setLien({ url, etat: r.etat, detail: r.detail }),
        onError: (e) => setLien({ url, etat: 'ko', detail: e.message }),
      });
    },
    [verifLien],
  );

  // Vérification automatique à l'ouverture, une fois par URL
  useEffect(() => {
    if (!form || generation.active) return;
    if (form.source_lien.trim() && lien.etat === 'inconnu' && lien.url === form.source_lien) verifierLien(form.source_lien);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formPour, generation.active]);

  /* ---- Contrôles ---- */
  const controles = useMemo(() => {
    if (!form) return [];
    const lienCourant = form.source_lien === lien.url ? lien.etat : 'inconnu';
    return verifierQuestion(contenuDepuis(form), {
      intitulesExistants: intitules.data,
      idCourant: idNum,
      etatLien: lienCourant,
      detailLien: lien.detail,
    });
  }, [form, intitules.data, idNum, lien]);

  /* ---- Aperçu ---- */
  const etatPartie: EtatPartie = useMemo(() => {
    const bonne = (LETTRES as readonly string[]).includes(form?.bonne_reponse ?? '') ? (form!.bonne_reponse as Lettre) : 'a';
    return {
      indices: apercu.indices,
      choix: apercu.verdict === 'juste' ? bonne : apercu.verdict === 'faux' ? premiereMauvaiseLettre(bonne) : null,
    };
  }, [apercu, form]);

  /* ---- Rendu ---- */
  if (question.isPending || (question.data && !form)) {
    return <Chargement texte="Ouverture de la question…" />;
  }
  if (question.isError || !question.data || !form) {
    return (
      <>
        <EnTetePage titre="Question introuvable" />
        <Erreur erreur={question.error ?? 'Cette question n’existe pas ou a été supprimée.'} />
        <Link to="/" className="mt-4 inline-block text-[13px]">
          ← Retour à la liste
        </Link>
      </>
    );
  }

  const q = question.data;
  const categorie = taxonomie.data?.categories.find((c) => c.id === form.categorie_id);
  const sousCategories = categorie?.sous_categories ?? [];
  const sousCategorie = sousCategories.find((s) => s.id === form.sous_categorie_id);
  const formatsVisibles = (formats.data ?? []).filter((f) => f.actif || f.id === form.format_id);
  const verrouille = generation.active;

  const indexListe = liste.data?.findIndex((x) => x.id === q.id) ?? -1;
  const precedente = indexListe > 0 ? liste.data![indexListe - 1] : null;
  const suivante = indexListe >= 0 && liste.data && indexListe < liste.data.length - 1 ? liste.data[indexListe + 1] : null;

  const enCours = (champ: string) => generation.active && generation.champCourant === champ;
  const enAttente = (champ: string) => {
    if (!generation.active || generation.cible !== 'tout') return false;
    const iChamp = ORDRE_GENERATION.indexOf(champ as (typeof ORDRE_GENERATION)[number]);
    const iCourant = generation.champCourant ? ORDRE_GENERATION.indexOf(generation.champCourant as (typeof ORDRE_GENERATION)[number]) : -1;
    return iChamp > iCourant;
  };
  const enCoursCible = (cible: ChampRegenerable) => generation.active && generation.cible === cible;

  const meta = q.prompt_version_numero
    ? `Générée le ${formaterDateHeure(q.created_at)} · prompt « ${q.prompt_nom} » v${q.prompt_version_numero}${q.modele_ia ? ` · ${q.modele_ia}` : ''}`
    : q.statut === 'brouillon_ia' && !q.question.trim()
      ? `Créée le ${formaterDateHeure(q.created_at)} · en attente de génération`
      : `Importée le ${formaterDateHeure(q.created_at)} · saisie par Bernard`;

  return (
    <>
      <EnTetePage
        titre={`Question ${q.numero}`}
        etiquette={<EtiquetteStatut statut={q.statut} />}
        sousTitre={`${meta}${q.date_examen ? ` · examinée le ${formaterDateHeure(q.date_examen)}` : ''}`}
        actions={
          <>
            <button
              type="button"
              aria-label="Question précédente"
              disabled={!precedente}
              onClick={() => precedente && navigate(`/questions/${precedente.id}`)}
              className="min-h-[40px] min-w-[44px] rounded-fin border border-filet-fort bg-surface text-encre-70 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="etiquette-sm text-encre-70">
              {indexListe >= 0 && liste.data ? `${indexListe + 1} / ${liste.data.length}` : '…'}
            </span>
            <button
              type="button"
              aria-label="Question suivante"
              disabled={!suivante}
              onClick={() => suivante && navigate(`/questions/${suivante.id}`)}
              className="min-h-[40px] min-w-[44px] rounded-fin border border-filet-fort bg-surface text-encre-70 disabled:opacity-40"
            >
              ›
            </button>
          </>
        }
      />

      {generation.active && generation.cible === 'tout' ? (
        <Avis className="mb-5 flex items-center justify-between gap-3">
          <span>L’IA rédige la question : les faits d’abord, puis la question, les réponses, les indices, le commentaire et la source.</span>
          <button type="button" onClick={annulerGeneration} className="etiquette-xs flex-none text-indice-texte underline underline-offset-[3px]">
            Annuler
          </button>
        </Avis>
      ) : null}
      {generation.erreur ? (
        <Erreur
          titre="La génération n’a pas abouti"
          erreur={generation.erreur}
          className="mb-5"
          reessayer={() => (generation.cible === 'tout' || !generation.cible ? lancerGeneration(null) : undefined)}
        />
      ) : null}

      <div className="flex flex-wrap items-start gap-10">
        {/* ---------------- Formulaire ---------------- */}
        <div className="min-w-0 flex-[999_1_540px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[18px] pb-5">
            <Selection
              etiquette="Catégorie"
              pastille={categorie?.couleur ?? null}
              value={form.categorie_id}
              onChange={(e) => {
                const cat = taxonomie.data?.categories.find((c) => c.id === Number(e.target.value));
                setForm((f) => (f ? { ...f, categorie_id: Number(e.target.value), sous_categorie_id: cat?.sous_categories[0]?.id ?? f.sous_categorie_id } : f));
              }}
            >
              {taxonomie.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Selection>
            <Selection etiquette="Sous-catégorie" value={form.sous_categorie_id} onChange={(e) => majChamp('sous_categorie_id', Number(e.target.value))}>
              {sousCategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Selection>
            <Selection etiquette="Format" value={form.format_id} onChange={(e) => majChamp('format_id', Number(e.target.value))}>
              {formatsVisibles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                  {f.actif ? '' : ' (inactif)'}
                </option>
              ))}
            </Selection>
          </div>

          <section className="border-t border-filet py-[18px]">
            <ChampGenere
              etiquette="Question"
              valeur={form.question}
              onChange={(v) => majChamp('question', v)}
              cible="question"
              onRegenerer={lancerRegeneration}
              enCours={enCours('question') || enCoursCible('question')}
              enAttente={enAttente('question')}
              verrouille={verrouille}
              multiligne
              lignes={2}
              compteur
              classeTexte="font-titre-doux text-[20px] font-semibold leading-[1.3] px-3.5 py-3"
              placeholder="La question telle que le joueur la lira"
            />
          </section>

          <section className="border-t border-filet py-[18px]">
            <div className="mb-[11px] flex items-center justify-between gap-2">
              <span className="etiquette text-encre-70">Réponses — cocher la bonne</span>
              <BoutonRegenerer cible="reponses" onRegenerer={lancerRegeneration} verrouille={verrouille} libelle="Régénérer les trois" />
            </div>
            <div className="flex flex-col gap-2">
              {LETTRES.map((lettre) => {
                const champ = `reponse_${lettre}` as 'reponse_a' | 'reponse_b' | 'reponse_c';
                const estBonne = form.bonne_reponse === lettre;
                const ecriture = enCours(champ) || enCoursCible('reponses');
                return (
                  <div key={lettre} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="bonne_reponse"
                      id={`bonne-${lettre}`}
                      checked={estBonne}
                      onChange={() => majChamp('bonne_reponse', lettre)}
                      className="m-0 h-[17px] w-[17px] flex-none accent-juste"
                    />
                    <label htmlFor={`bonne-${lettre}`} className={`w-[13px] flex-none font-mono text-[12px] font-semibold ${estBonne ? 'text-encre' : 'text-encre-50'}`}>
                      {lettre.toUpperCase()}
                    </label>
                    {enAttente(champ) ? (
                      <div className="champ flex-1 border-dashed border-indice bg-indice-fond-ia py-[14px]" aria-busy="true">
                        <div className="squelette h-[9px] w-[40%]" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        aria-label={`Réponse ${lettre.toUpperCase()}`}
                        value={form[champ]}
                        onChange={(e) => majChamp(champ, e.target.value)}
                        className={`champ flex-1 ${estBonne ? 'border-juste font-semibold' : ''} ${ecriture ? 'border-dashed border-indice bg-indice-fond-ia' : ''}`}
                      />
                    )}
                    {estBonne ? <span className="etiquette-xs flex-none text-juste-texte">Bonne réponse</span> : <span className="w-[84px] flex-none" />}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-t border-filet py-[18px]">
            <div className="mb-[11px] flex items-center justify-between gap-2">
              <span className="etiquette text-encre-70">Indices — du plus vague au plus précis</span>
              <span className="etiquette-xs text-encre-30">Enjeu {bareme.gains.join(' → ')}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {([1, 2, 3] as const).map((n) => {
                const champ = `indice_${n}` as 'indice_1' | 'indice_2' | 'indice_3';
                return (
                  <ChampGenere
                    key={n}
                    etiquette={`Indice ${n}`}
                    teinte="indice"
                    valeur={form[champ]}
                    onChange={(v) => majChamp(champ, v)}
                    cible={champ}
                    onRegenerer={lancerRegeneration}
                    enCours={enCours(champ) || enCoursCible(champ)}
                    enAttente={enAttente(champ)}
                    verrouille={verrouille}
                    multiligne
                    lignes={2}
                    classeTexte="text-[13px] text-encre-80"
                    enEvidence={controles.some((c) => c.champ === champ && c.niveau !== 'info')}
                  />
                );
              })}
            </div>
          </section>

          <section className="border-t border-filet py-[18px]">
            <ChampGenere
              etiquette="Commentaire révélé après réponse"
              valeur={form.commentaire}
              onChange={(v) => majChamp('commentaire', v)}
              cible="commentaire"
              onRegenerer={lancerRegeneration}
              enCours={enCours('commentaire') || enCoursCible('commentaire')}
              enAttente={enAttente('commentaire')}
              verrouille={verrouille}
              multiligne
              lignes={3}
              classeTexte="text-[13px] text-encre-80 leading-[1.5]"
            />
          </section>

          <section className="grid grid-cols-[1fr_1.25fr] gap-[18px] border-t border-filet py-[18px] max-md:grid-cols-1">
            <ChampGenere
              etiquette="Source"
              valeur={form.source_nom}
              onChange={(v) => majChamp('source_nom', v)}
              cible="source"
              onRegenerer={lancerRegeneration}
              enCours={enCours('source_nom') || enCoursCible('source')}
              enAttente={enAttente('source_nom')}
              verrouille={verrouille}
            />
            <ChampGenere
              etiquette="Lien vérifiable"
              valeur={form.source_lien}
              onChange={(v) => {
                majChamp('source_lien', v);
                setLien({ url: v, etat: 'inconnu' });
              }}
              enCours={enCours('source_lien') || enCoursCible('source')}
              enAttente={enAttente('source_lien')}
              mono
              enEvidence={controles.some((c) => c.champ === 'source_lien')}
              droite={
                form.source_lien.trim() ? (
                  <a href={form.source_lien} target="_blank" rel="noreferrer" className="etiquette-xs text-indice-texte no-underline hover:underline">
                    Ouvrir ↗
                  </a>
                ) : null
              }
            />
          </section>

          <section className="border-t border-filet py-[18px]">
            <div className="mb-[9px] etiquette text-encre-70">Impact attendu</div>
            <div className="flex gap-2" role="radiogroup" aria-label="Impact">
              {IMPACTS.map((i) => {
                const actif = form.impact === i;
                const styles: Record<Impact, string> = {
                  CHOC: actif ? 'bg-encre text-papier border-encre' : 'border-filet-fort text-encre-70 hover:border-encre',
                  SURPRENANT: actif ? 'bg-indice-fond text-indice-texte border-indice' : 'border-filet-fort text-encre-70 hover:border-indice',
                  INTERESSANT: actif ? 'bg-surface text-encre-70 border-filet-mute' : 'border-filet-fort text-encre-50 hover:border-filet-mute',
                };
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    onClick={() => majChamp('impact', i)}
                    className={`etiquette-sm min-h-[36px] rounded-fin border px-3.5 font-medium tracking-[0.16em] ${styles[i]}`}
                  >
                    {LIBELLES_IMPACT[i]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-filet py-[18px]">
            <button
              type="button"
              onClick={() => setCoulissesOuvertes((o) => !o)}
              aria-expanded={coulissesOuvertes}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 etiquette text-encre-70">
                <IconeChevron ouvert={coulissesOuvertes} />
                Coulisses — fait, chiffres, calculs, résultat
              </span>
              <span className="etiquette-xs text-encre-30">Jamais montré au joueur</span>
            </button>
            {coulissesOuvertes || (generation.active && generation.cible === 'tout') ? (
              <div className="mt-4 flex flex-col gap-3.5">
                <ChampGenere etiquette="Fait (l’insight)" valeur={form.fait} onChange={(v) => majChamp('fait', v)} cible="fait" onRegenerer={lancerRegeneration} enCours={enCours('fait') || enCoursCible('fait')} enAttente={enAttente('fait')} verrouille={verrouille} multiligne lignes={2} classeTexte="text-[13px]" />
                <ChampGenere etiquette="Chiffres (données brutes)" valeur={form.chiffres} onChange={(v) => majChamp('chiffres', v)} cible="chiffres" onRegenerer={lancerRegeneration} enCours={enCours('chiffres') || enCoursCible('chiffres')} enAttente={enAttente('chiffres')} verrouille={verrouille} multiligne lignes={3} classeTexte="text-[13px]" />
                <ChampGenere etiquette="Calculs" valeur={form.calculs} onChange={(v) => majChamp('calculs', v)} cible="calculs" onRegenerer={lancerRegeneration} enCours={enCours('calculs') || enCoursCible('calculs')} enAttente={enAttente('calculs')} verrouille={verrouille} multiligne lignes={2} classeTexte="text-[13px]" />
                <ChampGenere etiquette="Résultat (doit égaler la bonne réponse)" valeur={form.resultat} onChange={(v) => majChamp('resultat', v)} cible="resultat" onRegenerer={lancerRegeneration} enCours={enCours('resultat') || enCoursCible('resultat')} enAttente={enAttente('resultat')} verrouille={verrouille} enEvidence={controles.some((c) => c.champ === 'resultat')} />
              </div>
            ) : (
              <div className="mt-2 text-[12px] text-encre-50">
                {form.resultat.trim() ? (
                  <>
                    Résultat : <span className="text-encre-80">{form.resultat}</span>
                    {controles.some((c) => c.champ === 'resultat') ? <span className="ml-2 text-faux-vif">· incohérent avec la bonne réponse</span> : null}
                  </>
                ) : (
                  'Aucun fait ni résultat renseigné.'
                )}
              </div>
            )}
          </section>

          <section className="border-t border-filet pb-[22px] pt-[18px]">
            <ZoneTexte
              etiquette="Commentaire interne — jamais publié"
              teinte="interne"
              rows={2}
              value={form.commentaire_interne}
              onChange={(e) => majChamp('commentaire_interne', e.target.value)}
              placeholder="Note pour vous-même : point à revérifier, source alternative…"
            />
          </section>

          <div className="border-t-2 border-encre pt-[18px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <Bouton variante="principal" onClick={() => appliquerStatut('validee')} enCours={changerStatut.isPending} disabled={verrouille} className="px-[26px]">
                Valider
              </Bouton>
              <Bouton variante="affiner" onClick={() => appliquerStatut('a_affiner')} disabled={verrouille || changerStatut.isPending}>
                À affiner
              </Bouton>
              <Bouton variante="tertiaire" onClick={() => appliquerStatut('non_retenue')} disabled={verrouille || changerStatut.isPending}>
                Non retenue
              </Bouton>
              <Bouton variante="tertiaire" onClick={() => sauver()} disabled={!modifie || verrouille} enCours={enregistrer.isPending}>
                Enregistrer
              </Bouton>
              <span className="etiquette-xs ml-auto text-encre-30">⌘S enregistrer · ⌘↵ valider</span>
            </div>
            <div className="mt-3 flex min-h-[20px] flex-wrap items-center gap-3 text-[13px]">
              {modifie ? <span className="etiquette-xs text-indice-texte">Modifications non enregistrées</span> : null}
              {message ? <span className={message.type === 'ok' ? 'text-juste-texte' : 'text-faux-texte'}>{message.texte}</span> : null}
            </div>
            {refusValidation ? (
              <Erreur
                titre="Validation refusée"
                erreur={`La question ne peut pas être validée en l’état : ${refusValidation.map((c) => c.message.replace(/\.$/, '').toLowerCase()).join(' ; ')}.`}
                className="mt-3"
              />
            ) : null}
            {q.statut === 'brouillon_ia' ? (
              <div className="mt-4 border-t border-dotted border-filet-fort pt-3">
                <button
                  type="button"
                  className="etiquette-xs text-encre-30 underline decoration-filet-fort underline-offset-[3px] hover:text-faux-texte"
                  disabled={verrouille}
                  onClick={async () => {
                    await supprimer.mutateAsync(q.id);
                    navigate('/');
                  }}
                >
                  Supprimer ce brouillon
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* ---------------- Aperçu et contrôles ---------------- */}
        <div className="flex min-w-[300px] flex-[1_1_372px] flex-col gap-8">
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-2.5">
              <span className="etiquette text-encre-70">Aperçu joueur</span>
              <span className="etiquette-xs text-encre-30">iPhone 390 pt</span>
            </div>
            <div className="mb-4">
              <SelecteurEtat etat={apercu} onChange={setApercu} />
            </div>
            <PhonePreview>
              <QuestionCard
                question={form}
                categorie={{ nom: categorie?.nom ?? q.categorie_nom, couleur: categorie?.couleur ?? q.categorie_couleur }}
                sousCategorie={sousCategorie?.nom ?? q.sous_categorie_nom}
                impact={(IMPACTS as readonly string[]).includes(form.impact) ? form.impact : 'INTERESSANT'}
                etat={etatPartie}
                bareme={bareme}
                progression={`${q.numero} / ${liste.data?.length ?? '…'}`}
                onDemanderIndice={() => setApercu((a) => ({ ...a, indices: demanderIndice({ indices: a.indices, choix: null }).indices }))}
                onRepondre={(l) => {
                  const bonne = form.bonne_reponse;
                  const e = repondre({ indices: apercu.indices, choix: null }, l);
                  setApercu((a) => ({ ...a, verdict: e.choix === bonne ? 'juste' : 'faux' }));
                }}
              />
            </PhonePreview>
            <div className="etiquette-xs mt-3 leading-[1.7] text-encre-30">
              L’aperçu se met à jour à chaque frappe. Cliquez sur les réponses ou sur « demander un indice » pour jouer la question.
            </div>
          </div>

          <PointsAVerifier
            generationEnCours={generation.active && generation.cible === 'tout'}
            controles={controles}
            etatLien={form.source_lien === lien.url ? lien.etat : 'inconnu'}
            detailLien={lien.detail}
            lienRenseigne={form.source_lien.trim().length > 0}
            onVerifierLien={() => verifierLien(form.source_lien)}
          />

          <RelectureIA
            remarques={remarques}
            enCours={relecture.isPending}
            erreur={relecture.error}
            desactive={verrouille}
            onLancer={() => relecture.mutate(contenuDepuis(form), { onSuccess: (r) => setRemarques(r.remarques) })}
          />

          <Historique
            entrees={historique.data ?? []}
            enCours={restaurer.isPending}
            onRestaurer={(histId) =>
              restaurer.mutate(histId, {
                onSuccess: (qr) => {
                  const f = depuisQuestion(qr);
                  setForm(f);
                  setSauvegarde(JSON.stringify(f));
                  setMessage({ type: 'ok', texte: 'Version restaurée.' });
                },
              })
            }
          />
        </div>
      </div>
    </>
  );
}
