# Getting started (dev local)

Base pour la doc d'auto-hébergement complète (voir tâche
[#27 — guide d'installation](../backlog/tasks/27-docs-self-hosting-guide.md)).

## Prérequis

- [Bun](https://bun.sh) >= 1.3
- Docker + Docker Compose (pour PostgreSQL et MinIO)

## Installation

```bash
bun install
```

Installe les dépendances de tout le monorepo (`apps/api`, `apps/web`,
`packages/shared`) via Bun workspaces.

## Variables d'environnement

Copier le fichier d'exemple de `apps/api` :

```bash
cp apps/api/.env.example apps/api/.env
```

### Clé de chiffrement des tokens OAuth (`SONSKAY_ENCRYPTION_KEY`)

Les `accessToken`/`refreshToken` des comptes réseaux connectés (`SocialAccount`) sont
chiffrés en base avec AES-256-GCM via cette clé. Générer une clé valide (64 caractères
hexadécimaux, 32 octets) :

```bash
cd apps/api
bun run generate:encryption-key
```

Copier la sortie dans `SONSKAY_ENCRYPTION_KEY` du fichier `.env`. **Attention** : perdre
cette clé (ou la changer) rend tous les tokens déjà stockés illisibles — les comptes
réseaux concernés devront être reconnectés. Sauvegarder cette clé au même titre qu'un
secret de production.

### Comptes réseaux (X/Twitter, Bluesky)

Connecter un compte réseau depuis la page « Social accounts » de l'app repose sur ces
identifiants. Sans eux, la connexion à X échoue et le formulaire Bluesky reste la seule
option disponible.

#### X / Twitter (OAuth 2.0)

1. Créer (ou réutiliser) un **Project** sur le
   [portail développeur X](https://developer.x.com/en/portal/dashboard), puis une **App**
   **rattachée à ce Project** (hiérarchie Project → App chez X). Une app qui n'est pas
   rattachée à un Project fait échouer tous les appels API v2 avec une erreur
   `client-not-enrolled` / `Client Forbidden`, même une fois l'autorisation OAuth
   réussie — le tier Free suffit pour les scopes utilisés ici.
2. Dans les paramètres de l'app, section **User authentication settings**, activer
   l'authentification et configurer :
   - **App permissions** : au minimum lecture + écriture (`Read and write`).
   - **Type of App** : `Web App, Automated App or Bot` (client confidentiel — Sonskay
     échange le code contre un token côté serveur avec un client secret).
   - **Callback URI / Redirect URL** : `<WEB_URL>/social-accounts/callback`, par exemple
     `http://localhost:5173/social-accounts/callback` en dev. Doit correspondre
     exactement à l'origine depuis laquelle l'app front est servie (la valeur de
     `WEB_URL`), sinon X rejette l'échange. X accepte plusieurs Callback URIs
     enregistrées (utile pour garder une URL locale en plus d'une URL de prod/ngrok) et
     autorise explicitement `http://localhost` sur ce champ pour le développement.
   - **Website URL** : doit ressembler à un vrai domaine — `http://localhost` y est
     refusé par X (juste une validation de format, l'URL n'a pas besoin d'être
     joignable). Utiliser `WEB_URL` en production, ou n'importe quelle URL plausible
     en dev (ex. une URL ngrok, même non active en permanence).
3. Dans l'onglet **Keys and tokens**, section **OAuth 2.0 Client ID and Client Secret**,
   copier :
   - `Client ID` → `TWITTER_CLIENT_ID`
   - `Client Secret` → `TWITTER_CLIENT_SECRET`
4. `TWITTER_API_BASE_URL` et `TWITTER_AUTHORIZE_BASE_URL` peuvent rester à leurs
   valeurs par défaut (respectivement `https://api.twitter.com` pour les appels API,
   et `https://twitter.com` pour la page d'autorisation interactive — deux hôtes
   distincts chez X, à ne pas confondre).

**Piège CORS/cookies** : ne pas accéder au front via un tunnel (ngrok, etc.) pendant
que l'API tourne en local sur `localhost` — le front et l'API seraient alors sur des
domaines différents, ce qui casse à la fois le CORS (`WEB_URL` ne correspondrait plus
à l'origine réelle) et le cookie httpOnly du refresh token (`SameSite=Lax` bloque les
requêtes cross-site). Garder `WEB_URL="http://localhost:5173"` et tester entièrement en
local ; le tunnel n'est utile que ponctuellement pour renseigner le champ Website URL.

Les scopes demandés par Sonskay (`tweet.read tweet.write offline.access`) sont fixés
côté code ; `offline.access` est nécessaire pour obtenir un refresh token. Le handle X
n'étant pas lisible via l'API sur le tier Free (`GET /2/users/me` non inclus), le scope
`users.read` n'est pas demandé — l'utilisateur confirme son handle lui-même après
l'autorisation.

#### Bluesky (app password AT Protocol)

Bluesky ne nécessite pas d'enregistrer d'app — pas de `CLIENT_ID`/`CLIENT_SECRET` à
configurer côté API. Chaque utilisateur Sonskay génère son propre mot de passe
d'application, saisi directement dans le formulaire de connexion Bluesky de l'app :

1. Se connecter sur [bsky.app](https://bsky.app) avec le compte à connecter.
2. Aller dans **Settings → Privacy and security → App passwords**.
3. Cliquer sur **Add App Password**, lui donner un nom (ex. `Sonskay`), puis copier le
   mot de passe généré (format `xxxx-xxxx-xxxx-xxxx`) — il n'est affiché qu'une seule
   fois.
4. Dans Sonskay, saisir le handle (ou l'email) du compte et ce mot de passe d'app dans
   le formulaire « Connect Bluesky ». **Ne jamais utiliser le mot de passe principal du
   compte.**

`BLUESKY_SERVICE_URL` peut rester à sa valeur par défaut (`https://bsky.social`) sauf
si le compte vit sur un PDS auto-hébergé.

## Démarrer les services d'infra (PostgreSQL, MinIO)

```bash
docker compose up postgres minio
```

## Générer le client Prisma et appliquer les migrations

```bash
cd apps/api
bun run prisma:generate
bun run prisma:migrate
```

## Démarrer l'API et le front en mode dev

Dans deux terminaux séparés, depuis la racine du repo :

```bash
bun run dev:api   # NestJS, http://localhost:3003
bun run dev:web   # Vite, http://localhost:5173
```

## Tout démarrer via Docker Compose

```bash
docker compose up
```

Démarre `postgres`, `minio`, `api` (http://localhost:3003) et `web`
(http://localhost:5173) en une seule commande.

## Tests

```bash
bun run test          # tout le monorepo
cd apps/api && bun run test   # un seul package
```

## Typecheck

```bash
bun run typecheck
```
