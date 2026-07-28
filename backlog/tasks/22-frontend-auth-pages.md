# Frontend — pages login / register

**Statut** : fait
**Type** : front
**Issue** : [marmotz/sonskay#22](https://github.com/marmotz/sonskay/issues/22)

Référence : [../features/mvp/technical.md §Authentification](../features/mvp/technical.md#authentification).

## À faire

1. Page d'inscription (email/mot de passe) et de connexion, formulaires validés
   (schémas Zod partagés avec l'API si pertinent).
2. Gestion de la session côté front (stockage de l'état auth dans Zustand, refresh
   automatique via le client tRPC).
3. Redirection vers le dashboard après connexion, protection des routes privées.

## Dépendances

[21-frontend-app-shell.md](21-frontend-app-shell.md).
