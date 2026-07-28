# Backend — schéma Prisma initial (User, SocialAccount, Post, PostItem, Media, PostTarget, PostTargetItem)

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#11](https://github.com/marmotz/sonskay/issues/11)

Référence : [../features/mvp/technical.md §Modèle de données](../features/mvp/technical.md#modèle-de-données-prisma--postgresql).

## À faire

1. Écrire le schéma Prisma pour `User`, `SocialAccount`, `Post`, `PostItem`, `Media`,
   `PostTarget`, `PostTargetItem` (champs et relations décrits dans `technical.md`).
2. Ajouter les enums de statut (`PostStatus`, `PostTargetStatus`, `SocialAccountStatus`).
3. Générer la première migration.
4. Configurer le client Prisma dans `apps/api`.

## Dépendances

[10-monorepo-setup.md](10-monorepo-setup.md).
