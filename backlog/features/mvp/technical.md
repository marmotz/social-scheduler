# MVP Sonskay — Conception technique

Réf. produit : `overview.md` (décisions actées).

**Contexte particulier** : cette conception est faite table rase, sans réutiliser le
code actuel du repo (Next.js). Le repo actuel n'a donc aucune référence `fichier:ligne`
pertinente pour ce document — tout est à créer. Le détail complet des choix et de leurs
alternatives a été discuté et posé dans `docs/tech-stack.md` et `docs/technical-design.md` ;
ce fichier en reprend la substance côté "conception technique de la feature MVP".

## Architecture générale

- **Front et API séparés** (pas de monolithe Next.js) : `apps/web` (React SPA) et
  `apps/api` (NestJS), communiquant via **tRPC**.
- **Alternative écartée** : garder Next.js App Router (stack actuelle du repo). Écartée
  car perçue comme instable/en perte de confiance actuellement, et parce que séparer
  front/API donne plus de flexibilité de scalabilité sans coût d'auto-hébergement
  supplémentaire (tout reste dans le même `docker-compose`).
- Monorepo géré en **Bun workspaces** (pas pnpm, pas de Turborepo/Nx — jugé suffisant
  pour la taille du projet).

```
sonskay/
├── apps/
│   ├── api/         # NestJS
│   └── web/          # React + Vite + TanStack Router (SPA)
├── packages/
│   └── shared/        # types partagés, schémas Zod, capacités réseaux
├── docker-compose.yml # api, web, postgres, minio
└── docs/
```

## Backend — modules NestJS (`apps/api`)

| Module | Responsabilité |
|---|---|
| `auth` | Inscription/connexion Sonskay, Passport + JWT (access court + refresh en cookie httpOnly) |
| `users` | Profil utilisateur |
| `social-accounts` | Connexion OAuth par réseau, stockage tokens chiffrés, statut |
| `posts` | Création/édition de post (brouillon, thread, cibles), programmation |
| `publishing` | Exécution de la publication (immédiate/programmée), gestion des échecs |
| `media` | Upload/gestion des images via `StorageDriver` |
| `networks/*` | Un module par réseau (`networks/twitter`, `networks/bluesky`), implémentant l'interface `NetworkAdapter` |
| `billing` | **Hors périmètre OSS** — vit dans le repo privé SaaS séparé |

**Alternative écartée pour billing** : un seul repo avec dossier exclu des releases
publiques. Écartée au profit de deux repos distincts, pour éliminer tout risque de
fuite de code propriétaire dans l'historique git public.

## Interface `NetworkAdapter`

Chaque réseau (module `networks/*`) implémente une interface commune :

```ts
interface NetworkAdapter {
  capabilities: NetworkCapabilities; // maxChars, maxImages, supportsThread, supportsMentions
  connect(user: User): Promise<SocialAccount>;        // flux OAuth
  publish(target: PostTarget, items: PostItem[]): Promise<PostTargetItem[]>;
  mapError(error: unknown): PublishError;
}
```

- `NetworkCapabilities` vit dans `packages/shared`, réutilisable côté front (TanStack
  Query + validation de formulaire) sans dupliquer la logique de règles.
- La règle "limite la plus restrictive parmi les réseaux sélectionnés" (texte, nombre
  d'images) est calculée côté front à l'affichage, et **revalidée côté API** à la
  soumission (ne jamais faire confiance uniquement au front).

## Modèle de données (Prisma / PostgreSQL)

```
User 1―* SocialAccount
User 1―* Post 1―* PostItem 1―* Media
Post 1―* PostTarget            (1 par SocialAccount ciblé)
PostTarget 1―* PostTargetItem  (1 par PostItem, pour le chaînage de réponses)
```

| Entité | Champs clés |
|---|---|
| `User` | email, passwordHash, timezone par défaut (optionnel) |
| `SocialAccount` | userId, network, handle, accessToken/refreshToken (chiffrés AES-256-GCM), status |
| `Post` | userId, status (draft/scheduled/publishing/published/failed/partial), scheduledAt (UTC, nullable) |
| `PostItem` | postId, orderIndex, text |
| `Media` | postItemId, storageKey, mimeType, orderIndex |
| `PostTarget` | postId, socialAccountId, status (pending/publishing/success/failed), errorMessage, publishedAt |
| `PostTargetItem` | postTargetId, postItemId, externalId, status, errorMessage |

**Pourquoi `PostTarget` + `PostTargetItem` séparés de `Post`/`PostItem`** : un même post
rédigé une fois est publié indépendamment vers plusieurs réseaux (échec possible sur un
réseau sans affecter les autres) ; `PostTargetItem` conserve l'`externalId` retourné par
chaque réseau pour chaque élément du thread, nécessaire pour construire la chaîne de
réponses (un thread = une réponse en chaîne, l'ID du message précédent est requis pour
poster le suivant).

## Programmation & publication

- Publication immédiate ou programmée = même représentation : `Post.scheduledAt` =
  maintenant ou date future.
- Déclenchement par **polling** (`@nestjs/schedule`), cron interne interrogeant les
  `Post` dus (`scheduledAt <= now AND status = 'scheduled'`).
- **Alternative écartée** : BullMQ + Redis. Plus précis/robuste à grande échelle, mais
  ajoute une dépendance (Redis) et un service au `docker-compose` — jugé disproportionné
  pour le MVP. À reconsidérer si le polling montre ses limites en usage réel.
- Statut d'un `Post` = agrégation de ses `PostTarget` : `published` si tous succès,
  `failed` si tous échec, `partial` si mélange.

## Stockage des médias

- **MinIO** par défaut (dev et auto-hébergement), derrière une interface
  `StorageDriver` (`upload`, `getUrl`, `delete`), pour permettre d'ajouter d'autres
  drivers plus tard (disque local, S3 réel en pro) sans toucher la logique métier.

## Authentification

- **Sonskay → utilisateur** : Passport + JWT (access token court, refresh en cookie
  httpOnly). Écarté : better-auth (pensé pour Next.js/route handlers, moins naturel
  avec NestJS) et Lucia (abandonnée par son auteur en 2025).
- **Sonskay → réseaux** : OAuth 2 (ou équivalent) par `SocialAccount`.

## Chiffrement des tokens OAuth

- **AES-256-GCM applicatif**, clé via `SONSKAY_ENCRYPTION_KEY` (variable d'env,
  générée à l'installation, documentée dans le guide d'auto-hébergement).
- Conséquence à documenter explicitement dans la doc d'installation : perte de la clé
  = tokens illisibles = reconnexion de tous les comptes réseaux nécessaire.

## Découpage en tâches d'implémentation

**Fondation**
1. [Setup monorepo Bun + docker-compose](../../tasks/10-monorepo-setup.md) — [#10](https://github.com/marmotz/sonskay/issues/10)
2. [Schéma Prisma initial](../../tasks/11-prisma-schema-core.md) — [#11](https://github.com/marmotz/sonskay/issues/11)
3. [NetworkCapabilities / NetworkAdapter (shared)](../../tasks/12-network-capabilities-shared.md) — [#12](https://github.com/marmotz/sonskay/issues/12)

**Backend**
4. [Module auth](../../tasks/13-auth-module.md) — [#13](https://github.com/marmotz/sonskay/issues/13)
5. [Chiffrement AES-256-GCM des tokens OAuth](../../tasks/14-oauth-token-encryption.md) — [#14](https://github.com/marmotz/sonskay/issues/14)
6. [Adapter networks/twitter](../../tasks/15-networks-twitter-adapter.md) — [#15](https://github.com/marmotz/sonskay/issues/15)
7. [Adapter networks/bluesky](../../tasks/16-networks-bluesky-adapter.md) — [#16](https://github.com/marmotz/sonskay/issues/16)
8. [Module social-accounts](../../tasks/17-social-accounts-module.md) — [#17](https://github.com/marmotz/sonskay/issues/17)
9. [Module media + StorageDriver MinIO](../../tasks/18-media-storage-module.md) — [#18](https://github.com/marmotz/sonskay/issues/18)
10. [Module posts](../../tasks/19-posts-module.md) — [#19](https://github.com/marmotz/sonskay/issues/19)
11. [Module publishing (polling)](../../tasks/20-publishing-module.md) — [#20](https://github.com/marmotz/sonskay/issues/20)

**Frontend**
12. [Socle app (Vite/TanStack Router/shadcn/Zustand/tRPC)](../../tasks/21-frontend-app-shell.md) — [#21](https://github.com/marmotz/sonskay/issues/21)
13. [Pages login/register](../../tasks/22-frontend-auth-pages.md) — [#22](https://github.com/marmotz/sonskay/issues/22)
14. [UI comptes réseaux connectés](../../tasks/23-frontend-social-accounts-ui.md) — [#23](https://github.com/marmotz/sonskay/issues/23)
15. [Composeur de post](../../tasks/24-frontend-post-composer.md) — [#24](https://github.com/marmotz/sonskay/issues/24)
16. [UI programmation (fuseau, publication immédiate)](../../tasks/25-frontend-scheduling-ui.md) — [#25](https://github.com/marmotz/sonskay/issues/25)
17. [Vue historique/file à venir](../../tasks/26-frontend-history-view.md) — [#26](https://github.com/marmotz/sonskay/issues/26)

**Docs**
18. [Guide d'installation/auto-hébergement](../../tasks/27-docs-self-hosting-guide.md) — [#27](https://github.com/marmotz/sonskay/issues/27)
19. [Doc endpoints tRPC + types](../../tasks/28-docs-api-reference.md) — [#28](https://github.com/marmotz/sonskay/issues/28)
