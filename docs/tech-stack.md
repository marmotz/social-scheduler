# Sonskay — Choix technique

Notes de discussion sur la stack technique, une fois le cadrage fonctionnel posé
(voir `product-scope.md`).

## Statut

Cadrage technique global posé, plus de question ouverte.

## Architecture générale

- **Front et API séparés** (et non un monolithe Next.js), pour la scalabilité et pour
  éviter le couplage à l'infra propre à Next.js (biais Vercel).
- Auto-hébergement via **Docker / docker-compose** : plusieurs services (front, api, db)
  démarrables en une commande (`docker compose up`) — la séparation front/API ne coûte
  rien en complexité d'installation pour l'utilisateur final.
- Chaque brique (front, API, DB) reste remplaçable/testable indépendamment.

## Backend / API

- **NestJS** — choisi pour sa structure opinionated, adaptée à un projet open source
  avec potentiellement beaucoup de contributeurs (conventions claires, DI, modules).

## Frontend

- **React**, choix motivé par l'écosystème open source et la communauté de contributeurs
  potentiels.
- Défiance actuelle vis-à-vis de Next.js (perçu comme "fuit" / moins stable en ce moment)
  → on part sur un **SPA React** plutôt que Next.js.
- Bundler/dev-server : **Vite** (préféré à Bun côté bundler pour la maturité de l'outillage
  React — Fast Refresh, plugins, écosystème).
- Data fetching / état serveur : **TanStack Query** (s'intègre nativement avec tRPC).
- État UI local/global : **Zustand**.
- UI kit : **shadcn/ui** (déjà en place dans le projet actuel).
- Routing : **TanStack Router**, utilisé en **mode SPA pur** (pas TanStack Start, pour
  éviter de réintroduire un couplage front/back type SSR — cohérent avec la décision de
  séparer front et API).

## Runtime & gestionnaire de paquets

- **Bun** — utilisé comme runtime et gestionnaire de paquets (front, API, monorepo),
  mais pas comme bundler front (voir ci-dessus, on garde Vite pour ça).

## Tests

- **Vitest** pour les tests unitaires, côté front et côté back.

## Base de données

- **PostgreSQL** + **Prisma** comme ORM.

## Communication front <-> API

- **tRPC** — typage bout en bout entre le front et l'API NestJS. Implique un monorepo
  TypeScript partageant les types (front + api dans le même repo, géré via **Bun
  workspaces** — pas pnpm).

## Authentification

- **Passport + JWT** côté NestJS (`@nestjs/passport`, `passport-jwt`) : access token
  court + refresh token en cookie httpOnly. Solution native à l'écosystème Nest, sans
  dépendance à une lib pensée pour un autre framework (better-auth = orienté Next.js ;
  Lucia = abandonnée par son auteur en 2025).

## Stockage des médias

- **MinIO** (serveur S3-compatible), utilisé à la fois en dev et en auto-hébergement
  (service supplémentaire dans le `docker-compose`, pas besoin de compte cloud).
- Accès via une **abstraction/interface de stockage** (driver S3 en premier), pour
  pouvoir ajouter d'autres drivers plus tard (disque local, autre backend) sans
  réécrire la logique métier.

## Questions ouvertes

_Aucune pour l'instant._
