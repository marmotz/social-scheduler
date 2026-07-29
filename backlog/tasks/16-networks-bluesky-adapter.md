# Backend — module networks/bluesky (adapter Bluesky)

**Statut** : fait
**Type** : backend
**Issue** : [marmotz/sonskay#16](https://github.com/marmotz/sonskay/issues/16)

Référence : [../features/mvp/technical.md §Interface NetworkAdapter](../features/mvp/technical.md#interface-networkadapter).

## À faire

1. Module NestJS `networks/bluesky` implémentant `NetworkAdapter`.
2. `capabilities` : `maxChars: 300`, `maxImages` (à vérifier auprès de l'API AT
   Protocol), `supportsThread: true`, `supportsMentions: false` (hors MVP).
3. `connect` : authentification Bluesky (app password ou OAuth AT Protocol selon
   disponibilité), stockage du `SocialAccount` (tokens chiffrés).
4. `publish` : publication d'un post ou d'une chaîne de réponses, upload des images ;
   retour des `externalId` (URI/CID AT Protocol) par item.
5. `mapError` : normalisation des erreurs API Bluesky.

## Dépendances

[12-network-capabilities-shared.md](12-network-capabilities-shared.md),
[14-oauth-token-encryption.md](14-oauth-token-encryption.md).

## Note

L'upload des images (point 4) est reporté à
[18-media-storage-module](18-media-storage-module.md) : `NetworkAdapterPostItem`
n'a pas encore de champ image et il n'existe pas de `StorageDriver` pour les
récupérer. À reprendre dans `BlueskyAdapter.publish` (upload via
`com.atproto.repo.uploadBlob` puis `embed` sur le post) en même temps que #18.
