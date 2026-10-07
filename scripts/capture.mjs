/**
 * Captures d'écran de l'admin (et des maquettes, pour comparaison) avec Playwright.
 * Prérequis : `npm run dev` lancé, Chromium installé (`npx playwright install chromium`).
 * Usage : node scripts/capture.mjs [--mot-de-passe=xxx] [--base=http://localhost:5173]
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base ?? 'http://localhost:5173';
const dossier = resolve(racine, 'captures');
mkdirSync(dossier, { recursive: true });

function motDePasse() {
  if (args['mot-de-passe']) return args['mot-de-passe'];
  const env = resolve(racine, '.env');
  if (existsSync(env)) {
    const m = readFileSync(env, 'utf8').match(/^ADMIN_PASSWORD=(.*)$/m);
    if (m) return m[1].trim();
  }
  return 'changez-moi';
}

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1440, height: 1240 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(30_000);

// Attend que les polices Google soient chargées pour des captures fidèles
const attendrePolices = () => page.evaluate(() => document.fonts.ready.then(() => undefined));

console.log(`Connexion sur ${base}…`);
await page.goto(base);
await page.getByLabel('Mot de passe').fill(motDePasse());
await page.getByRole('button', { name: 'Entrer' }).click();
await page.getByRole('heading', { name: 'Questions' }).waitFor();
await attendrePolices();
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(dossier, 'questions.png'), fullPage: true });
console.log('✓ questions.png');

// Éditeur : la question de Bernard sur la population mondiale
await page.getByText('population mondiale triple').first().click();
await page.getByText('Aperçu joueur').waitFor();
await attendrePolices();
await page.waitForTimeout(600);
await page.screenshot({ path: resolve(dossier, 'editeur.png'), fullPage: true });
console.log('✓ editeur.png');

// Téléphone simulé dans chaque état
const telephone = page.getByTestId('telephone');
for (const etat of ['Question', 'Indice 1', 'Indice 2', 'Indice 3', 'Juste', 'Faux']) {
  await page.getByRole('tab', { name: etat }).click();
  await page.waitForTimeout(150);
  const nom = `telephone-${etat.toLowerCase().replace(/\s+/g, '-')}.png`;
  await telephone.screenshot({ path: resolve(dossier, nom) });
  console.log(`✓ ${nom}`);
}
await page.getByRole('tab', { name: 'Indice 2' }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: resolve(dossier, 'editeur-indice-2.png'), fullPage: false });

// La question sur l'espérance de vie : l'alerte resultat / bonne réponse doit apparaître
await page.goto(`${base}/?q=esperance`);
await page.locator('tbody tr').first().click();
await page.getByText('Points à vérifier').waitFor();
await attendrePolices();
await page.waitForTimeout(600);
await page.screenshot({ path: resolve(dossier, 'editeur-esperance-de-vie.png'), fullPage: true });
console.log('✓ editeur-esperance-de-vie.png');

// Prompts
await page.goto(`${base}/prompts`);
await page.getByText('Historique des versions').waitFor();
await attendrePolices();
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(dossier, 'prompts.png'), fullPage: true });
console.log('✓ prompts.png');

// Nouvelle question, réglages, export
for (const [chemin, nom] of [
  ['/questions/nouvelle', 'nouvelle-question.png'],
  ['/reglages', 'reglages.png'],
  ['/export', 'export.png'],
]) {
  await page.goto(`${base}${chemin}`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(dossier, nom), fullPage: true });
  console.log(`✓ ${nom}`);
}

// Maquettes de référence, pour comparaison côte à côte
const maquettes = resolve(racine, 'design/changing-world-design');
const reference = [
  ['preview/Admin-Prompts.html', 'maquette-prompts.png', { width: 1440, height: 1160 }],
  ['source/Admin-Editeur.dc.html', 'maquette-editeur.png', { width: 1440, height: 1240 }],
  ['preview/Mobile-Question.html', 'maquette-mobile-question.png', { width: 390, height: 844 }],
  ['preview/Mobile-Indices.html', 'maquette-mobile-indices.png', { width: 390, height: 844 }],
  ['preview/Mobile-Juste.html', 'maquette-mobile-juste.png', { width: 390, height: 844 }],
  ['preview/Mobile-Faux.html', 'maquette-mobile-faux.png', { width: 390, height: 844 }],
];
for (const [fichier, nom, viewport] of reference) {
  const chemin = resolve(maquettes, fichier);
  if (!existsSync(chemin)) continue;
  const p = await navigateur.newPage({ viewport });
  await p.goto(pathToFileURL(chemin).href);
  await p.evaluate(() => document.fonts.ready.then(() => undefined));
  await p.waitForTimeout(800);
  await p.screenshot({ path: resolve(dossier, nom), fullPage: true });
  await p.close();
  console.log(`✓ ${nom}`);
}

await navigateur.close();
console.log(`Captures dans ${dossier}`);
