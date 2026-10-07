# Maquettes Claude Design : Changing World

Référence visuelle uniquement. Ne pas copier ce HTML dans le code de l'app.
Extraire couleurs, typo et espacements dans le thème, puis reconstruire les écrans en composants React.

## Contenu
- `source/` : fichiers d'origine Claude Design (`.dc.html`, styles inline, balises `<x-dc>` propres à Claude Design).
  - `Main` : direction visuelle (palette, typo, composants)
  - `Mobile-Question`, `Mobile-Indices`, `Mobile-Juste`, `Mobile-Faux`, `Mobile-Score` : app joueur (390x844)
  - `Admin-Editeur` : éditeur de question desktop 1440 avec aperçu joueur (interactif : la logique est dans le `<script type="text/x-dc">` en bas du fichier, syntaxe `{{ }}`)
  - `Admin-Prompts` : gestion des prompts
  - `canvas.json` : disposition des planches
- `preview/` : mêmes écrans en HTML simple, ouvrables dans un navigateur (sauf Admin-Editeur, interactif).

## Repères design
- Polices : Fraunces (titres, chiffres), Archivo (UI), IBM Plex Mono (étiquettes)
- Fond papier #F2ECE1, surface #FBF7EF, encre #1E1A15, bordures #C4B79E / #D8CDB9
- Juste #1D5B45, faux #8A2E1C / #A8432C, indices #725310 / #8A6516
- Catégories : Démographie #A8432C, Économie #1D5B45, Santé #A3344F, Technologie #2A4A80,
  Transport #8A6516, Urbanisation #4D4669, Agriculture #5F6B22, Éducation #1E6274
- Rayons 2px, bordures fines, pas d'ombres
