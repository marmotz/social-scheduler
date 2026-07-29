# Backend — module media + StorageDriver MinIO

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#18](https://github.com/marmotz/sonskay/issues/18)

Référence : [../features/mvp/technical.md §Stockage des médias](../features/mvp/technical.md#stockage-des-médias).

## À faire

1. Interface `StorageDriver` (`upload`, `getUrl`, `delete`) dans un module dédié
   `storage` côté API.
2. Implémentation `MinioStorageDriver` (S3-compatible), configurée via variables d'env
   (endpoint, bucket, credentials).
3. Module NestJS `media` : upload d'image(s) liée(s) à un `PostItem`, validation du
   type MIME, création des lignes `Media`.
4. Endpoint tRPC d'upload (pré-signed URL ou upload direct via l'API, à trancher à
   l'implémentation selon la taille max attendue).

## Dépendances

[11-prisma-schema-core.md](11-prisma-schema-core.md).

## Note

L'upload des images vers X et Bluesky lors de la publication a été reporté ici depuis
[15-networks-twitter-adapter](15-networks-twitter-adapter.md) et
[16-networks-bluesky-adapter](16-networks-bluesky-adapter.md) : une fois `Media` et
`StorageDriver` en place, ajouter un champ image à `NetworkAdapterPostItem` (shared) et
implémenter l'upload dans `TwitterAdapter.publish` (endpoint `/2/media/upload` puis
`media.media_ids` sur le tweet) et `BlueskyAdapter.publish` (`com.atproto.repo.uploadBlob`
puis `embed` sur le post).
