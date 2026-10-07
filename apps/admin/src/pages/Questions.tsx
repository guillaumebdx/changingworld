import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IMPACTS, LIBELLES_IMPACT, LIBELLES_STATUT, STATUTS, type Statut } from '@changing-world/shared';
import { useCompteurs, useFormats, useQuestions, useTaxonomie, type Compteurs } from '../api/hooks';
import { Bouton } from '../components/ui/Bouton';
import { Champ, Selection } from '../components/ui/Champ';
import { EnTetePage, TitreSection } from '../components/ui/EnTetePage';
import { Chargement, Erreur, EtatVide } from '../components/ui/Etats';
import { EtiquetteImpact, EtiquetteStatut, PastilleCategorie } from '../components/ui/Etiquettes';
import { formaterDate } from '../utils/dates';

const CLES_FILTRES = ['statut', 'categorie_id', 'sous_categorie_id', 'format_id', 'impact', 'q'] as const;

export default function Questions() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const filtres = useMemo(() => Object.fromEntries(CLES_FILTRES.map((k) => [k, params.get(k) ?? ''])), [params]);
  const questions = useQuestions(filtres);
  const compteurs = useCompteurs();
  const taxonomie = useTaxonomie();
  const formats = useFormats();

  const changer = (cle: (typeof CLES_FILTRES)[number], valeur: string) => {
    const p = new URLSearchParams(params);
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    if (cle === 'categorie_id') p.delete('sous_categorie_id');
    setParams(p, { replace: true });
  };

  const aDesFiltres = CLES_FILTRES.some((k) => params.get(k));
  const sousCategories = taxonomie.data?.categories.find((c) => String(c.id) === filtres.categorie_id)?.sous_categories ?? [];

  return (
    <>
      <EnTetePage
        titre="Questions"
        sousTitre={
          compteurs.data
            ? `${compteurs.data.total} question${compteurs.data.total > 1 ? 's' : ''} · ${compteurs.data.parStatut.validee} validée${compteurs.data.parStatut.validee > 1 ? 's' : ''} · ${
                compteurs.data.parStatut.brouillon_ia + compteurs.data.parStatut.a_affiner
              } à relire`
            : 'Base de questions'
        }
        actions={
          <Link to="/questions/nouvelle" className="no-underline">
            <Bouton variante="principal" taille="petit">
              Nouvelle question
            </Bouton>
          </Link>
        }
      />

      {compteurs.data ? <CompteursStatut compteurs={compteurs.data} actif={filtres.statut ?? ''} onChoisir={(s) => changer('statut', s)} /> : null}

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Selection etiquette="Catégorie" value={filtres.categorie_id} onChange={(e) => changer('categorie_id', e.target.value)}>
          <option value="">Toutes</option>
          {taxonomie.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Selection>
        <Selection etiquette="Sous-catégorie" value={filtres.sous_categorie_id} onChange={(e) => changer('sous_categorie_id', e.target.value)} disabled={!filtres.categorie_id}>
          <option value="">Toutes</option>
          {sousCategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </Selection>
        <Selection etiquette="Format" value={filtres.format_id} onChange={(e) => changer('format_id', e.target.value)}>
          <option value="">Tous</option>
          {formats.data?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
              {f.actif ? '' : ' (inactif)'}
            </option>
          ))}
        </Selection>
        <Selection etiquette="Impact" value={filtres.impact} onChange={(e) => changer('impact', e.target.value)}>
          <option value="">Tous</option>
          {IMPACTS.map((i) => (
            <option key={i} value={i}>
              {LIBELLES_IMPACT[i]}
            </option>
          ))}
        </Selection>
        <Champ
          etiquette="Recherche"
          type="search"
          placeholder="Mot, chiffre ou numéro"
          value={filtres.q}
          onChange={(e) => changer('q', e.target.value)}
          className="col-span-2 min-w-[200px]"
        />
      </div>

      <div className="mt-7 flex flex-wrap items-start gap-9">
        <div className="min-w-0 flex-[999_1_620px]">
          <TitreSection
            droite={
              aDesFiltres ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className="etiquette-xs text-indice-texte underline underline-offset-[3px]">
                  Effacer les filtres
                </button>
              ) : undefined
            }
          >
            {questions.data ? `${questions.data.length} question${questions.data.length > 1 ? 's' : ''}${aDesFiltres ? ' filtrées' : ''}` : 'Liste'}
          </TitreSection>

          {questions.isPending ? <Chargement /> : null}
          {questions.isError ? <Erreur erreur={questions.error} reessayer={() => questions.refetch()} /> : null}
          {questions.data && questions.data.length === 0 ? (
            <EtatVide
              titre={aDesFiltres ? 'Aucune question ne correspond' : 'La base est vide'}
              texte={
                aDesFiltres
                  ? 'Essayez d’élargir les filtres, ou lancez une nouvelle question dans cette sous-catégorie.'
                  : 'Lancez votre première génération : choisissez une catégorie et un format, l’IA rédige, vous relisez.'
              }
              action={
                <Link to="/questions/nouvelle" className="no-underline">
                  <Bouton variante="principal" taille="petit">
                    Nouvelle question
                  </Bouton>
                </Link>
              }
            />
          ) : null}
          {questions.data && questions.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="tableau">
                <thead>
                  <tr>
                    <th className="w-[52px]">N°</th>
                    <th className="min-w-[300px]">Question</th>
                    <th className="w-[190px]">Catégorie</th>
                    <th className="w-[150px]">Format</th>
                    <th className="w-[110px]">Impact</th>
                    <th className="w-[110px]">Statut</th>
                    <th className="w-[96px]">Modifiée</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.data.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => navigate(`/questions/${q.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/questions/${q.id}`);
                      }}
                      tabIndex={0}
                      className="cursor-pointer focus:outline-none focus-visible:bg-surface"
                    >
                      <td className="font-mono text-[12px] text-encre-50">{q.numero}</td>
                      <td>
                        <span className={`font-titre block text-[15px] font-medium leading-[1.35] ${q.statut === 'non_retenue' ? 'text-encre-50' : ''}`}>
                          {q.question.trim() || <span className="italic text-encre-30">Question en cours de rédaction</span>}
                        </span>
                      </td>
                      <td>
                        <PastilleCategorie couleur={q.categorie_couleur} nom={q.categorie_nom} sousCategorie={q.sous_categorie_nom} className="max-w-full whitespace-normal" />
                      </td>
                      <td className="text-[12px] text-encre-70">{q.format_nom}</td>
                      <td>
                        <EtiquetteImpact impact={q.impact} taille="petit" />
                      </td>
                      <td>
                        <EtiquetteStatut statut={q.statut} taille="petit" />
                      </td>
                      <td className="font-mono text-[12px] text-encre-50">{formaterDate(q.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <aside className="min-w-[280px] flex-[1_1_300px]">
          <TitreSection droite="validées / cible">Progression par sous-catégorie</TitreSection>
          {compteurs.data ? <Progression compteurs={compteurs.data} onChoisir={(sousId, catId) => setParams({ categorie_id: String(catId), sous_categorie_id: String(sousId) })} /> : <Chargement texte="Calcul des compteurs…" />}
        </aside>
      </div>
    </>
  );
}

function CompteursStatut({ compteurs, actif, onChoisir }: { compteurs: Compteurs; actif: string; onChoisir: (s: string) => void }) {
  return (
    <div className="grid grid-cols-2 border-t-2 border-encre md:grid-cols-5">
      <BoutonCompteur libelle="Toutes" valeur={compteurs.total} actif={actif === ''} onClick={() => onChoisir('')} />
      {STATUTS.map((s) => (
        <BoutonCompteur key={s} libelle={LIBELLES_STATUT[s]} valeur={compteurs.parStatut[s]} actif={actif === s} onClick={() => onChoisir(actif === s ? '' : s)} statut={s} />
      ))}
    </div>
  );
}

function BoutonCompteur({ libelle, valeur, actif, onClick, statut }: { libelle: string; valeur: number; actif: boolean; onClick: () => void; statut?: Statut }) {
  const couleur = statut === 'validee' ? 'text-juste' : statut === 'a_affiner' ? 'text-indice-texte' : statut === 'non_retenue' ? 'text-encre-50' : 'text-encre';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`border-b border-r border-filet px-4 pb-3.5 pt-3 text-left last:border-r-0 ${actif ? 'bg-surface' : 'hover:bg-surface/60'}`}
    >
      <div className={`font-chiffre text-[30px] font-semibold leading-none tracking-[-0.02em] ${couleur}`}>{valeur}</div>
      <div className={`etiquette-xs mt-2 ${actif ? 'text-encre' : 'text-encre-50'}`}>{libelle}</div>
    </button>
  );
}

function Progression({ compteurs, onChoisir }: { compteurs: Compteurs; onChoisir: (sousId: number, catId: number) => void }) {
  const parCategorie = new Map<number, Compteurs['parSousCategorie']>();
  for (const s of compteurs.parSousCategorie) {
    const liste = parCategorie.get(s.categorie_id) ?? [];
    liste.push(s);
    parCategorie.set(s.categorie_id, liste);
  }
  return (
    <div className="border-t-2 border-encre">
      {[...parCategorie.values()].map((sous) => {
        const cat = sous[0]!;
        return (
          <div key={cat.categorie_id} className="border-b border-filet-fort py-3">
            <PastilleCategorie couleur={cat.categorie_couleur} nom={cat.categorie_nom} className="mb-2" />
            {sous.map((s) => {
              const cible = s.cible ?? 0;
              const pctValidees = cible > 0 ? Math.min(100, (s.validees / cible) * 100) : s.validees > 0 ? 100 : 0;
              const pctEnCours = cible > 0 ? Math.min(100 - pctValidees, (s.en_cours / cible) * 100) : 0;
              const atteinte = cible > 0 && s.validees >= cible;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChoisir(s.id, s.categorie_id)}
                  className="flex w-full items-center gap-3 py-[5px] text-left hover:bg-surface"
                >
                  <span className="w-[44%] truncate text-[12px] text-encre-80">{s.nom}</span>
                  <span className="relative h-[6px] flex-1 bg-rail" aria-hidden="true">
                    <span className="absolute inset-y-0 left-0" style={{ width: `${pctValidees}%`, background: cat.categorie_couleur }} />
                    <span className="absolute inset-y-0" style={{ left: `${pctValidees}%`, width: `${pctEnCours}%`, background: cat.categorie_couleur, opacity: 0.35 }} />
                  </span>
                  <span className={`w-[52px] text-right font-mono text-[11px] ${atteinte ? 'text-juste' : 'text-encre-70'}`}>
                    {s.validees}
                    <span className="text-encre-30">/{s.cible ?? '–'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
