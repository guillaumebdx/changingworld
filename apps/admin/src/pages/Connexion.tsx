import { useState, type FormEvent } from 'react';
import { useConnexion } from '../api/hooks';
import { Bouton } from '../components/ui/Bouton';
import { Champ } from '../components/ui/Champ';

export default function Connexion({ demo }: { demo: boolean }) {
  const [motDePasse, setMotDePasse] = useState('');
  const connexion = useConnexion();

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (!motDePasse) return;
    connexion.mutate(motDePasse);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-papier px-6 py-12">
      <form onSubmit={soumettre} className="w-full max-w-[420px] border border-filet-fort bg-surface px-9 pb-9 pt-8">
        <div className="border-b-2 border-encre pb-5">
          <div className="etiquette-sm text-encre-50 tracking-[0.18em]">Atelier éditorial</div>
          <div className="font-titre mt-2.5 text-[38px] font-semibold leading-none tracking-[-0.015em]">
            Changing
            <br />
            World
          </div>
        </div>
        <p className="mb-6 mt-5 text-[14px] leading-relaxed text-encre-70">
          Bonjour Bernard. Entrez le mot de passe de l’atelier pour retrouver les questions, les prompts et les réglages.
        </p>
        <Champ
          etiquette="Mot de passe"
          type="password"
          name="mot_de_passe"
          autoComplete="current-password"
          autoFocus
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          aria-invalid={connexion.isError}
        />
        {connexion.isError ? (
          <div role="alert" className="mt-3 text-[13px] text-faux-texte">
            {connexion.error.message}
          </div>
        ) : null}
        <Bouton type="submit" variante="principal" className="mt-5 w-full" enCours={connexion.isPending} disabled={!motDePasse}>
          Entrer
        </Bouton>
        {demo ? (
          <p className="mb-0 mt-5 border-t border-dotted border-filet-fort pt-4 text-[12px] leading-relaxed text-encre-50">
            Mode démo : aucune clé OpenAI n’est configurée, les générations seront factices mais l’atelier reste entièrement utilisable.
          </p>
        ) : null}
      </form>
    </div>
  );
}
