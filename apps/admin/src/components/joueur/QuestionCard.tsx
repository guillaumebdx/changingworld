import type { Bareme, ChampsJoueur, EtatPartie, Impact, Lettre } from '@changing-world/shared';
import { LIBELLES_IMPACT, formaterPoints, libelleIndicesUtilises, vueJoueur } from '@changing-world/shared';

export interface QuestionCardProps {
  question: ChampsJoueur;
  categorie: { nom: string; couleur: string };
  sousCategorie: string;
  impact: Impact;
  etat: EtatPartie;
  bareme: Bareme;
  /** Score cumulé fictif affiché dans le bandeau. */
  scoreTotal?: number;
  /** Position fictive dans la série, ex. « 12 / 40 ». */
  progression?: string;
  onDemanderIndice?: () => void;
  onRepondre?: (lettre: Lettre) => void;
}

const STYLE_IMPACT: Record<Impact, string> = {
  CHOC: 'bg-encre text-papier border-encre',
  SURPRENANT: 'bg-indice-fond border-indice text-indice-texte',
  INTERESSANT: 'bg-papier/90 border-filet-mute text-encre-50',
};

function Texte({ valeur, vide }: { valeur: string; vide: string }) {
  if (valeur.trim()) return <>{valeur}</>;
  return <span className="italic text-encre-30">{vide}</span>;
}

/**
 * L'écran joueur, tel qu'il sera porté dans l'app mobile. Aucune logique de score ici :
 * tout vient de `vueJoueur` dans le paquet partagé.
 */
export function QuestionCard(props: QuestionCardProps) {
  const { question, categorie, sousCategorie, impact, etat, bareme, scoreTotal = 148, progression = '12 / 40', onDemanderIndice, onRepondre } = props;
  const vue = vueJoueur(question, etat, bareme);
  const repondu = vue.phase === 'reponse';
  const juste = vue.verdict === 'juste';

  return (
    <div className="flex h-full min-h-0 flex-col bg-papier text-encre">
      {repondu ? (
        <div className={`relative flex-none overflow-hidden px-[15px] pb-[13px] pt-[15px] ${juste ? 'bg-juste' : 'bg-faux'}`}>
          <div className="pointer-events-none absolute -right-[60px] -top-[70px] h-[200px] w-[200px] rounded-full border border-surface/20" />
          <div className="pointer-events-none absolute -right-[20px] -top-[30px] h-[130px] w-[130px] rounded-full border border-surface/15" />
          <div className="relative flex items-start justify-between">
            <span className="etiquette-xs flex items-center gap-1.5 text-surface">
              <span className="inline-block h-[7px] w-[7px]" style={{ background: juste ? '#E5A08C' : '#E8B9AC' }} />
              {categorie.nom}
            </span>
            <span className="text-right">
              <span className="etiquette-xs block text-surface/80">Total</span>
              <span className="font-titre block text-[17px] font-semibold leading-tight text-surface">
                {scoreTotal + (vue.points ?? 0)}
              </span>
            </span>
          </div>
          <div className="relative mt-3 flex items-end justify-between">
            <div>
              <div className="etiquette-xs mb-0.5 text-surface/85 tracking-[0.18em]">{juste ? 'Vous avez trouvé' : "L'écart est plus grand"}</div>
              <div className="font-titre text-[31px] font-semibold leading-none tracking-[-0.015em] text-surface">{juste ? 'Juste' : 'Raté'}</div>
            </div>
            <div className="text-right">
              <div className="font-titre text-[34px] font-semibold leading-none tracking-[-0.02em] text-surface">{formaterPoints(vue.points ?? 0)}</div>
              <div className="etiquette-xs mt-1 text-surface/80">{libelleIndicesUtilises(vue.indicesUtilises)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-[104px] flex-none overflow-hidden" style={{ background: categorie.couleur }}>
          <div className="pointer-events-none absolute -left-[50px] -top-[110px] h-[280px] w-[280px] rounded-full border border-surface/20" />
          <div className="pointer-events-none absolute -right-[90px] -top-[50px] h-[210px] w-[210px] rounded-full border border-surface/[0.18]" />
          <div className="relative flex h-full flex-col justify-between px-[15px] pb-3 pt-[15px]">
            <div className="flex items-start justify-between gap-2">
              <span className="etiquette-xs leading-[1.6] text-surface">
                {categorie.nom}
                <br />
                <span className="opacity-80">› {sousCategorie}</span>
              </span>
              <span className="font-titre text-[17px] font-semibold leading-none text-surface">{scoreTotal}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className={`etiquette-xs border px-[7px] py-[3px] font-medium tracking-[0.16em] ${STYLE_IMPACT[impact]}`}>{LIBELLES_IMPACT[impact]}</span>
              <span className="etiquette-xs text-surface/85">{progression}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t-2 border-encre p-[15px]">
        {repondu ? (
          <div className="font-titre mb-3 text-[14px] font-medium leading-[1.4] text-encre-70">
            <Texte valeur={question.question} vide="La question s’affichera ici." />
          </div>
        ) : (
          <div className="font-titre-doux mb-[13px] text-[19px] font-semibold leading-[1.24] tracking-[-0.01em]">
            <Texte valeur={question.question} vide="La question s’affichera ici dès qu’elle sera rédigée." />
          </div>
        )}

        {!repondu &&
          vue.indicesVisibles.map((i) => (
            <div key={i.numero} className="mb-[7px] rounded-fin border border-filet-fort bg-surface px-[11px] py-[9px]">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="etiquette-xs font-medium tracking-[0.16em] text-indice-texte">Indice {i.numero}</span>
                <span className="etiquette-xs text-encre-30 tracking-[0.08em]">
                  Enjeu {i.descente.avant} → {i.descente.apres}
                </span>
              </div>
              <div className="text-[11.5px] leading-[1.45] text-encre-80">
                <Texte valeur={i.texte} vide={`L’indice ${i.numero} est vide.`} />
              </div>
            </div>
          ))}

        <div className={`flex flex-col ${repondu ? 'mb-3 gap-1.5' : 'mt-[7px] gap-1.5'}`}>
          {vue.reponses.map((r) => {
            const commun = 'flex min-h-[42px] items-center gap-[11px] rounded-fin px-[11px] py-[9px] text-left';
            const styles: Record<typeof r.aspect, string> = {
              neutre: `${commun} border-[1.5px] border-filet-fort bg-surface text-encre ${onRepondre ? 'hover:border-encre' : ''}`,
              estompee: `${commun} border border-filet text-encre-30`,
              bonne: `${commun} border-[1.5px] border-juste bg-juste text-surface`,
              fausse: `${commun} border-[1.5px] border-faux bg-faux-fond text-faux-texte`,
            };
            const contenu = (
              <>
                <span className={`w-[11px] flex-none font-mono text-[11px] font-semibold ${r.aspect === 'neutre' ? 'text-encre-50' : ''}`}>
                  {r.lettre.toUpperCase()}
                </span>
                <span className={`text-[14px] ${r.aspect === 'bonne' ? 'font-semibold' : ''} ${r.aspect === 'fausse' ? 'line-through decoration-1' : ''}`}>
                  <Texte valeur={r.texte} vide={`Réponse ${r.lettre.toUpperCase()}`} />
                </span>
                {r.mention ? <span className="etiquette-xs ml-auto flex-none">{r.mention}</span> : null}
              </>
            );
            return !repondu && onRepondre ? (
              <button key={r.lettre} type="button" onClick={() => onRepondre(r.lettre)} className={styles[r.aspect]}>
                {contenu}
              </button>
            ) : (
              <div key={r.lettre} className={styles[r.aspect]}>
                {contenu}
              </div>
            );
          })}
        </div>

        {repondu ? (
          <>
            <div className="border-t-2 border-encre pt-[11px] text-[12px] leading-[1.5] text-encre-80">
              <Texte valeur={question.commentaire} vide="Le commentaire révélé après la réponse s’affichera ici." />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-dotted border-filet-fort pt-[9px]">
              <span className="etiquette-xs text-encre-50">Source</span>
              {question.source_nom.trim() && question.source_lien.trim() ? (
                <a
                  href={question.source_lien}
                  target="_blank"
                  rel="noreferrer"
                  className="etiquette-xs truncate text-right tracking-[0.08em] text-juste underline decoration-juste/40 underline-offset-[3px] hover:decoration-juste"
                >
                  {question.source_nom} ↗
                </a>
              ) : (
                <span className="etiquette-xs truncate text-right tracking-[0.08em] text-juste">
                  {question.source_nom.trim() ? question.source_nom : <span className="italic text-encre-30">source à renseigner</span>}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-auto pt-3.5">
            <button
              type="button"
              disabled={!vue.peutDemanderIndice || !onDemanderIndice}
              onClick={onDemanderIndice}
              className="flex min-h-[42px] w-full items-center justify-between gap-2.5 rounded-fin border-[1.5px] border-dashed border-indice px-3 py-2.5 text-[13px] font-semibold text-indice-texte disabled:opacity-60"
            >
              <span>{vue.libelleIndice}</span>
              <span className="font-mono text-[9px] font-normal">{vue.compteurIndices}</span>
            </button>
            <div className="mt-[11px] border-t border-filet-fort pt-[9px]">
              <div className="flex items-baseline justify-between">
                <span className="etiquette-xs text-encre-50">Enjeu actuel</span>
                <span className="flex items-baseline gap-[9px]">
                  <span className="font-titre text-[19px] font-semibold leading-none text-juste">{formaterPoints(vue.gain)}</span>
                  <span className="font-mono text-[9px] text-encre-30">/</span>
                  <span className="font-titre text-[19px] font-semibold leading-none text-faux-vif">{formaterPoints(-vue.perte)}</span>
                </span>
              </div>
              {vue.indicesUtilises > 0 ? (
                <div className="mt-2 flex items-center gap-[6px] font-mono text-[9px] tracking-[0.06em]">
                  {vue.descenteBareme.map((g, i) => (
                    <span key={i} className="flex items-center gap-[6px]">
                      {i > 0 ? <span className="text-filet-fort">→</span> : null}
                      <span
                        className={
                          i < vue.indicesUtilises
                            ? 'text-[#A79C8A] line-through'
                            : i === vue.indicesUtilises
                              ? 'bg-encre px-1.5 py-0.5 font-semibold text-papier'
                              : 'text-encre-50'
                        }
                      >
                        {g}
                      </span>
                    </span>
                  ))}
                  <span className="ml-auto text-encre-30 tracking-[0.1em]">DESCENTE DU BARÈME</span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
