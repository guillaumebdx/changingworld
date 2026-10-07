import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BAREME_DEFAUT, type ChampsJoueur, type Impact, type QuestionGeneree, variablesUtilisees } from '@changing-world/shared';
import { fluxSSE } from '../api/client';
import { useActiverVersion, useNouvelleVersion, usePrompt, usePrompts, useReglages, useTaxonomie, type PromptVersionDetail } from '../api/hooks';
import { DiffVersions } from '../components/prompts/DiffVersions';
import { PhonePreview } from '../components/joueur/PhonePreview';
import { QuestionCard } from '../components/joueur/QuestionCard';
import { Bouton } from '../components/ui/Bouton';
import { Champ } from '../components/ui/Champ';
import { EnTetePage, TitreSection } from '../components/ui/EnTetePage';
import { Avis, Chargement, Erreur, EtatVide } from '../components/ui/Etats';
import { EtiquetteNeutre } from '../components/ui/Etiquettes';
import { formaterDate, formaterDateHeure } from '../utils/dates';

export default function Prompts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const prompts = usePrompts();
  const idNum = id ? Number(id) : null;

  // Sans identifiant, on ouvre le prompt système
  useEffect(() => {
    if (idNum === null && prompts.data && prompts.data.length > 0) {
      const systeme = prompts.data.find((p) => p.format_id === null) ?? prompts.data[0]!;
      navigate(`/prompts/${systeme.id}`, { replace: true });
    }
  }, [idNum, prompts.data, navigate]);

  return (
    <>
      <EnTetePage titre="Prompts de génération" sousTitre="Un prompt système commun, un prompt par format · chaque enregistrement crée une version" />
      {prompts.isPending ? <Chargement /> : null}
      {prompts.isError ? <Erreur erreur={prompts.error} reessayer={() => prompts.refetch()} /> : null}
      {prompts.data ? (
        <div className="flex flex-wrap items-start gap-9">
          <aside className="min-w-[280px] flex-[1_1_320px]">
            <TitreSection>Prompts</TitreSection>
            <div className="border-t border-filet-fort">
              {prompts.data.map((p) => {
                const actif = p.id === idNum;
                return (
                  <Link
                    key={p.id}
                    to={`/prompts/${p.id}`}
                    className={`block border-b px-3.5 py-3 text-encre no-underline ${
                      actif ? 'border-filet-fort bg-surface shadow-[inset_0_0_0_1.5px_var(--color-encre)]' : 'border-filet hover:bg-surface/60'
                    } ${p.format_actif === false ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className={`font-titre text-[16px] ${actif ? 'font-semibold' : 'font-medium'}`}>{p.nom}</span>
                      <span className="flex flex-none items-center gap-2">
                        {p.format_id === null ? <span className="etiquette-xs border border-filet-mute px-1.5 py-0.5 text-encre-50">Système</span> : null}
                        {p.format_actif === false ? <span className="etiquette-xs border border-filet-mute px-1.5 py-0.5 text-encre-50">Format inactif</span> : null}
                        <span className={`font-mono text-[11px] ${actif ? 'font-semibold text-encre' : 'text-encre-50'}`}>v{p.version_active?.version ?? '–'}</span>
                      </span>
                    </div>
                    <div className="etiquette-xs mt-[5px] text-encre-30">
                      {p.nb_questions} question{p.nb_questions > 1 ? 's' : ''} · modifié le {formaterDate(p.derniere_modification)}
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-encre-50">
              Les formats se créent et s’activent dans{' '}
              <Link to="/reglages" className="text-indice-texte">
                Réglages
              </Link>
              . Un format créé reçoit automatiquement un prompt v1.
            </p>
          </aside>
          <div className="min-w-0 flex-[999_1_600px]">
            {idNum ? <EditeurPrompt id={idNum} /> : <Chargement texte="Choix du prompt…" />}
          </div>
        </div>
      ) : null}
    </>
  );
}

function EditeurPrompt({ id }: { id: number }) {
  const detail = usePrompt(id);
  const nouvelleVersion = useNouvelleVersion(id);
  const activer = useActiverVersion(id);
  const [contenu, setContenu] = useState('');
  const [note, setNote] = useState('');
  const [chargePour, setChargePour] = useState<string>('');
  const [comparaison, setComparaison] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);

  const active = detail.data?.versions.find((v) => v.active) ?? detail.data?.versions[0] ?? null;

  // Charge le contenu de la version active quand le prompt change ou qu'une version est enregistrée
  useEffect(() => {
    if (!active) return;
    const cle = `${id}:${active.id}`;
    if (chargePour !== cle) {
      setContenu(active.contenu);
      setNote('');
      setChargePour(cle);
      setComparaison(null);
    }
  }, [active, id, chargePour]);

  const modifie = active ? contenu !== active.contenu : contenu.trim().length > 0;
  const variablesPresentes = useMemo(() => new Set(variablesUtilisees(contenu)), [contenu]);
  const prochaine = (detail.data?.versions[0]?.version ?? 0) + 1;

  const inserer = (nom: string) => {
    const el = zone.current;
    const jeton = `{{${nom}}}`;
    if (!el) {
      setContenu((c) => c + jeton);
      return;
    }
    const debut = el.selectionStart ?? contenu.length;
    const fin = el.selectionEnd ?? contenu.length;
    const nouveau = contenu.slice(0, debut) + jeton + contenu.slice(fin);
    setContenu(nouveau);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(debut + jeton.length, debut + jeton.length);
    });
  };

  const enregistrer = async () => {
    const v = await nouvelleVersion.mutateAsync({ contenu, note_de_version: note.trim() || undefined });
    setMessage(`Version ${v.version} enregistrée et mise en service.`);
  };

  if (detail.isPending) return <Chargement texte="Lecture du prompt…" />;
  if (detail.isError || !detail.data) return <Erreur erreur={detail.error ?? 'Prompt introuvable.'} />;

  const { prompt, format, versions, variables } = detail.data;
  const versionComparee = comparaison !== null ? versions.find((v) => v.id === comparaison) : null;

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-titre text-[22px] font-semibold tracking-[-0.01em]">{prompt.nom}</span>
          {active ? (
            <span className="etiquette border border-juste bg-juste-fond px-[9px] py-1 text-juste-texte">
              v{active.version} · en service
            </span>
          ) : null}
        </div>
        <span className="etiquette-xs text-encre-30">
          {prompt.format_id === null ? 'Message système envoyé à chaque génération' : 'Message utilisateur, après le prompt système'}
        </span>
      </div>

      {format ? (
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 border-t border-filet pt-4 text-[13px] leading-relaxed text-encre-70">
          <div>
            <div className="etiquette-xs mb-1 text-encre-50">Gabarit</div>
            <div className="font-titre italic">{format.gabarit ?? '—'}</div>
          </div>
          <div>
            <div className="etiquette-xs mb-1 text-encre-50">Réponses</div>
            {format.reponses ?? '—'}
          </div>
          <div>
            <div className="etiquette-xs mb-1 text-encre-50">Ressort</div>
            {format.ressort ?? '—'}
          </div>
        </div>
      ) : null}

      <div className="mb-3.5">
        <div className="mb-[9px] etiquette text-encre-70">Variables disponibles — cliquer pour insérer</div>
        <div className="flex flex-wrap gap-[7px]">
          {variables.map((v) => (
            <button
              key={v.nom}
              type="button"
              title={v.description}
              onClick={() => inserer(v.nom)}
              className={`border px-2 py-1 font-mono text-[10px] ${
                variablesPresentes.has(v.nom) ? 'border-encre bg-rail text-encre' : 'border-filet-fort bg-rail/60 text-encre-50 hover:border-encre-50'
              }`}
            >
              {v.nom}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-[7px] flex items-center justify-between gap-2.5">
          <label htmlFor="prompt-texte" className="etiquette text-encre-70">
            Prompt
          </label>
          <span className="etiquette-xs text-encre-30">{modifie ? 'Modifications non enregistrées' : `${contenu.length} caractères`}</span>
        </div>
        <textarea
          id="prompt-texte"
          ref={zone}
          rows={22}
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          className={`champ resize-y px-[18px] py-4 font-mono text-[11.5px] leading-[1.8] text-encre-80 ${modifie ? 'border-encre' : ''}`}
          spellCheck={false}
        />
      </div>

      <Champ
        etiquette="Note de version (facultative)"
        placeholder="Ce qui change et pourquoi, en une phrase"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-4"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2.5 border-t-2 border-encre pt-4">
        <Bouton variante="principal" disabled={!modifie || !contenu.trim()} enCours={nouvelleVersion.isPending} onClick={enregistrer}>
          Enregistrer la v{prochaine}
        </Bouton>
        <TestPrompt promptId={id} formatId={prompt.format_id} estSysteme={prompt.format_id === null} contenu={contenu} modifie={modifie} />
        <Bouton variante="tertiaire" disabled={!modifie} onClick={() => active && setContenu(active.contenu)}>
          Abandonner les modifications
        </Bouton>
        {message ? <span className="text-[13px] text-juste-texte">{message}</span> : null}
        {nouvelleVersion.isError ? <span className="text-[13px] text-faux-texte">{nouvelleVersion.error.message}</span> : null}
      </div>

      <div>
        <TitreSection droite={`${versions.length} version${versions.length > 1 ? 's' : ''}`}>Historique des versions</TitreSection>
        <div className="border-t-2 border-encre">
          {versions.map((v) => (
            <LigneVersion
              key={v.id}
              version={v}
              estActive={v.active}
              onComparer={() => setComparaison(comparaison === v.id ? null : v.id)}
              enComparaison={comparaison === v.id}
              onCharger={() => {
                setContenu(v.contenu);
                setNote(`Reprise de la v${v.version}`);
                zone.current?.focus();
              }}
              onActiver={() => activer.mutate(v.id)}
              activation={activer.isPending}
            />
          ))}
        </div>
        {versionComparee && active && versionComparee.id !== active.id ? (
          <div className="mt-4">
            <DiffVersions
              avant={versionComparee.contenu}
              apres={active.contenu}
              libelleAvant={`v${versionComparee.version}`}
              libelleApres={`v${active.version} (en service)`}
            />
          </div>
        ) : versionComparee && active && versionComparee.id === active.id && modifie ? (
          <div className="mt-4">
            <DiffVersions avant={active.contenu} apres={contenu} libelleAvant={`v${active.version}`} libelleApres="brouillon en cours" />
          </div>
        ) : null}
      </div>
    </>
  );
}

function LigneVersion({
  version,
  estActive,
  onComparer,
  enComparaison,
  onCharger,
  onActiver,
  activation,
}: {
  version: PromptVersionDetail;
  estActive: boolean;
  onComparer: () => void;
  enComparaison: boolean;
  onCharger: () => void;
  onActiver: () => void;
  activation: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3.5 border-b border-filet py-3">
      <span className={`font-titre w-[44px] flex-none text-[20px] ${estActive ? 'font-semibold' : 'font-medium text-encre-70'}`}>v{version.version}</span>
      <div className="min-w-0 flex-[999_1_280px]">
        <div className="text-[13.5px] leading-[1.45] text-encre-80">{version.note_de_version?.trim() || <span className="italic text-encre-50">Sans note de version</span>}</div>
        <div className="etiquette-xs mt-1 text-encre-30">
          {formaterDateHeure(version.created_at)} · {version.nb_questions_generees} question{version.nb_questions_generees > 1 ? 's' : ''} générée
          {version.nb_questions_generees > 1 ? 's' : ''}
        </div>
      </div>
      <span className="flex flex-none items-center gap-3 font-mono text-[11px] uppercase tracking-[0.08em]">
        {estActive ? (
          <span className="etiquette-xs border border-juste bg-juste-fond px-2 py-[3px] text-juste-texte">En service</span>
        ) : (
          <button type="button" onClick={onActiver} disabled={activation} className="text-indice-texte underline underline-offset-[3px] disabled:opacity-50">
            Activer
          </button>
        )}
        <button type="button" onClick={onComparer} className={`underline underline-offset-[3px] ${enComparaison ? 'text-encre' : 'text-indice-texte'}`}>
          {enComparaison ? 'Fermer' : 'Comparer'}
        </button>
        <button type="button" onClick={onCharger} className="text-indice-texte underline underline-offset-[3px]">
          Charger
        </button>
      </span>
    </div>
  );
}

interface EtatTest {
  enCours: boolean;
  contexte: { categorie: string; sous_categorie: string; format: string } | null;
  champs: Partial<Record<keyof QuestionGeneree, string>>;
  erreur: string | null;
  termine: boolean;
}

const TEST_INITIAL: EtatTest = { enCours: false, contexte: null, champs: {}, erreur: null, termine: false };

function TestPrompt({ formatId, estSysteme, contenu, modifie }: { promptId: number; formatId: number | null; estSysteme: boolean; contenu: string; modifie: boolean }) {
  const [test, setTest] = useState<EtatTest>(TEST_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const taxonomie = useTaxonomie();
  const reglages = useReglages();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const lancer = async () => {
    abortRef.current?.abort();
    const controleur = new AbortController();
    abortRef.current = controleur;
    setOuvert(true);
    setTest({ ...TEST_INITIAL, enCours: true });
    try {
      await fluxSSE(
        '/api/admin/prompts/tester',
        {
          format_id: formatId,
          ...(modifie ? (estSysteme ? { contenu_systeme: contenu } : { contenu_format: contenu }) : {}),
        },
        (ev, data) => {
          if (ev === 'contexte') setTest((t) => ({ ...t, contexte: data as EtatTest['contexte'] }));
          else if (ev === 'champ') {
            const { champ, valeur } = data as { champ: keyof QuestionGeneree; valeur: string };
            setTest((t) => ({ ...t, champs: { ...t.champs, [champ]: valeur } }));
          } else if (ev === 'fin') {
            setTest((t) => ({ ...t, champs: (data as { contenu: QuestionGeneree }).contenu, termine: true }));
          } else if (ev === 'erreur') setTest((t) => ({ ...t, erreur: (data as { message: string }).message }));
        },
        controleur.signal,
      );
    } catch (e) {
      if (!controleur.signal.aborted) setTest((t) => ({ ...t, erreur: e instanceof Error ? e.message : String(e) }));
    } finally {
      if (!controleur.signal.aborted) setTest((t) => ({ ...t, enCours: false }));
    }
  };

  const c = test.champs;
  const question: ChampsJoueur = {
    question: c.question ?? '',
    reponse_a: c.reponse_a ?? '',
    reponse_b: c.reponse_b ?? '',
    reponse_c: c.reponse_c ?? '',
    bonne_reponse: c.bonne_reponse === 'b' || c.bonne_reponse === 'c' ? c.bonne_reponse : 'a',
    indice_1: c.indice_1 ?? '',
    indice_2: c.indice_2 ?? '',
    indice_3: c.indice_3 ?? '',
    commentaire: c.commentaire ?? '',
    source_nom: c.source_nom ?? '',
    source_lien: c.source_lien ?? '',
  };
  const categorie = taxonomie.data?.categories.find((x) => x.nom === test.contexte?.categorie);
  const impact: Impact = c.impact === 'CHOC' || c.impact === 'SURPRENANT' ? c.impact : 'INTERESSANT';

  return (
    <>
      <Bouton variante="affiner" onClick={lancer} enCours={test.enCours}>
        {test.enCours ? 'Test en cours' : modifie ? 'Tester ce brouillon' : 'Tester'}
      </Bouton>
      {ouvert ? (
        <div className="basis-full">
          <div className="mt-2 rounded-fin border border-dashed border-indice bg-indice-fond-ia p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span className="etiquette text-indice-texte">
                Test{modifie ? ' du brouillon' : ' de la version en service'} — rien n’est enregistré
                {test.contexte ? ` · ${test.contexte.categorie} › ${test.contexte.sous_categorie} · ${test.contexte.format}` : ''}
              </span>
              <button type="button" onClick={() => setOuvert(false)} className="etiquette-xs text-encre-30 underline underline-offset-[3px]">
                Fermer
              </button>
            </div>
            {test.erreur ? <Erreur titre="Le test a échoué" erreur={test.erreur} className="mb-3" /> : null}
            {!test.erreur && !test.enCours && !test.termine ? <Avis teinte="neutre">Le test tire une sous-catégorie au hasard et génère une question complète.</Avis> : null}
            <div className="flex flex-wrap items-start gap-6">
              <PhonePreview hauteur={620}>
                <QuestionCard
                  question={question}
                  categorie={{ nom: test.contexte?.categorie ?? 'Catégorie', couleur: categorie?.couleur ?? '#514940' }}
                  sousCategorie={test.contexte?.sous_categorie ?? 'Sous-catégorie'}
                  impact={impact}
                  etat={{ indices: 3, choix: null }}
                  bareme={reglages.data?.reglages.bareme ?? BAREME_DEFAUT}
                />
              </PhonePreview>
              <dl className="m-0 min-w-[260px] flex-1 text-[13px] leading-relaxed">
                {(['fait', 'chiffres', 'calculs', 'resultat', 'commentaire', 'source_nom', 'source_lien'] as const).map((k) => (
                  <div key={k} className="border-b border-filet py-2">
                    <dt className="etiquette-xs text-encre-50">{k}</dt>
                    <dd className={`m-0 mt-0.5 text-encre-80 ${k === 'source_lien' ? 'break-all font-mono text-[11px]' : ''}`}>
                      {c[k] ?? <span className="squelette inline-block h-[9px] w-[60%]" />}
                    </dd>
                  </div>
                ))}
                {test.termine ? (
                  <div className="pt-3">
                    <EtiquetteNeutre>{impact}</EtiquetteNeutre>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function EtatVidePrompts() {
  return <EtatVide titre="Aucun prompt" texte="Lancez le seed pour créer le prompt système et un prompt par format actif." />;
}
