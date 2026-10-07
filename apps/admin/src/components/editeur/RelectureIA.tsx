import type { RemarqueRelecture } from '@changing-world/shared';
import { Bouton } from '../ui/Bouton';
import { TitreSection } from '../ui/EnTetePage';
import { Erreur } from '../ui/Etats';

const GRAVITE: Record<RemarqueRelecture['gravite'], { pastille: string; libelle: string }> = {
  bloquant: { pastille: 'bg-faux-vif', libelle: 'bloquant' },
  important: { pastille: 'bg-indice', libelle: 'important' },
  mineur: { pastille: 'bg-encre-30', libelle: 'mineur' },
};

interface Props {
  remarques: RemarqueRelecture[] | null;
  enCours: boolean;
  erreur: unknown;
  onLancer: () => void;
  desactive?: boolean;
}

export function RelectureIA({ remarques, enCours, erreur, onLancer, desactive }: Props) {
  return (
    <section aria-labelledby="relecture-ia">
      <TitreSection droite={remarques ? `${remarques.length} remarque${remarques.length > 1 ? 's' : ''}` : undefined}>
        <span id="relecture-ia">Relecture critique IA</span>
      </TitreSection>
      <div className="border-t-2 border-encre pt-3">
        {!remarques && !enCours && !erreur ? (
          <p className="m-0 mb-3 text-[13px] leading-relaxed text-encre-50">
            Un second passage du modèle, en vérificateur sceptique : chiffres plausibles, cohérence question / réponse / commentaire,
            gradation des indices, ambiguïtés. Il ne modifie rien.
          </p>
        ) : null}
        {erreur ? <Erreur titre="La relecture a échoué" erreur={erreur} className="mb-3" /> : null}
        {remarques && remarques.length === 0 ? (
          <p className="m-0 mb-3 text-[13px] leading-relaxed text-juste-texte">Le relecteur n’a rien trouvé à redire.</p>
        ) : null}
        {remarques && remarques.length > 0 ? (
          <ul className="m-0 mb-3 list-none p-0">
            {remarques.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 border-b border-filet py-2.5 last:border-b-0">
                <span className={`mt-[6px] h-[7px] w-[7px] flex-none ${GRAVITE[r.gravite].pastille}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="etiquette-xs text-encre-70">{r.sujet}</span>
                    <span className={`etiquette-xs ${r.gravite === 'bloquant' ? 'text-faux-vif' : 'text-encre-30'}`}>{GRAVITE[r.gravite].libelle}</span>
                  </div>
                  <div className="mt-1 text-[13px] leading-[1.45] text-encre-80">{r.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <Bouton variante="affiner" taille="petit" onClick={onLancer} enCours={enCours} disabled={desactive}>
          {enCours ? 'Relecture en cours' : remarques ? 'Relire à nouveau' : 'Lancer la relecture critique'}
        </Bouton>
      </div>
    </section>
  );
}
