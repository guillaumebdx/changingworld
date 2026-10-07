import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ChampRegenerable } from '@changing-world/shared';
import { EtiquetteChamp } from '../ui/Champ';
import { IconeRegenerer } from '../ui/Icones';
import { PointsEnCours } from '../ui/Bouton';

/** Bouton « Régénérer » avec une consigne facultative, affichée dans un petit volet sous le bouton. */
export function BoutonRegenerer({
  cible,
  onRegenerer,
  verrouille = false,
  libelle = 'Régénérer',
}: {
  cible: ChampRegenerable;
  onRegenerer: (cible: ChampRegenerable, consigne: string) => void;
  verrouille?: boolean;
  libelle?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [consigne, setConsigne] = useState('');
  const conteneur = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  const lancer = () => {
    onRegenerer(cible, consigne.trim());
    setOuvert(false);
    setConsigne('');
  };

  return (
    <span ref={conteneur} className="relative inline-flex">
      <button
        type="button"
        disabled={verrouille}
        onClick={() => setOuvert((o) => !o)}
        className="etiquette-xs inline-flex items-center gap-[5px] text-encre-30 hover:text-encre-70 disabled:opacity-50"
        aria-expanded={ouvert}
        aria-haspopup="dialog"
      >
        <IconeRegenerer />
        {libelle}
      </button>
      {ouvert ? (
        <div
          role="dialog"
          aria-label="Consigne de régénération"
          className="absolute right-0 top-full z-10 mt-1.5 flex w-[380px] max-w-[90vw] items-center gap-2 rounded-fin border border-dashed border-indice bg-indice-fond-ia px-2.5 py-2 shadow-none"
        >
          <input
            type="text"
            autoFocus
            value={consigne}
            onChange={(e) => setConsigne(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                lancer();
              }
              if (e.key === 'Escape') setOuvert(false);
            }}
            placeholder="Consigne facultative, ex. « moins évident »"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-encre outline-none placeholder:text-encre-30"
          />
          <button type="button" onClick={lancer} className="etiquette-xs flex-none rounded-fin bg-encre px-2.5 py-1.5 font-semibold text-papier">
            Lancer
          </button>
        </div>
      ) : null}
    </span>
  );
}

interface Props {
  etiquette: ReactNode;
  valeur: string;
  onChange: (v: string) => void;
  /** Cible de régénération ; absent = champ non régénérable. */
  cible?: ChampRegenerable;
  onRegenerer?: (cible: ChampRegenerable, consigne: string) => void;
  /** L'IA est en train d'écrire dans ce champ. */
  enCours?: boolean;
  /** Une génération est en cours et ce champ n'a pas encore été atteint. */
  enAttente?: boolean;
  /** Toute régénération est bloquée (une autre est en cours). */
  verrouille?: boolean;
  multiligne?: boolean;
  lignes?: number;
  classeTexte?: string;
  compteur?: boolean;
  teinte?: 'normal' | 'indice' | 'interne';
  placeholder?: string;
  mono?: boolean;
  enEvidence?: boolean;
  droite?: ReactNode;
}

export function ChampGenere({
  etiquette,
  valeur,
  onChange,
  cible,
  onRegenerer,
  enCours = false,
  enAttente = false,
  verrouille = false,
  multiligne = false,
  lignes = 2,
  classeTexte = '',
  compteur = false,
  teinte = 'normal',
  placeholder,
  mono = false,
  enEvidence = false,
  droite,
}: Props) {
  const id = useId();
  const classeCommune = `champ ${mono ? 'font-mono text-[11px]' : ''} ${enEvidence ? 'border-faux-vif' : ''} ${
    enCours ? 'border-dashed border-indice bg-indice-fond-ia' : ''
  } ${classeTexte}`;

  return (
    <div>
      <div className="mb-[6px] flex min-h-[16px] items-center justify-between gap-2">
        <span className="flex items-center gap-[9px]">
          <EtiquetteChamp htmlFor={id} teinte={teinte}>
            {etiquette}
          </EtiquetteChamp>
          {enCours ? (
            <span className="etiquette-xs inline-flex items-center gap-[5px] text-indice">
              <PointsEnCours />
              L’IA rédige…
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-3.5">
          {compteur && valeur ? <span className="etiquette-xs text-encre-30">{valeur.length} car.</span> : null}
          {droite}
          {cible && onRegenerer ? <BoutonRegenerer cible={cible} onRegenerer={onRegenerer} verrouille={verrouille} /> : null}
        </span>
      </div>

      {enAttente || (enCours && !valeur) ? (
        <div className="rounded-fin border-[1.5px] border-dashed border-indice bg-indice-fond-ia p-3" aria-busy="true">
          <div className="squelette h-[9px] w-[94%]" />
          <div className="squelette mt-2 h-[9px] w-[78%]" style={{ animationDelay: '0.15s' }} />
          {multiligne ? <div className="squelette mt-2 h-[9px] w-[46%]" style={{ animationDelay: '0.3s' }} /> : null}
        </div>
      ) : multiligne ? (
        <textarea
          id={id}
          rows={lignes}
          value={valeur}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${classeCommune} resize-y leading-[1.45]`}
        />
      ) : (
        <input id={id} type="text" value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={classeCommune} />
      )}
    </div>
  );
}
