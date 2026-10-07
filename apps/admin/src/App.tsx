import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EVENEMENT_DECONNEXION } from './api/client';
import { cles, useSession, type Session } from './api/hooks';
import { Rail } from './components/ui/Rail';
import { Chargement, Erreur } from './components/ui/Etats';
import Connexion from './pages/Connexion';
import Questions from './pages/Questions';
import NouvelleQuestion from './pages/NouvelleQuestion';
import Editeur from './pages/Editeur';
import Prompts from './pages/Prompts';
import Reglages from './pages/Reglages';
import Export from './pages/Export';

export default function App() {
  const session = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    const surDeconnexion = () =>
      qc.setQueryData<Session>(cles.session, (s) => ({ demo: s?.demo ?? false, connecte: false }));
    window.addEventListener(EVENEMENT_DECONNEXION, surDeconnexion);
    return () => window.removeEventListener(EVENEMENT_DECONNEXION, surDeconnexion);
  }, [qc]);

  if (session.isPending) {
    return (
      <div className="mx-auto max-w-lg px-8 pt-24">
        <Chargement texte="Ouverture de l’atelier…" />
      </div>
    );
  }

  if (session.isError) {
    return (
      <div className="mx-auto max-w-lg px-8 pt-24">
        <Erreur titre="L’API ne répond pas" erreur={session.error} reessayer={() => session.refetch()} />
        <p className="mt-4 text-[13px] text-encre-50">Vérifiez que l’API tourne (npm run dev lance l’API et l’admin ensemble).</p>
      </div>
    );
  }

  if (!session.data.connecte) {
    return <Connexion demo={session.data.demo} />;
  }

  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-papier text-encre">
      <Rail />
      <main className="min-w-0 flex-[999_1_720px] px-[34px] pb-[34px] pt-[26px]">
        <Routes>
          <Route path="/" element={<Questions />} />
          <Route path="/questions" element={<Navigate to="/" replace />} />
          <Route path="/questions/nouvelle" element={<NouvelleQuestion />} />
          <Route path="/questions/:id" element={<Editeur />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/prompts/:id" element={<Prompts />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="/export" element={<Export />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
