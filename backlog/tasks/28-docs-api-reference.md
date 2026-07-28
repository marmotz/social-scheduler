# Docs — documentation des endpoints tRPC et des types

**Statut** : à faire
**Type** : docs
**Issue** : [marmotz/sonskay#28](https://github.com/marmotz/sonskay/issues/28)

Référence : [../../docs/documentation-strategy.md](../../docs/documentation-strategy.md).

## À faire

1. Documenter chaque routeur tRPC (`auth`, `social-accounts`, `posts`, `media`) :
   entrées/sorties, erreurs possibles.
2. Documenter les types partagés clés (`NetworkCapabilities`, statuts `Post`/
   `PostTarget`).
3. Mettre en place un mécanisme pour limiter la dérive doc/code (ex : génération
   partielle à partir des schémas Zod/tRPC, ou check CI comparant la doc aux routeurs
   existants).

## Dépendances

[19-posts-module.md](19-posts-module.md),
[18-media-storage-module.md](18-media-storage-module.md).
