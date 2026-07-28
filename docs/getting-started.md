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
