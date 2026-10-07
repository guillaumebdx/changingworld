// Scénario de bout en bout dans le navigateur : nouvelle question → streaming → régénération → validation → API publique
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const base = 'http://localhost:5173';
const captures = 'C:/Users/guill/Documents/Dev/ChangingWorld/captures';
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1440, height: 1240 } });
page.setDefaultTimeout(30_000);
const erreursConsole = [];
page.on('pageerror', (e) => erreursConsole.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') erreursConsole.push(`console: ${m.text()}`); });

await page.goto(base);
await page.getByLabel('Mot de passe').fill('atelier');
await page.getByRole('button', { name: 'Entrer' }).click();
await page.getByRole('heading', { name: 'Questions' }).waitFor();

// Nouvelle question avec consigne
await page.goto(`${base}/questions/nouvelle`);
await page.getByLabel('Consigne libre (facultative)').fill('sur la vaccination en Afrique au XXe siècle');
await page.getByRole('button', { name: 'Générer la question' }).click();
await page.getByText('L’IA rédige…').first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(captures, 'flux-1-streaming.png'), fullPage: true });
console.log('✓ streaming visible');
await page.getByText('L’IA rédige…').first().waitFor({ state: 'detached', timeout: 60_000 });
await page.waitForTimeout(500);
const url = page.url();
const id = Number(url.match(/questions\/(\d+)/)[1]);
const question = await page.getByLabel('Question', { exact: true }).inputValue();
console.log(`✓ génération terminée, question ${id} : ${question.slice(0, 60)}…`);
if (!question.includes('démo, consigne')) throw new Error('La consigne n’a pas été transmise au faux client');
await page.screenshot({ path: resolve(captures, 'flux-2-genere.png'), fullPage: true });

// Modifier un champ puis Ctrl+S
const indice1 = page.getByLabel('Indice 1');
await indice1.fill('Un indice modifié à la main par Bernard.');
await page.keyboard.press('Control+s');
await page.getByText(/Enregistrée à/).waitFor();
console.log('✓ Ctrl+S enregistre');

// Régénérer l'indice 2 avec une consigne
const avantIndice2 = await page.getByLabel('Indice 2').inputValue();
const boutons = page.getByRole('button', { name: 'Régénérer', exact: true });
await boutons.nth(2).click(); // 0 question, 1 indice 1, 2 indice 2
const dialogue = page.getByRole('dialog', { name: 'Consigne de régénération' });
await dialogue.getByPlaceholder(/Consigne facultative/).fill('rends-le moins évident');
await dialogue.getByRole('button', { name: 'Lancer' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(captures, 'flux-3-regeneration.png'), fullPage: false });
await page.getByText('L’IA rédige…').first().waitFor({ state: 'detached', timeout: 60_000 });
await page.waitForTimeout(300);
const apresIndice2 = await page.getByLabel('Indice 2').inputValue();
console.log(`✓ régénération : « ${avantIndice2.slice(0, 40)} » → « ${apresIndice2.slice(0, 40)} »`);
if (avantIndice2 === apresIndice2) throw new Error('L’indice 2 n’a pas changé');
const indice1Apres = await indice1.inputValue();
if (!indice1Apres.includes('Bernard')) throw new Error('La modification manuelle de l’indice 1 a été perdue');

// Historique : IA + Bernard
const nbHist = await page.locator('ol li').count();
console.log(`✓ historique : ${nbHist} versions`);

// Relecture critique
await page.getByRole('button', { name: 'Lancer la relecture critique' }).click();
await page.getByText('Chiffre principal').waitFor({ timeout: 30_000 });
console.log('✓ relecture critique affichée');

// Jouer dans le téléphone : demander un indice puis répondre
await page.getByRole('button', { name: /Demander un indice/ }).click();
await page.getByRole('tab', { name: 'Indice 1' }).waitFor();
await page.screenshot({ path: resolve(captures, 'flux-4-avant-validation.png'), fullPage: true });

// Valider (Ctrl+Entrée)
await page.keyboard.press('Control+Enter');
await page.getByText('Question validée').waitFor();
console.log('✓ validée');

// API publique
const publiques = await (await fetch('http://localhost:3001/api/public/questions')).json();
const trouvee = publiques.questions.find((q) => q.id === id);
if (!trouvee) throw new Error('La question validée n’apparaît pas dans /api/public/questions');
if ('fait' in trouvee || 'statut' in trouvee) throw new Error('Champs internes exposés');
console.log(`✓ présente dans /api/public/questions (${publiques.questions.length} validées)`);

// Export
const res = await page.request.get('http://localhost:5173/api/admin/export.xlsx');
console.log(`✓ export : ${res.status()} ${res.headers()['content-type']} ${(await res.body()).length} octets`);

// Prompts : nouvelle version puis test
await page.goto(`${base}/prompts`);
await page.getByText('Historique des versions').waitFor();
const zone = page.locator('#prompt-texte');
await zone.fill((await zone.inputValue()) + '\n\nNe jamais citer Wikipédia comme source.');
await page.getByLabel('Note de version (facultative)').fill('Interdit Wikipédia.');
await page.getByRole('button', { name: /Enregistrer la v\d+/ }).click();
await page.getByText(/Version \d+ enregistrée/).waitFor();
await page.getByRole('button', { name: 'Tester' }).click();
await page.getByText('Test de la version en service').waitFor();
await page.waitForTimeout(3000);
await page.screenshot({ path: resolve(captures, 'flux-5-prompts-test.png'), fullPage: true });
console.log('✓ version v2 créée, test lancé');

// Déconnexion → route protégée
await page.getByRole('button', { name: 'Se déconnecter' }).click();
await page.getByRole('button', { name: 'Entrer' }).waitFor();
const prot = await page.request.get('http://localhost:5173/api/admin/questions');
console.log(`✓ déconnexion : /api/admin/questions → ${prot.status()}`);

if (erreursConsole.length) console.log('Erreurs console :\n' + erreursConsole.join('\n'));
else console.log('✓ aucune erreur console');
await navigateur.close();
