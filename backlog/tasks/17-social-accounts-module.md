# Backend — module social-accounts (connexion et gestion des comptes réseaux)

**Statut** : fait
**Type** : backend
**Issue** : [marmotz/sonskay#17](https://github.com/marmotz/sonskay/issues/17)

Référence : [../features/mvp/technical.md §Backend — modules NestJS](../features/mvp/technical.md#backend--modules-nestjs-appsapi).

## À faire

1. Module NestJS `social-accounts` : liste, connexion (délègue au `NetworkAdapter` du
   réseau concerné), déconnexion/suppression d'un `SocialAccount`.
2. Endpoints tRPC : `listAccounts`, `startConnect(network)`, `completeConnect(...)`,
   `disconnect(accountId)`.
3. Gestion du statut (connecté/expiré/révoqué), rafraîchissement de token si le
   `NetworkAdapter` le supporte.
4. Support de plusieurs comptes par réseau pour un même utilisateur (pas de contrainte
   d'unicité réseau+utilisateur).

## Dépendances

[15-networks-twitter-adapter.md](15-networks-twitter-adapter.md),
[16-networks-bluesky-adapter.md](16-networks-bluesky-adapter.md).
