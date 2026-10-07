import { diffLignes } from '../../utils/diff';

export function DiffVersions({ avant, apres, libelleAvant, libelleApres }: { avant: string; apres: string; libelleAvant: string; libelleApres: string }) {
  const lignes = diffLignes(avant, apres);
  const nbAjouts = lignes.filter((l) => l.type === 'ajout').length;
  const nbRetraits = lignes.filter((l) => l.type === 'retrait').length;
  return (
    <div className="rounded-fin border border-filet-fort bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-filet-fort px-3.5 py-2">
        <span className="etiquette text-encre-70">
          {libelleAvant} → {libelleApres}
        </span>
        <span className="font-mono text-[10px]">
          <span className="text-juste">+{nbAjouts}</span> <span className="text-faux-vif">−{nbRetraits}</span>
        </span>
      </div>
      <pre className="m-0 max-h-[420px] overflow-auto p-0 font-mono text-[11px] leading-[1.7]">
        {lignes.map((l, i) => (
          <div
            key={i}
            className={
              l.type === 'ajout'
                ? 'bg-juste-fond px-3.5 text-juste-texte'
                : l.type === 'retrait'
                  ? 'bg-faux-fond px-3.5 text-faux-texte line-through decoration-faux/40'
                  : 'px-3.5 text-encre-70'
            }
          >
            <span className="mr-2 inline-block w-3 select-none text-encre-30">{l.type === 'ajout' ? '+' : l.type === 'retrait' ? '−' : ' '}</span>
            {l.texte || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
