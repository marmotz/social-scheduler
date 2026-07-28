# Frontend — socle app (Vite, TanStack Router SPA, shadcn/ui, Zustand, tRPC client)

**Statut** : fait
**Type** : front
**Issue** : [marmotz/sonskay#21](https://github.com/marmotz/sonskay/issues/21)

Référence : [../features/mvp/technical.md §Architecture générale](../features/mvp/technical.md#architecture-générale).

## À faire

1. Initialiser `apps/web` (Vite + React + TypeScript), TanStack Router en mode SPA
   (pas TanStack Start).
2. Configurer shadcn/ui (thème par défaut, à personnaliser plus tard), TanStack Query,
   Zustand.
3. Client tRPC connecté à `apps/api`, avec gestion du refresh token (JWT).
4. Layout de base (navigation, zones protégées vs publiques) et routes vides pour
   login/register/dashboard.

## Dépendances

[10-monorepo-setup.md](10-monorepo-setup.md),
[13-auth-module.md](13-auth-module.md).
