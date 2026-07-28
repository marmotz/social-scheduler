# Frontend — composeur de post (thread, images, capacités, limites)

**Statut** : à faire
**Type** : front
**Issue** : [marmotz/sonskay#24](https://github.com/marmotz/sonskay/issues/24)

Référence : [../features/mvp/technical.md §Interface NetworkAdapter](../features/mvp/technical.md#interface-networkadapter).

## À faire

1. Éditeur de post/thread : ajout/réordonnancement d'items du thread, texte + images
   par item, ajout de liens (comportement neutre, pas de raccourcissement).
2. Sélection des réseaux cibles, filtrage/adaptation de l'UI selon `NetworkCapabilities`
   (ex : désactiver l'ajout d'items de thread si un réseau sélectionné ne le supporte
   pas).
3. Avertissement en temps réel sur la limite de caractères et le nombre d'images,
   calculée comme le minimum des réseaux sélectionnés (fonction partagée de
   `packages/shared`).
4. Sauvegarde en brouillon (sans programmer ni publier).

## Dépendances

[21-frontend-app-shell.md](21-frontend-app-shell.md),
[12-network-capabilities-shared.md](12-network-capabilities-shared.md),
[19-posts-module.md](19-posts-module.md).
