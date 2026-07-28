# Sonskay — Conception technique détaillée

Conçu à partir de zéro (le code existant du repo n'est pas réutilisé comme base de
réflexion), en s'appuyant sur `product-scope.md` (fonctionnel) et `tech-stack.md`
(choix technique globaux).

## Statut

Conception technique posée, plus de question ouverte.

## Structure du repo (monorepo)

```
sonskay/
├── apps/
│   ├── api/        # NestJS
│   └── web/         # React + Vite + TanStack Router
├── packages/
│   ├── shared/       # types partagés, schémas Zod, système de capacités réseaux
│   └── ...
├── docker-compose.yml  # api, web, postgres, minio
└── docs/
```

- Gestion du monorepo : **Bun workspaces** (pas pnpm, pas d'outil supplémentaire type
  Turborepo/Nx — Bun comme runtime/package manager suffit, cf. `tech-stack.md`).

## Modules NestJS (apps/api)

- **auth** — inscription/connexion utilisateur Sonskay, Passport + JWT (access + refresh).
- **users** — profil utilisateur.
- **social-accounts** — connexion des comptes réseaux (OAuth par réseau), stockage des
  tokens, statut de connexion.
- **posts** — création/édition de post (brouillon, thread, cible réseaux), programmation.
- **publishing** — exécution de la publication (immédiate ou programmée) vers chaque
  réseau cible, gestion des échecs.
- **media** — upload et gestion des images, via l'abstraction de stockage (driver S3/MinIO).
- **networks** — un module par réseau supporté (ex: `networks/twitter`, `networks/bluesky`),
  chacun implémentant une interface commune (`NetworkAdapter`) : auth OAuth, capacités,
  publication d'un post/thread, mapping des erreurs.
- **billing** _(pro uniquement)_ — abonnement, paiement. Isolé du reste pour ne pas être
  inclus dans la version open source (voir "Séparation OSS / SaaS" ci-dessous).

## Système de capacités réseaux

- Chaque `NetworkAdapter` (module `networks/*`) expose un objet **capabilities** statique,
  côté code (pas en base) :
  ```ts
  interface NetworkCapabilities {
    maxChars: number;
    maxImages: number;
    supportsThread: boolean;
    supportsMentions: boolean; // hors MVP, mais le champ existe pour extension future
  }
  ```
- Ce type fait partie de `packages/shared` pour être utilisable tel quel côté front
  (validation d'UI : avertissement de dépassement, désactivation d'options non supportées)
  sans dupliquer la logique.
- Règle "plus restrictif" (texte, nombre d'images) : calculée côté front en prenant le
  min des capacités des réseaux sélectionnés, revalidée côté API à la soumission.

## Modèle de données (Prisma / PostgreSQL)

- **User** — compte Sonskay (email, password hash, timezone par défaut optionnelle).
- **SocialAccount** — compte réseau connecté par un User (network, handle, tokens OAuth
  chiffrés, statut : connecté/expiré/révoqué). Plusieurs par network et par user.
- **Post** — l'unité de rédaction (le "brouillon"/thread écrit une fois) : statut
  (draft, scheduled, publishing, published, failed, partial), scheduledAt (UTC, nullable),
  createdAt/updatedAt, userId.
- **PostItem** — un élément du thread (le post racine + ses réponses en chaîne) :
  postId, orderIndex, text.
- **Media** — image liée à un PostItem : postItemId, storageKey (MinIO), mimeType,
  orderIndex.
- **PostTarget** — la publication d'un Post vers un SocialAccount donné : postId,
  socialAccountId, status (pending/publishing/success/failed), errorMessage,
  publishedAt.
- **PostTargetItem** — le résultat de publication de chaque PostItem au sein d'un
  PostTarget (pour reconstituer la chaîne de réponses sur le réseau) : postTargetId,
  postItemId, externalId (id retourné par le réseau), status, errorMessage.

Schéma relationnel simplifié :

```
User 1―* SocialAccount
User 1―* Post 1―* PostItem 1―* Media
Post 1―* PostTarget (1 par SocialAccount ciblé)
PostTarget 1―* PostTargetItem (1 par PostItem, pour le chaînage de réponses)
```

## Programmation & publication

- Une publication (immédiate ou programmée) est représentée de la même façon : un Post
  avec `scheduledAt` = maintenant ou une date future.
- Déclenchement par **polling** : un cron interne (`@nestjs/schedule`) interroge
  périodiquement les Posts dus (`scheduledAt <= now`) et lance leur publication.
  Pas de dépendance supplémentaire (pas de Redis/BullMQ).
- En cas d'échec sur un `PostTarget`, seul ce target est marqué `failed` — les autres
  cibles du même Post peuvent réussir indépendamment (statut global du Post = `partial`
  si mélange succès/échec).

## Stockage des médias

- Driver **MinIO** (S3-compatible) par défaut, derrière une interface `StorageDriver`
  (`upload`, `getUrl`, `delete`) dans `packages/shared` ou un module dédié `storage` côté
  API, pour permettre d'ajouter d'autres drivers plus tard (disque local, S3 réel en
  pro) sans changer la logique métier.

## Authentification

- **Utilisateur Sonskay → API** : Passport + JWT (access token court, refresh token en
  cookie httpOnly).
- **Sonskay → réseaux sociaux** : OAuth 2 (ou mécanisme propre à chaque réseau) par
  `SocialAccount`, tokens chiffrés au repos en base.

## Séparation OSS / SaaS

- **Deux repos** : un repo public OSS (le cœur du produit, tout ce qui est décrit dans
  ce document) et un repo privé SaaS contenant le module `billing` et tout ce qui est
  propre au fonctionnement pro (paiement, facturation). Le repo privé dépend du repo
  public (comme un module/plugin additionnel), sans jamais l'inverse — le cœur OSS ne
  doit avoir aucune dépendance vers le code SaaS.

## Chiffrement des tokens OAuth

- **Chiffrement applicatif AES-256-GCM**, avec une clé secrète fournie via variable
  d'environnement (`SONSKAY_ENCRYPTION_KEY`, générée à l'installation, documentée dans
  le guide d'auto-hébergement). Chiffrement/déchiffrement effectués avant
  écriture/lecture en base (Prisma) — portable quel que soit l'hébergement, cohérent
  avec l'esprit d'autonomie du projet.
- Implication à documenter : si la clé est perdue, les tokens stockés deviennent
  illisibles et tous les comptes réseaux doivent être reconnectés.

## Questions ouvertes

_Aucune pour l'instant._
