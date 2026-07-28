# Sonskay - Agent Guidelines

SOcial Network SCHEduler — application open source et auto-hébergeable de planification
de posts sur les réseaux sociaux (texte + images), avec une version pro (SaaS) séparée.

Cadrage produit et conception technique complets : voir `docs/` (`product-scope.md`,
`tech-stack.md`, `technical-design.md`, `documentation-strategy.md`) et le découpage en
tâches dans `backlog/`.

## Tech Stack

- **Architecture :** front (SPA) et API séparés, communiquant via tRPC, tous deux
  conteneurisés (Docker/docker-compose) pour l'auto-hébergement.
- **Backend :** NestJS, tRPC, Passport + JWT pour l'authentification utilisateur.
- **Frontend :** React + Vite (bundler/dev-server), TanStack Router (mode SPA, pas
  TanStack Start), TanStack Query, Zustand, shadcn/ui.
- **Base de données :** PostgreSQL via Prisma ORM.
- **Stockage médias :** MinIO (S3-compatible), derrière une interface `StorageDriver`.
- **Runtime & gestionnaire de paquets :** Bun (Bun workspaces pour le monorepo — pas
  pnpm, pas d'outil supplémentaire type Turborepo/Nx).
- **Tests :** Vitest, front et back.
- **Validation :** Zod.

## Structure du repo (monorepo)

```
sonskay/
├── apps/
│   ├── api/        # NestJS
│   └── web/         # React + Vite + TanStack Router
├── packages/
│   └── shared/       # types partagés, schémas Zod, capacités réseaux
├── docker-compose.yml  # api, web, postgres, minio
├── docs/               # documentation produit, technique, installation
└── backlog/            # planification (features, tâches, suivi)
```

Détail des modules NestJS et du modèle de données : `docs/technical-design.md` et
`backlog/features/mvp/technical.md`.

## Séparation OSS / SaaS

Le cœur du produit (ce repo) est open source. Le module `billing` et tout ce qui est
propre au fonctionnement SaaS (paiement, facturation) vit dans un **repo privé séparé**
qui dépend de ce repo — jamais l'inverse. Ne jamais introduire de dépendance vers du
code SaaS dans ce repo.

## Conventions à définir

Les conventions de code détaillées (imports, naming, structure de composants,
gestion d'erreurs) seront posées au démarrage de l'implémentation (tâche
[#10 — setup monorepo](backlog/tasks/10-monorepo-setup.md)) et documentées ici au fur
et à mesure, plutôt que reconduites depuis l'ancienne stack Next.js.

## AI/Agent Guidelines

- **Never commit changes** unless explicitly requested
- Always ask for confirmation before creating commits
- Let the user review and commit changes themselves

### Database Commands

**NEVER** run database-affecting commands without explicit permission:

- Prisma migrate/push/reset, seed commands
- Any raw SQL commands that modify data or schema

Only run when user explicitly asks (e.g., "run the migrations").
