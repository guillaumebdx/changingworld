import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreerQuestion, useFormats, useTaxonomie } from '../api/hooks';
import { Bouton } from '../components/ui/Bouton';
import { Selection, ZoneTexte } from '../components/ui/Champ';
import { EnTetePage } from '../components/ui/EnTetePage';
import { Erreur } from '../components/ui/Etats';

export default function NouvelleQuestion() {
  const navigate = useNavigate();
  const taxonomie = useTaxonomie();
  const formats = useFormats();
  const creer = useCreerQuestion();
  const [categorieId, setCategorieId] = useState('');
  const [sousCategorieId, setSousCategorieId] = useState('');
  const [formatId, setFormatId] = useState('');
  const [consigne, setConsigne] = useState('');

  const sousCategories = taxonomie.data?.categories.find((c) => String(c.id) === categorieId)?.sous_categories ?? [];
  const categorieChoisie = taxonomie.data?.categories.find((c) => String(c.id) === categorieId);
  const formatsActifs = formats.data?.filter((f) => f.actif) ?? [];
  const formatChoisi = formatsActifs.find((f) => String(f.id) === formatId);

  const lancer = async (e: FormEvent) => {
    e.preventDefault();
    const question = await creer.mutateAsync({
      categorie_id: categorieId ? Number(categorieId) : null,
      sous_categorie_id: sousCategorieId ? Number(sousCategorieId) : null,
      format_id: formatId ? Number(formatId) : null,
    });
    const p = new URLSearchParams({ generer: '1' });
    if (consigne.trim()) p.set('consigne', consigne.trim());
    navigate(`/questions/${question.id}?${p.toString()}`);
  };

  return (
    <>
      <EnTetePage titre="Nouvelle question" sousTitre="Choisissez le terrain, l’IA rédige, vous relisez dans l’éditeur" />
      <form onSubmit={lancer} className="max-w-[820px]">
        <p className="mb-6 mt-0 text-[14px] leading-relaxed text-encre-70">
          Chaque choix peut rester « au hasard » : l’atelier pioche alors une sous-catégorie en retard sur sa cible et un format actif. La
          génération démarre dès l’arrivée dans l’éditeur, champ par champ.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px] border-t border-filet pt-5">
          <Selection
            etiquette="Catégorie"
            pastille={categorieChoisie?.couleur ?? null}
            value={categorieId}
            onChange={(e) => {
              setCategorieId(e.target.value);
              setSousCategorieId('');
            }}
          >
            <option value="">Au hasard</option>
            {taxonomie.data?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Selection>
          <Selection etiquette="Sous-catégorie" value={sousCategorieId} onChange={(e) => setSousCategorieId(e.target.value)} disabled={!categorieId}>
            <option value="">{categorieId ? 'Au hasard dans la catégorie' : 'Au hasard'}</option>
            {sousCategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </Selection>
          <Selection
            etiquette="Format"
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            aide={formatChoisi?.gabarit ? <span className="font-titre italic">{formatChoisi.gabarit}</span> : undefined}
          >
            <option value="">Au hasard parmi les formats actifs</option>
            {formatsActifs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </Selection>
        </div>

        <ZoneTexte
          className="mt-5 border-t border-filet pt-5"
          etiquette="Consigne libre (facultative)"
          rows={3}
          placeholder="Par exemple : sur la vaccination en Afrique au XXe siècle"
          value={consigne}
          onChange={(e) => setConsigne(e.target.value)}
          aide="La consigne est injectée dans le prompt via la variable {{consigne}}."
        />

        {creer.isError ? <Erreur titre="Impossible de créer la question" erreur={creer.error} className="mt-5" /> : null}

        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t-2 border-encre pt-[18px]">
          <Bouton type="submit" variante="principal" enCours={creer.isPending}>
            Générer la question
          </Bouton>
          <Bouton variante="tertiaire" onClick={() => navigate('/')}>
            Annuler
          </Bouton>
          <span className="etiquette-xs ml-auto text-encre-30">La question naît en brouillon IA</span>
        </div>
      </form>
    </>
  );
}
