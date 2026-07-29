# Docs — guide d'installation et d'auto-hébergement

**Statut** : à faire
**Type** : docs
**Issue** : [marmotz/sonskay#27](https://github.com/marmotz/sonskay/issues/27)

Référence : [../../docs/documentation-strategy.md](../../docs/documentation-strategy.md).

## À faire

1. Guide d'installation via `docker-compose` (services api/web/postgres/minio),
   variables d'environnement requises (dont `SONSKAY_ENCRYPTION_KEY`).
2. Procédure de génération de `SONSKAY_ENCRYPTION_KEY`, avec avertissement explicite sur
   la conséquence d'une perte de clé (tokens illisibles, reconnexion de tous les
   comptes réseaux).
3. Configuration des credentials OAuth par réseau (X/Twitter, Bluesky) côté
   auto-hébergeur (création d'une app développeur, variables d'env correspondantes).
4. Procédure de mise à jour (migrations Prisma) pour une instance existante.

## Dépendances

[14-oauth-token-encryption.md](14-oauth-token-encryption.md),
[10-monorepo-setup.md](10-monorepo-setup.md).

## Note

Les points 2 et 3 ont déjà un contenu provisoire dans
[../../docs/getting-started.md](../../docs/getting-started.md) (sections « Clé de
chiffrement des tokens OAuth » et « Comptes réseaux (X/Twitter, Bluesky) »), écrit au
fil de l'implémentation de #14/#15/#16 faute de guide d'auto-hébergement dédié. À
migrer/étoffer ici plutôt qu'à réécrire de zéro.
