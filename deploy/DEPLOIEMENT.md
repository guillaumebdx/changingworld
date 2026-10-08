# Déploiement sur le VPS

Cible : https://changingworld.harari.ovh, code dans `/var/www/changingworld`, API sur le port 3010 (le 3001 est pris par lightstudio).

En production, un seul processus Node : l'API Hono sert aussi l'admin construite par Vite (`apps/admin/dist`). Pas de serveur Vite à lancer.

## Première installation

```bash
# 1. Node 22 (le SDK OpenAI l'exige, et better-sqlite3 a des binaires précompilés pour cette version)
nvm install 22 && nvm alias default 22
node --version                      # v22.x

# 2. Code
sudo mkdir -p /var/www/changingworld /var/log/changingworld
sudo chown -R ubuntu:ubuntu /var/www/changingworld /var/log/changingworld
cd /var/www/changingworld
git clone <url-du-depot> .          # ou rsync depuis votre poste, sans node_modules ni data

# 3. Dépendances et build de l'admin
npm ci
npm run build

# 4. Secrets
cp .env.example .env
nano .env
#   ADMIN_PASSWORD=<mot de passe de Bernard>
#   SESSION_SECRET=<32 caractères aléatoires, voir ci-dessous>
#   OPENAI_API_KEY=<clé>
#   OPENAI_MODEL=gpt-4.1-mini
#   DATABASE_PATH=./data/changing-world.sqlite
#   PORT=3010
openssl rand -hex 32                # pour SESSION_SECRET

# 5. Base et seed
npm run db:seed

# 6. Droits : le service tourne sous ubuntu (Node vient de nvm dans ce compte)
sudo chown -R ubuntu:ubuntu /var/www/changingworld /var/log/changingworld
chmod 600 /var/www/changingworld/.env

# 7. Service systemd (le chemin de Node 22 est injecté dans le fichier)
NODE_BIN=$(dirname $(which node))
sed "s|NODE_BIN|$NODE_BIN|g" deploy/changingworld.service | sudo tee /etc/systemd/system/changingworld.service > /dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now changingworld
sudo systemctl status changingworld
curl http://127.0.0.1:3010/api/sante     # doit répondre {"ok":true,"ia":"openai"}

# 8. Nginx
sudo cp deploy/nginx/changingworld.conf /etc/nginx/sites-available/changingworld
sudo ln -s /etc/nginx/sites-available/changingworld /etc/nginx/sites-enabled/changingworld
sudo nginx -t && sudo systemctl reload nginx

# 9. HTTPS (ajoute les blocs SSL et la redirection dans la conf)
sudo certbot --nginx -d changingworld.harari.ovh
```

Le cookie de session est marqué `Secure` quand `NODE_ENV=production` : la connexion ne fonctionne qu'en HTTPS, donc après l'étape 9.

## Mise à jour

```bash
cd /var/www/changingworld
git pull
npm ci
npm run build
npm run db:migrate                  # applique les nouvelles migrations, sans toucher aux données
sudo systemctl restart changingworld
sudo systemctl status changingworld
```

`npm run db:seed` peut être relancé sans risque : il n'écrase rien d'existant.

## Vérifier et dépanner

```bash
sudo journalctl -u changingworld -n 50          # si les logs systemd sont utilisés
tail -f /var/log/changingworld/erreurs.log
tail -f /var/log/nginx/changingworld_error.log
```

- `{"erreur":"Connexion requise."}` sur une route admin : normal sans cookie.
- Générations qui arrivent d'un bloc à la fin au lieu de champ par champ : vérifier que le bloc `location /api/` avec `proxy_buffering off` est bien présent.
- Erreur de module natif `better_sqlite3.node` après une montée de version de Node : `npm rebuild better-sqlite3`.

## Sauvegarde

Toute la base tient dans `data/changing-world.sqlite` (plus `-wal` et `-shm` pendant l'exécution). Pour une copie cohérente :

```bash
sqlite3 /var/www/changingworld/data/changing-world.sqlite ".backup '/root/sauvegardes/changing-world-$(date +%F).sqlite'"
```
