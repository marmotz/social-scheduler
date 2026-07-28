# Setup — squelette monorepo Bun (apps/api, apps/web, packages/shared) + docker-compose

**Statut** : fait
**Type** : CI / infra
**Issue** : [marmotz/sonskay#10](https://github.com/marmotz/sonskay/issues/10)

Référence : [../features/mvp/technical.md §Architecture générale](../features/mvp/technical.md#architecture-générale).

## À faire

1. Initialiser le monorepo en Bun workspaces (`package.json` racine avec `workspaces`),
   sans pnpm ni Turborepo/Nx.
2. Créer les packages vides `apps/api` (NestJS), `apps/web` (React + Vite +
   TanStack Router), `packages/shared` (types partagés, capacités réseaux).
3. Écrire `docker-compose.yml` avec les services `api`, `web`, `postgres`, `minio`.
4. Mettre en place Vitest (config partagée ou par package) pour front et back.
5. Documenter le démarrage local (`docs/` — installation dev) — base pour la doc
   d'auto-hébergement complète (tâche dédiée).

## Dépendances

Aucune — tâche de fondation, bloquante pour toutes les autres.
