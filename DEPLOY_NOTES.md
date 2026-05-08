# Notes de production — anatastore.ci

Etat de la mise en production realisee le 2026-05-08. Complete `DEPLOYMENT.md` avec les specificites du deploiement actuel chez LWS.

## 1) Acces

### SSH (administration)

```bash
ssh -i ~/.ssh/anata_deploy_ed25519 deploy@31.207.34.199
```

- User `deploy` (uid 5004), sudo NOPASSWD.
- Authentification par cle SSH uniquement (`PasswordAuthentication no`).
- La cle privee est sur le poste local (`~/.ssh/anata_deploy_ed25519`). Si tu changes de poste, regenere une cle et ajoute la pubkey a `/home/deploy/.ssh/authorized_keys` (et `/root/.ssh/authorized_keys`) via la console SSH web LWS.
- Compte root : password rotate post-deploiement, stocke dans le gestionnaire de l'utilisateur. Sert uniquement a la console SSH web LWS en recovery.

### Console web (recovery)

Si SSH inaccessible : `https://panel.lws.fr/` -> VPS-120439 -> Terminal SSH (root + password stocke).

## 2) Architecture en place

```
Internet -- DNS Netim --> 31.207.34.199 (VPS LWS, Debian 13)

Apache 2.4 (ports 80, 443)
  vhost /etc/apache2/sites-available/anatastore-ci.conf
    /api/, /admin/   -> 127.0.0.1:8000   (gunicorn, anata-django.service)
    /static/         -> /opt/anata-store/backend/staticfiles/
    /media/          -> /opt/anata-store/backend/media/
    /                -> 127.0.0.1:3000   (next start, anata-next.service)
```

ISPConfig (panel LWS) preserve : `apache2`, `mariadb`, `postfix`, `dovecot`, `named`, `bind9`, `rspamd`, `pure-ftpd`. Notre vhost coexiste sans conflit.

## 3) Services systemd geres

| Unit | Role | Bind |
|---|---|---|
| `anata-django.service` | Django via gunicorn (3 workers) | 127.0.0.1:8000 |
| `anata-next.service` | Next.js production | 127.0.0.1:3000 |
| `apache2.service` | Reverse proxy public | 0.0.0.0:80, 443 |
| `fail2ban.service` | Anti-bruteforce SSH | jail sshd actif |
| `anata-https-bootstrap.timer` | Auto certbot quand LE up | s'auto-desactive apres succes |

### Operations courantes

```bash
# Redemarrer le backend
sudo systemctl restart anata-django

# Redemarrer le frontend
sudo systemctl restart anata-next

# Recharger Apache (config vhost ou cert)
sudo systemctl reload apache2

# Etat global
sudo systemctl status anata-django anata-next apache2 fail2ban --no-pager
```

## 4) Firewall (ufw)

Regles appliquees :

| Port | Direction | Usage |
|---|---|---|
| 22/tcp | IN | SSH |
| 80/tcp, 443/tcp | IN | HTTP/HTTPS site |
| 25, 465, 587, 110, 143, 993, 995, 4190 | IN | Mail (postfix, dovecot, sieve) |
| 53/tcp, 53/udp | IN | DNS BIND |
| 8080/tcp, 8081/tcp | IN | ISPConfig admin / apps |
| 21/tcp | bloque | FTP non sur, utiliser SFTP via 22 |

Modifier :

```bash
sudo ufw allow <port>/tcp comment "raison"
sudo ufw delete allow <port>/tcp
sudo ufw status verbose
```

## 5) HTTPS (Let's Encrypt)

Au moment du deploiement, Let's Encrypt avait un incident global (issuance suspendue). Une systemd timer `anata-https-bootstrap.timer` retente certbot toutes les 10 min jusqu'a obtention du cert, puis se desactive.

Verifier l'etat :

```bash
ls /etc/letsencrypt/live/anatastore.ci/    # presence de fullchain.pem == cert OK
sudo tail /var/log/anata-https-bootstrap.log
sudo systemctl list-timers anata-https-bootstrap.timer
```

Renouvellement : certbot installe son propre timer `certbot.timer` (renouvelle tout cert avec moins de 30 jours restants).

Forcer un refresh manuel du cert :

```bash
sudo certbot renew --force-renewal
sudo systemctl reload apache2
```

Note: tant que HTTPS n'est pas actif, le vhost retire la directive CSP `upgrade-insecure-requests` pour permettre le rendu HTTP propre. Cette ligne `Header edit ...` dans `anatastore-ci.conf` peut etre supprimee une fois HTTPS valide.

## 6) Donnees et catalogue

- BD : SQLite, fichier `/opt/anata-store/backend/db.sqlite3`. Suffisant pour le MVP.
- Media : `/opt/anata-store/backend/media/seed/` (278 fichiers, ~50 MB). Servis directement par Apache via Alias.
- Re-importer un catalogue depuis un fichier produits :

```bash
cd /opt/anata-store/backend
sudo systemctl stop anata-django
.anata/bin/python manage.py import_products_txt /chemin/vers/produits.txt
.anata/bin/python manage.py repair_product_media
.anata/bin/python manage.py check_media_quality        # doit exit 0
sudo systemctl start anata-django
```

## 7) Backups

- Cron quotidien `02:30` -> `/var/backups/anata-store/db-YYYYMMDD-HHMMSS.sqlite3.gz`
- Garde les 14 dernieres archives (rotation auto)
- Script : `/usr/local/bin/anata-backup.sh`
- Cron : `/etc/cron.d/anata-backup`

Restore :

```bash
cd /opt/anata-store/backend
sudo systemctl stop anata-django
mv db.sqlite3 db.sqlite3.broken
sudo -u deploy gunzip -c /var/backups/anata-store/db-XXXXXXXX-XXXXXX.sqlite3.gz > db.sqlite3
sudo systemctl start anata-django
.anata/bin/python manage.py check_media_quality
```

## 8) Logs

| Composant | Path |
|---|---|
| Django (gunicorn) | `/var/log/anata-django.log` |
| Next.js | `/var/log/anata-next.log` |
| Apache vhost | `/var/log/apache2/anatastore-ci_{access,error}.log` |
| HTTPS bootstrap | `/var/log/anata-https-bootstrap.log` |
| Certbot | `/var/log/letsencrypt/letsencrypt.log` |
| fail2ban | `journalctl -u fail2ban` |
| ufw | `/var/log/ufw.log` |
| auth (SSH) | `journalctl -u ssh` |

Live tail de tout :

```bash
sudo tail -f /var/log/anata-django.log /var/log/anata-next.log /var/log/apache2/anatastore-ci_error.log
```

## 9) Mise a jour de l'application

```bash
ssh deploy@31.207.34.199
cd /opt/anata-store

# Backend
git fetch --tags
git checkout vX.Y.Z   # ou main si rolling
sudo systemctl stop anata-django anata-next
backend/.anata/bin/pip install --quiet -r backend/requirements.txt
cd backend && .anata/bin/python manage.py migrate --noinput
.anata/bin/python manage.py collectstatic --noinput
.anata/bin/python manage.py check_media_quality

# Frontend
cd ../frontend
pnpm install --frozen-lockfile
pnpm exec next build

# Restart
sudo systemctl start anata-django anata-next
sudo systemctl status anata-django anata-next --no-pager | head
```

## 10) Points d'attention V1.1

- Le serving `/media/` est fait par Apache via Alias direct -> OK pour MVP. A scale, mettre un CDN ou nginx devant.
- SQLite supporte le trafic MVP. Au-dela de ~50 ecritures/s concurrentes, migrer vers PostgreSQL (changer `DB_ENGINE` + `DB_*` dans `backend/.env`).
- ISPConfig consomme ~1 GB de RAM en idle (mail + bind). Sur le VPS S 4 GB, c'est gerable mais surveiller `free -h`.
- Si on n'utilise jamais le mail @anatastore.ci, on peut desactiver postfix + dovecot + rspamd + pure-ftpd pour liberer 500-800 MB.
- HSTS preload : a activer cote DNS apres 6 mois de stabilite HTTPS.
