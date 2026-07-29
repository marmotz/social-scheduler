# Backend — chiffrement applicatif des tokens OAuth (AES-256-GCM)

**Statut** : fait
**Type** : backend
**Issue** : [marmotz/sonskay#14](https://github.com/marmotz/sonskay/issues/14)

Référence : [../features/mvp/technical.md §Chiffrement des tokens OAuth](../features/mvp/technical.md#chiffrement-des-tokens-oauth).

## À faire

1. Service de chiffrement/déchiffrement AES-256-GCM, clé lue depuis
   `SONSKAY_ENCRYPTION_KEY` (variable d'env obligatoire au démarrage — échec explicite
   si absente).
2. Intercepter l'écriture/lecture des champs `accessToken`/`refreshToken` de
   `SocialAccount` pour chiffrer/déchiffrer systématiquement.
3. Script/commande pour générer une clé valide (utilisé dans la doc d'installation).
4. Documenter la conséquence d'une perte de clé (tokens illisibles, reconnexion requise)
   dans le futur guide d'auto-hébergement.

## Dépendances

[11-prisma-schema-core.md](11-prisma-schema-core.md).
