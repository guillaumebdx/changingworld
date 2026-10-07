import { Hono } from 'hono';
import ExcelJS from 'exceljs';
import type { Deps } from '../deps.js';
import { toutesLesQuestionsAffichees } from '../services/questions.js';

/** Les colonnes du fichier de Bernard, dans son ordre, précédées du numéro. */
export const COLONNES_EXPORT = [
  { cle: 'numero', entete: 'numero', largeur: 8 },
  { cle: 'question', entete: 'question', largeur: 60 },
  { cle: 'reponse_a', entete: 'reponse_a', largeur: 20 },
  { cle: 'reponse_b', entete: 'reponse_b', largeur: 20 },
  { cle: 'reponse_c', entete: 'reponse_c', largeur: 20 },
  { cle: 'bonne_reponse', entete: 'bonne_reponse', largeur: 10 },
  { cle: 'indice_1', entete: 'indice_1', largeur: 50 },
  { cle: 'indice_2', entete: 'indice_2', largeur: 50 },
  { cle: 'indice_3', entete: 'indice_3', largeur: 50 },
  { cle: 'commentaire', entete: 'commentaire', largeur: 60 },
  { cle: 'source_nom', entete: 'source_nom', largeur: 24 },
  { cle: 'source_lien', entete: 'source_lien', largeur: 40 },
  { cle: 'statut', entete: 'statut', largeur: 14 },
  { cle: 'commentaire_interne', entete: 'commentaire_interne', largeur: 30 },
  { cle: 'categorie', entete: 'categorie', largeur: 22 },
  { cle: 'sous_categorie', entete: 'sous_categorie', largeur: 26 },
  { cle: 'fait', entete: 'fait', largeur: 50 },
  { cle: 'chiffres', entete: 'chiffres', largeur: 50 },
  { cle: 'calculs', entete: 'calculs', largeur: 50 },
  { cle: 'resultat', entete: 'resultat', largeur: 20 },
  { cle: 'type', entete: 'type', largeur: 30 },
  { cle: 'impact', entete: 'impact', largeur: 14 },
] as const;

export function routesExport({ db }: Deps) {
  const app = new Hono();

  app.get('/export.xlsx', async () => {
    const classeur = new ExcelJS.Workbook();
    classeur.creator = 'Changing World';
    classeur.created = new Date();
    const feuille = classeur.addWorksheet('Questions', { views: [{ state: 'frozen', ySplit: 1 }] });
    feuille.columns = COLONNES_EXPORT.map((col) => ({ header: col.entete, key: col.cle, width: col.largeur }));
    feuille.getRow(1).font = { bold: true };

    for (const q of toutesLesQuestionsAffichees(db).sort((a, b) => a.numero - b.numero)) {
      feuille.addRow({
        numero: q.numero,
        question: q.question,
        reponse_a: q.reponse_a,
        reponse_b: q.reponse_b,
        reponse_c: q.reponse_c,
        bonne_reponse: q.bonne_reponse,
        indice_1: q.indice_1,
        indice_2: q.indice_2,
        indice_3: q.indice_3,
        commentaire: q.commentaire,
        source_nom: q.source_nom,
        source_lien: q.source_lien,
        statut: q.statut,
        commentaire_interne: q.commentaire_interne ?? '',
        categorie: q.categorie_nom,
        sous_categorie: q.sous_categorie_nom,
        fait: q.fait,
        chiffres: q.chiffres,
        calculs: q.calculs,
        resultat: q.resultat,
        type: q.format_nom,
        impact: q.impact,
      });
    }
    feuille.eachRow((ligne) => {
      ligne.alignment = { vertical: 'top', wrapText: true };
    });

    const tampon = await classeur.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(tampon as ArrayBuffer, {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="changing-world-questions-${date}.xlsx"`,
      },
    });
  });

  return app;
}
