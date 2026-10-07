import { useEffect, useState } from 'react';
import type { Bareme, Categorie, Format, Reglages as TypeReglages, SousCategorie } from '@changing-world/shared';
import { cles, useEnregistrerReglages, useFormats, useMutationGenerique, useReglages, useTaxonomie } from '../api/hooks';
import { Bouton } from '../components/ui/Bouton';
import { Champ, Interrupteur, ZoneTexte } from '../components/ui/Champ';
import { EnTetePage, TitreSection } from '../components/ui/EnTetePage';
import { Avis, Chargement, Erreur } from '../components/ui/Etats';
import { IconeChevron } from '../components/ui/Icones';

export default function Reglages() {
  return (
    <>
      <EnTetePage titre="Réglages" sousTitre="Barème, modèle, taxonomie et formats" />
      <div className="flex flex-col gap-12">
        <SectionBaremeEtIA />
        <SectionTaxonomie />
        <SectionFormats />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Barème et IA                                                         */
/* ------------------------------------------------------------------ */

const LIBELLES_INDICES = ['Aucun indice', 'Un indice', 'Deux indices', 'Trois indices'];

function SectionBaremeEtIA() {
  const reglages = useReglages();
  const enregistrer = useEnregistrerReglages();
  const [form, setForm] = useState<TypeReglages | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (reglages.data && !form) setForm(reglages.data.reglages);
  }, [reglages.data, form]);

  if (reglages.isPending || !form) return <Chargement texte="Lecture des réglages…" />;
  if (reglages.isError) return <Erreur erreur={reglages.error} />;

  const modifie = JSON.stringify(form) !== JSON.stringify(reglages.data.reglages);
  const majBareme = (type: keyof Bareme, i: number, valeur: number) =>
    setForm((f) => {
      if (!f) return f;
      const t = [...f.bareme[type]] as Bareme['gains'];
      t[i] = Number.isFinite(valeur) ? valeur : 0;
      return { ...f, bareme: { ...f.bareme, [type]: t } };
    });

  return (
    <section className="flex flex-wrap items-start gap-10">
      <div className="min-w-[320px] flex-[1_1_380px]">
        <TitreSection droite="Visible dans l’aperçu joueur">Barème des indices</TitreSection>
        <p className="mb-3 mt-0 text-[13px] leading-relaxed text-encre-70">
          Chaque indice demandé réduit le gain et la perte. Les pertes sont saisies en valeur positive.
        </p>
        <div className="border-t-2 border-encre">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-filet-fort py-2 etiquette-sm text-encre-50">
            <span>Indices demandés</span>
            <span className="text-right">Gain</span>
            <span className="text-right">Perte</span>
          </div>
          {LIBELLES_INDICES.map((lib, i) => (
            <div key={lib} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 border-b border-filet py-2">
              <span className={`text-[14px] ${i === 0 ? 'font-semibold' : ''}`}>{lib}</span>
              <input
                type="number"
                aria-label={`Gain avec ${lib.toLowerCase()}`}
                value={form.bareme.gains[i]}
                onChange={(e) => majBareme('gains', i, e.target.valueAsNumber)}
                className="champ font-titre min-h-[40px] py-1.5 text-right text-[20px] font-semibold text-juste"
              />
              <input
                type="number"
                aria-label={`Perte avec ${lib.toLowerCase()}`}
                value={form.bareme.pertes[i]}
                onChange={(e) => majBareme('pertes', i, e.target.valueAsNumber)}
                className="champ font-titre min-h-[40px] py-1.5 text-right text-[20px] font-semibold text-faux-vif"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-[280px] flex-[1_1_300px]">
        <TitreSection droite={reglages.data.ia.mode === 'demo' ? 'Mode démo' : 'OpenAI'}>Modèle et température</TitreSection>
        {reglages.data.ia.mode === 'demo' ? (
          <Avis className="mb-4">
            Aucune clé OpenAI n’est configurée : les générations sont factices. Renseignez <span className="font-mono">OPENAI_API_KEY</span> dans le fichier .env puis relancez l’API.
          </Avis>
        ) : null}
        <Champ
          etiquette="Modèle OpenAI"
          value={form.modele_ia}
          onChange={(e) => setForm({ ...form, modele_ia: e.target.value })}
          aide={`Par défaut : ${reglages.data.ia.modele_env} (variable OPENAI_MODEL)`}
          className="mb-4 font-mono"
        />
        <div>
          <div className="mb-[7px] flex items-center justify-between">
            <span className="etiquette text-encre-70">Température</span>
            <span className="font-titre text-[18px] font-semibold">{form.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
            className="w-full accent-encre"
            aria-label="Température"
          />
          <div className="mt-1 flex justify-between etiquette-xs text-encre-30">
            <span>0 · déterministe</span>
            <span>2 · très libre</span>
          </div>
          <p className="mt-2 text-[12px] text-encre-50">Les modèles de raisonnement d’OpenAI ignorent la température.</p>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t-2 border-encre pt-4">
          <Bouton
            variante="principal"
            taille="petit"
            disabled={!modifie}
            enCours={enregistrer.isPending}
            onClick={() =>
              enregistrer.mutate(form, {
                onSuccess: () => setMessage('Réglages enregistrés.'),
                onError: (e) => setMessage(e.message),
              })
            }
          >
            Enregistrer
          </Bouton>
          <Bouton variante="tertiaire" taille="petit" disabled={!modifie} onClick={() => setForm(reglages.data.reglages)}>
            Annuler
          </Bouton>
          {message ? <span className="text-[13px] text-juste-texte">{message}</span> : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Taxonomie                                                            */
/* ------------------------------------------------------------------ */

const INVALIDATIONS_TAXO = [cles.taxonomie, cles.compteurs, ['questions']] as const;

function SectionTaxonomie() {
  const taxonomie = useTaxonomie();
  const mutation = useMutationGenerique<Record<string, unknown>>(INVALIDATIONS_TAXO);
  const [nouvelleCategorie, setNouvelleCategorie] = useState({ nom: '', couleur: '#514940' });
  const [erreur, setErreur] = useState<string | null>(null);

  const executer = (chemin: string, methode: 'POST' | 'PUT' | 'DELETE', json?: Record<string, unknown>) =>
    mutation.mutateAsync({ chemin, methode, json }).then(
      () => setErreur(null),
      (e: Error) => setErreur(e.message),
    );

  if (taxonomie.isPending) return <Chargement texte="Lecture de la taxonomie…" />;
  if (taxonomie.isError) return <Erreur erreur={taxonomie.error} />;

  return (
    <section>
      <TitreSection droite={`${taxonomie.data.categories.length} catégories`}>Taxonomie — catégories, sous-catégories et cibles</TitreSection>
      <p className="mb-4 mt-0 text-[13px] leading-relaxed text-encre-70">
        Les modifications sont enregistrées quand vous quittez un champ. Une catégorie ou une sous-catégorie utilisée par des questions ne peut pas être supprimée.
      </p>
      {erreur ? <Erreur erreur={erreur} className="mb-4" /> : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-x-10 gap-y-6 border-t-2 border-encre pt-5">
        {taxonomie.data.categories.map((c) => (
          <BlocCategorie key={c.id} categorie={c} sousCategories={c.sous_categories} executer={executer} />
        ))}
      </div>
      <form
        className="mt-6 flex flex-wrap items-end gap-3 border-t border-filet-fort pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nouvelleCategorie.nom.trim()) return;
          void executer('/api/admin/categories', 'POST', { nom: nouvelleCategorie.nom.trim(), couleur: nouvelleCategorie.couleur }).then(() =>
            setNouvelleCategorie({ nom: '', couleur: '#514940' }),
          );
        }}
      >
        <Champ etiquette="Nouvelle catégorie" placeholder="Nom" value={nouvelleCategorie.nom} onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, nom: e.target.value })} className="min-w-[220px]" />
        <label className="flex flex-col gap-[7px]">
          <span className="etiquette text-encre-70">Couleur</span>
          <input type="color" value={nouvelleCategorie.couleur} onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, couleur: e.target.value })} className="h-[44px] w-[60px] cursor-pointer rounded-fin border-[1.5px] border-filet-fort bg-surface p-1" />
        </label>
        <Bouton type="submit" variante="tertiaire" taille="petit" className="min-h-[44px]" disabled={!nouvelleCategorie.nom.trim()}>
          Ajouter la catégorie
        </Bouton>
      </form>
    </section>
  );
}

type Executer = (chemin: string, methode: 'POST' | 'PUT' | 'DELETE', json?: Record<string, unknown>) => Promise<void>;

function BlocCategorie({ categorie, sousCategories, executer }: { categorie: Categorie; sousCategories: SousCategorie[]; executer: Executer }) {
  const [nom, setNom] = useState(categorie.nom);
  const [couleur, setCouleur] = useState(categorie.couleur);
  const [nouvelle, setNouvelle] = useState('');
  useEffect(() => {
    setNom(categorie.nom);
    setCouleur(categorie.couleur);
  }, [categorie.nom, categorie.couleur]);

  const total = sousCategories.length;
  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-filet-fort pb-2">
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          onBlur={() => couleur !== categorie.couleur && executer(`/api/admin/categories/${categorie.id}`, 'PUT', { couleur })}
          aria-label={`Couleur de ${categorie.nom}`}
          className="h-[26px] w-[26px] flex-none cursor-pointer border border-filet-fort bg-transparent p-0"
        />
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onBlur={() => nom.trim() && nom !== categorie.nom && executer(`/api/admin/categories/${categorie.id}`, 'PUT', { nom: nom.trim() })}
          aria-label="Nom de la catégorie"
          className="font-titre min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none focus:bg-blanc"
        />
        <span className="etiquette-xs text-encre-30">{total} sous-cat.</span>
        <button
          type="button"
          onClick={() => executer(`/api/admin/categories/${categorie.id}`, 'DELETE')}
          className="etiquette-xs text-encre-30 hover:text-faux-texte"
          title="Supprimer la catégorie (si aucune question ne l’utilise)"
        >
          Suppr.
        </button>
      </div>
      <div className="grid grid-cols-[1fr_72px_44px] items-center gap-x-2 pt-1 etiquette-xs text-encre-30">
        <span>Sous-catégorie</span>
        <span className="text-right">Cible</span>
        <span />
      </div>
      {sousCategories.map((s) => (
        <LigneSousCategorie key={s.id} sous={s} executer={executer} />
      ))}
      <form
        className="mt-1.5 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nouvelle.trim()) return;
          void executer('/api/admin/sous-categories', 'POST', { categorie_id: categorie.id, nom: nouvelle.trim(), nb_questions_cible: 10 }).then(() => setNouvelle(''));
        }}
      >
        <input value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder="Ajouter une sous-catégorie" className="champ min-h-[34px] flex-1 py-1 text-[13px]" />
        <button type="submit" disabled={!nouvelle.trim()} className="etiquette-xs text-indice-texte underline underline-offset-[3px] disabled:opacity-40">
          Ajouter
        </button>
      </form>
    </div>
  );
}

function LigneSousCategorie({ sous, executer }: { sous: SousCategorie; executer: Executer }) {
  const [nom, setNom] = useState(sous.nom);
  const [cible, setCible] = useState(sous.nb_questions_cible === null ? '' : String(sous.nb_questions_cible));
  useEffect(() => {
    setNom(sous.nom);
    setCible(sous.nb_questions_cible === null ? '' : String(sous.nb_questions_cible));
  }, [sous.nom, sous.nb_questions_cible]);
  return (
    <div className="grid grid-cols-[1fr_72px_44px] items-center gap-x-2 border-b border-filet py-1">
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onBlur={() => nom.trim() && nom !== sous.nom && executer(`/api/admin/sous-categories/${sous.id}`, 'PUT', { nom: nom.trim() })}
        aria-label="Nom de la sous-catégorie"
        className="min-w-0 bg-transparent py-1 text-[13px] outline-none focus:bg-blanc"
      />
      <input
        type="number"
        min={0}
        value={cible}
        onChange={(e) => setCible(e.target.value)}
        onBlur={() => {
          const n = cible === '' ? null : Number(cible);
          if (n !== sous.nb_questions_cible) void executer(`/api/admin/sous-categories/${sous.id}`, 'PUT', { nb_questions_cible: n });
        }}
        aria-label="Cible de questions"
        className="min-w-0 bg-transparent py-1 text-right font-mono text-[12px] outline-none focus:bg-blanc"
      />
      <button type="button" onClick={() => executer(`/api/admin/sous-categories/${sous.id}`, 'DELETE')} className="etiquette-xs text-right text-encre-30 hover:text-faux-texte">
        Suppr.
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formats                                                              */
/* ------------------------------------------------------------------ */

const INVALIDATIONS_FORMATS = [cles.formats, cles.prompts, ['questions']] as const;

type FormatInput = Omit<Format, 'id'>;

const FORMAT_VIDE: FormatInput = { code: '', nom: '', gabarit: '', exemple: '', reponses: '', ressort: '', actif: false };

function SectionFormats() {
  const formats = useFormats();
  const mutation = useMutationGenerique<Partial<FormatInput>>(INVALIDATIONS_FORMATS);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState<FormatInput | null>(null);

  const executer = (chemin: string, methode: 'POST' | 'PUT' | 'DELETE', json?: Partial<FormatInput>) =>
    mutation.mutateAsync({ chemin, methode, json }).then(
      () => setErreur(null),
      (e: Error) => {
        setErreur(e.message);
        throw e;
      },
    );

  if (formats.isPending) return <Chargement texte="Lecture des formats…" />;
  if (formats.isError) return <Erreur erreur={formats.error} />;

  const actifs = formats.data.filter((f) => f.actif).length;
  return (
    <section>
      <TitreSection droite={`${actifs} actif${actifs > 1 ? 's' : ''} sur ${formats.data.length}`}>Formats de question</TitreSection>
      <p className="mb-4 mt-0 text-[13px] leading-relaxed text-encre-70">
        Seuls les formats actifs sont proposés à la génération. Dépliez un format pour modifier son gabarit, l’échelle des réponses et le ressort : ces textes sont injectés dans les prompts.
      </p>
      {erreur ? <Erreur erreur={erreur} className="mb-4" /> : null}
      <div className="border-t-2 border-encre">
        {formats.data.map((f) => (
          <LigneFormat key={f.id} format={f} executer={executer} />
        ))}
      </div>
      {nouveau ? (
        <FormulaireFormat
          valeur={nouveau}
          onChange={setNouveau}
          onAnnuler={() => setNouveau(null)}
          onEnregistrer={() => executer('/api/admin/formats', 'POST', nettoyer(nouveau)).then(() => setNouveau(null))}
          libelleBouton="Créer le format"
        />
      ) : (
        <div className="mt-4">
          <Bouton variante="tertiaire" taille="petit" onClick={() => setNouveau(FORMAT_VIDE)}>
            Nouveau format
          </Bouton>
        </div>
      )}
    </section>
  );
}

function nettoyer(f: FormatInput): FormatInput {
  return {
    code: f.code.trim(),
    nom: f.nom.trim(),
    gabarit: f.gabarit?.trim() || null,
    exemple: f.exemple?.trim() || null,
    reponses: f.reponses?.trim() || null,
    ressort: f.ressort?.trim() || null,
    actif: f.actif,
  };
}

function LigneFormat({ format, executer }: { format: Format; executer: (chemin: string, methode: 'POST' | 'PUT' | 'DELETE', json?: Partial<FormatInput>) => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState<FormatInput>({ ...format });
  useEffect(() => setBrouillon({ ...format }), [format]);
  const modifie = JSON.stringify(nettoyer(brouillon)) !== JSON.stringify(nettoyer({ ...format }));

  return (
    <div className="border-b border-filet">
      <div className="flex items-center gap-3 py-2.5">
        <Interrupteur actif={format.actif} etiquette={`Activer ${format.nom}`} onChange={(v) => void executer(`/api/admin/formats/${format.id}`, 'PUT', { actif: v })} />
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <IconeChevron ouvert={ouvert} className="flex-none text-encre-50" />
          <span className={`font-titre text-[16px] ${format.actif ? 'font-semibold' : 'font-medium text-encre-50'}`}>{format.nom}</span>
          <span className="font-mono text-[10px] text-encre-30">{format.code}</span>
          {!ouvert && format.gabarit ? <span className="ml-2 hidden truncate text-[12px] italic text-encre-50 md:inline">{format.gabarit}</span> : null}
        </button>
      </div>
      {ouvert ? (
        <FormulaireFormat
          valeur={brouillon}
          onChange={setBrouillon}
          onAnnuler={() => {
            setBrouillon({ ...format });
            setOuvert(false);
          }}
          onEnregistrer={() => executer(`/api/admin/formats/${format.id}`, 'PUT', nettoyer(brouillon))}
          onSupprimer={() => executer(`/api/admin/formats/${format.id}`, 'DELETE')}
          libelleBouton="Enregistrer le format"
          desactive={!modifie}
        />
      ) : null}
    </div>
  );
}

function FormulaireFormat({
  valeur,
  onChange,
  onAnnuler,
  onEnregistrer,
  onSupprimer,
  libelleBouton,
  desactive = false,
}: {
  valeur: FormatInput;
  onChange: (v: FormatInput) => void;
  onAnnuler: () => void;
  onEnregistrer: () => Promise<unknown>;
  onSupprimer?: () => Promise<unknown>;
  libelleBouton: string;
  desactive?: boolean;
}) {
  const [enCours, setEnCours] = useState(false);
  const maj = <K extends keyof FormatInput>(k: K, v: FormatInput[K]) => onChange({ ...valeur, [k]: v });
  return (
    <div className="mb-4 mt-1 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5 rounded-fin border border-filet-fort bg-surface p-4">
      <Champ etiquette="Nom" value={valeur.nom} onChange={(e) => maj('nom', e.target.value)} />
      <Champ etiquette="Code (minuscules, tirets bas)" value={valeur.code} onChange={(e) => maj('code', e.target.value)} className="font-mono" />
      <ZoneTexte etiquette="Gabarit" rows={2} value={valeur.gabarit ?? ''} onChange={(e) => maj('gabarit', e.target.value)} className="col-span-full" />
      <ZoneTexte etiquette="Échelle des réponses" rows={2} value={valeur.reponses ?? ''} onChange={(e) => maj('reponses', e.target.value)} />
      <ZoneTexte etiquette="Ressort" rows={2} value={valeur.ressort ?? ''} onChange={(e) => maj('ressort', e.target.value)} />
      <ZoneTexte etiquette="Exemple" rows={2} value={valeur.exemple ?? ''} onChange={(e) => maj('exemple', e.target.value)} className="col-span-full" />
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2.5 text-[13px]">
          <Interrupteur actif={valeur.actif} etiquette="Format actif" onChange={(v) => maj('actif', v)} />
          {valeur.actif ? 'Actif : proposé à la génération' : 'Inactif : conservé mais non proposé'}
        </label>
        <span className="ml-auto flex items-center gap-2.5">
          {onSupprimer ? (
            <Bouton variante="danger" taille="petit" onClick={() => onSupprimer().catch(() => undefined)}>
              Supprimer
            </Bouton>
          ) : null}
          <Bouton variante="tertiaire" taille="petit" onClick={onAnnuler}>
            Annuler
          </Bouton>
          <Bouton
            variante="principal"
            taille="petit"
            disabled={desactive || !valeur.nom.trim() || !valeur.code.trim()}
            enCours={enCours}
            onClick={() => {
              setEnCours(true);
              onEnregistrer().finally(() => setEnCours(false));
            }}
          >
            {libelleBouton}
          </Bouton>
        </span>
      </div>
    </div>
  );
}
