import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface BaseProps {
  etiquette?: ReactNode;
  /** Éléments à droite de l'étiquette (compteur, bouton Régénérer). */
  actions?: ReactNode;
  aide?: ReactNode;
  className?: string;
  teinte?: 'normal' | 'indice' | 'interne';
}

export function EtiquetteChamp({ htmlFor, children, teinte = 'normal' }: { htmlFor?: string; children: ReactNode; teinte?: BaseProps['teinte'] }) {
  const couleur = teinte === 'indice' || teinte === 'interne' ? 'text-indice-texte' : 'text-encre-70';
  return (
    <label htmlFor={htmlFor} className={`etiquette ${couleur}`}>
      {children}
    </label>
  );
}

export function EnteteChamp({ htmlFor, etiquette, actions, teinte }: { htmlFor?: string } & BaseProps) {
  if (!etiquette && !actions) return null;
  return (
    <div className="mb-[7px] flex min-h-[16px] items-center justify-between gap-2">
      {etiquette ? <EtiquetteChamp htmlFor={htmlFor} teinte={teinte}>{etiquette}</EtiquetteChamp> : <span />}
      {actions ? <div className="flex items-center gap-3.5">{actions}</div> : null}
    </div>
  );
}

export function Champ({ etiquette, actions, aide, className = '', teinte, ...reste }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <EnteteChamp htmlFor={id} etiquette={etiquette} actions={actions} teinte={teinte} />
      <input id={id} className="champ" {...reste} />
      {aide ? <div className="mt-1.5 text-[12px] text-encre-50">{aide}</div> : null}
    </div>
  );
}

export function ZoneTexte({
  etiquette,
  actions,
  aide,
  className = '',
  teinte,
  classeTexte = '',
  ...reste
}: BaseProps & { classeTexte?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const fond = teinte === 'interne' ? 'bg-indice-fond border-indice-bordure-interne text-[#4A3C14] focus:bg-indice-fond' : '';
  return (
    <div className={className}>
      <EnteteChamp htmlFor={id} etiquette={etiquette} actions={actions} teinte={teinte} />
      <textarea id={id} className={`champ resize-y leading-[1.5] ${fond} ${classeTexte}`} {...reste} />
      {aide ? <div className="mt-1.5 text-[12px] text-encre-50">{aide}</div> : null}
    </div>
  );
}

export function Selection({
  etiquette,
  actions,
  aide,
  className = '',
  pastille,
  children,
  ...reste
}: BaseProps & { pastille?: string | null } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <EnteteChamp htmlFor={id} etiquette={etiquette} actions={actions} />
      <div className="champ flex items-center gap-[9px] px-[11px] py-0">
        {pastille ? <span className="h-[9px] w-[9px] flex-none" style={{ background: pastille }} aria-hidden="true" /> : null}
        <select id={id} className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-[11px] pr-5 outline-none" {...reste}>
          {children}
        </select>
        <span className="pointer-events-none -ml-4 text-encre-50" aria-hidden="true">
          ▾
        </span>
      </div>
      {aide ? <div className="mt-1.5 text-[12px] text-encre-50">{aide}</div> : null}
    </div>
  );
}

export function Interrupteur({ actif, onChange, etiquette }: { actif: boolean; onChange: (v: boolean) => void; etiquette: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={etiquette}
      onClick={() => onChange(!actif)}
      className={`relative inline-flex h-[22px] w-[40px] flex-none items-center rounded-fin border-[1.5px] transition-colors ${
        actif ? 'border-juste bg-juste' : 'border-filet-fort bg-surface'
      }`}
    >
      <span
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-[1px] transition-all ${actif ? 'left-[20px] bg-papier' : 'left-[3px] bg-filet-fort'}`}
      />
    </button>
  );
}
