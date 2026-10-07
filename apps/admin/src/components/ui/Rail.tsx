import { NavLink } from 'react-router-dom';
import { useCompteurs, useDeconnexion, usePrompts, useSession } from '../../api/hooks';
import { IconeExport, IconeGenerer, IconePrompts, IconeQuestions, IconeReglages } from './Icones';

export function Rail() {
  const compteurs = useCompteurs();
  const prompts = usePrompts();
  const session = useSession();
  const deconnexion = useDeconnexion();
  const aRelire = compteurs.data ? compteurs.data.parStatut.brouillon_ia + compteurs.data.parStatut.a_affiner : null;

  const entrees = [
    { vers: '/', libelle: 'Questions', icone: <IconeQuestions />, compteur: aRelire, fin: true },
    { vers: '/questions/nouvelle', libelle: 'Nouvelle question', icone: <IconeGenerer />, compteur: null, fin: false },
    { vers: '/prompts', libelle: 'Prompts', icone: <IconePrompts />, compteur: prompts.data?.length ?? null, fin: false },
    { vers: '/reglages', libelle: 'Réglages', icone: <IconeReglages />, compteur: null, fin: false },
    { vers: '/export', libelle: 'Export', icone: <IconeExport />, compteur: null, fin: false },
  ];

  return (
    <nav aria-label="Navigation principale" className="flex w-[204px] min-w-[180px] flex-none flex-col gap-7 border-r border-filet-fort bg-rail px-[18px] pb-[22px] pt-[26px]">
      <div>
        <div className="font-titre text-[19px] font-semibold leading-[1.1] tracking-[-0.01em]">
          Changing
          <br />
          World
        </div>
        <div className="etiquette-xs mt-[7px] text-encre-50">Atelier éditorial</div>
      </div>

      <div className="flex flex-col gap-0.5">
        {entrees.map((e) => (
          <NavLink
            key={e.vers}
            to={e.vers}
            end={e.fin}
            className={({ isActive }) =>
              `flex min-h-[40px] items-center gap-2.5 rounded-fin px-2.5 py-2 text-[13px] no-underline transition-colors ${
                isActive ? 'border border-filet-fort bg-[#F7F2E7] font-semibold text-encre' : 'border border-transparent text-encre-70 hover:bg-[#F7F2E7]/60'
              }`
            }
          >
            {e.icone}
            <span>{e.libelle}</span>
            {e.compteur !== null && e.compteur > 0 ? (
              <span className="ml-auto font-mono text-[11px] font-medium text-indice-texte">{e.compteur}</span>
            ) : null}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto border-t border-filet-fort pt-3.5">
        <div className="text-[13px] font-semibold">Bernard</div>
        <div className="etiquette-xs mt-[3px] text-encre-50">Ligne éditoriale</div>
        {session.data?.demo ? (
          <div className="mt-3 border border-dashed border-indice px-2 py-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-indice-texte">
            Mode démo : IA factice (pas de clé OpenAI)
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => deconnexion.mutate()}
          className="etiquette-xs mt-3 text-encre-30 underline decoration-filet-fort underline-offset-[3px] hover:text-encre-70"
        >
          Se déconnecter
        </button>
      </div>
    </nav>
  );
}
