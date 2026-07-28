# Shared — type NetworkCapabilities + interface NetworkAdapter

**Statut** : à faire
**Type** : backend (shared)
**Issue** : [marmotz/sonskay#12](https://github.com/marmotz/sonskay/issues/12)

Référence : [../features/mvp/technical.md §Interface NetworkAdapter](../features/mvp/technical.md#interface-networkadapter).

## À faire

1. Dans `packages/shared`, définir le type `NetworkCapabilities` (`maxChars`,
   `maxImages`, `supportsThread`, `supportsMentions`).
2. Définir l'interface `NetworkAdapter` (`capabilities`, `connect`, `publish`,
   `mapError`) utilisée par chaque module `networks/*` côté API.
3. Fonction utilitaire "limite la plus restrictive" (texte, nombre d'images) à partir
   d'une liste de réseaux sélectionnés — réutilisable front et back.

## Dépendances

[10-monorepo-setup.md](10-monorepo-setup.md).
