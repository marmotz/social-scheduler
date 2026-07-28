# Backend — module posts (rédaction, brouillon, thread, programmation)

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#19](https://github.com/marmotz/sonskay/issues/19)

Référence : [../features/mvp/technical.md §Modèle de données](../features/mvp/technical.md#modèle-de-données-prisma--postgresql).

## À faire

1. Module NestJS `posts` : création/édition d'un `Post` avec ses `PostItem` (thread) et
   `Media` associés, sélection des réseaux cibles (création des `PostTarget`).
2. Endpoints tRPC : `createDraft`, `updatePost`, `schedulePost(scheduledAt)`,
   `publishNow`, `cancelScheduled`, `deletePost`.
3. Validation serveur : revalidation des limites (texte, images) par réseau ciblé, même
   règle "plus restrictif" que côté front (ne pas faire confiance uniquement au front).
4. Édition/annulation d'un post déjà programmé mais pas encore publié (avant passage en
   `publishing`).
5. Endpoint de listing avec statut (`draft`, `scheduled`, `published`, `failed`,
   `partial`) pour l'historique et la file à venir.

## Dépendances

[12-network-capabilities-shared.md](12-network-capabilities-shared.md),
[18-media-storage-module.md](18-media-storage-module.md).
