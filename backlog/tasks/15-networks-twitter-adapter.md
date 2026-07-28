# Backend — module networks/twitter (adapter X/Twitter)

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#15](https://github.com/marmotz/sonskay/issues/15)

Référence : [../features/mvp/technical.md §Interface NetworkAdapter](../features/mvp/technical.md#interface-networkadapter).

## À faire

1. Module NestJS `networks/twitter` implémentant `NetworkAdapter`.
2. `capabilities` : `maxChars: 280`, `maxImages` (à vérifier auprès de l'API X), 
   `supportsThread: true`, `supportsMentions: false` (hors MVP).
3. `connect` : flux OAuth 2 X, stockage du `SocialAccount` (tokens chiffrés via la
   tâche de chiffrement).
4. `publish` : publication d'un post ou d'une chaîne de réponses (thread), avec upload
   des images ; retour des `externalId` par item pour `PostTargetItem`.
5. `mapError` : normalisation des erreurs API X (token expiré, rate limit, contenu
   refusé) vers le format d'erreur interne.

## Dépendances

[12-network-capabilities-shared.md](12-network-capabilities-shared.md),
[14-oauth-token-encryption.md](14-oauth-token-encryption.md).
