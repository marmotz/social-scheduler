# Frontend — gestion des comptes réseaux connectés

**Statut** : fait
**Type** : front
**Issue** : [marmotz/sonskay#23](https://github.com/marmotz/sonskay/issues/23)

Référence : [../features/mvp/technical.md §Backend — modules NestJS](../features/mvp/technical.md#backend--modules-nestjs-appsapi).

## À faire

1. Page listant les comptes réseaux connectés (X/Twitter, Bluesky), avec statut
   (connecté/expiré/révoqué).
2. Flux de connexion d'un nouveau compte (redirection OAuth, retour et confirmation).
3. Déconnexion/suppression d'un compte, et support explicite de plusieurs comptes pour
   un même réseau (pas de limite dans l'UI).

## Dépendances

[21-frontend-app-shell.md](21-frontend-app-shell.md),
[17-social-accounts-module.md](17-social-accounts-module.md).
