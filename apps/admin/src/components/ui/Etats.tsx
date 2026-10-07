import type { ReactNode } from 'react';
import { Bouton } from './Bouton';

export function Chargement({ texte = 'Un instant, les données arrivent…', className = '' }: { texte?: string; className?: string }) {
  return (
    <div className={`py-10 ${className}`} role="status" aria-live="polite">
      <div className="etiquette text-encre-50">{texte}</div>
      <div className="mt-4 flex max-w-md flex-col gap-2">
        <div className="squelette h-[9px] w-[92%]" />
        <div className="squelette h-[9px] w-[74%]" style={{ animationDelay: '0.15s' }} />
        <div className="squelette h-[9px] w-[48%]" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}

export function EtatVide({ titre, texte, action, className = '' }: { titre: string; texte?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`border-t-2 border-encre py-10 ${className}`}>
      <div className="font-titre text-[22px] font-semibold tracking-[-0.01em]">{titre}</div>
      {texte ? <div className="mt-2 max-w-xl text-[14px] leading-relaxed text-encre-70">{texte}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Erreur({
  titre = 'Quelque chose a coincé',
  erreur,
  reessayer,
  className = '',
}: {
  titre?: string;
  erreur: unknown;
  reessayer?: () => void;
  className?: string;
}) {
  const message = erreur instanceof Error ? erreur.message : typeof erreur === 'string' ? erreur : 'Erreur inconnue.';
  return (
    <div className={`rounded-fin border-[1.5px] border-faux-vif bg-faux-fond px-4 py-3.5 text-faux-texte ${className}`} role="alert">
      <div className="etiquette">{titre}</div>
      <div className="mt-1.5 text-[14px] leading-relaxed">{message}</div>
      {reessayer ? (
        <div className="mt-3">
          <Bouton variante="danger" taille="petit" onClick={reessayer}>
            Réessayer
          </Bouton>
        </div>
      ) : null}
    </div>
  );
}

export function Avis({ children, teinte = 'indice', className = '' }: { children: ReactNode; teinte?: 'indice' | 'juste' | 'neutre'; className?: string }) {
  const style =
    teinte === 'juste'
      ? 'border-juste bg-juste-fond text-juste-texte'
      : teinte === 'neutre'
        ? 'border-filet-fort bg-rail text-encre-70'
        : 'border-indice bg-indice-fond text-indice-texte';
  return <div className={`rounded-fin border px-3.5 py-2.5 text-[13px] leading-relaxed ${style} ${className}`}>{children}</div>;
}
