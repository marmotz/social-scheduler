# Backend — module auth (inscription/connexion, Passport + JWT)

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#13](https://github.com/marmotz/sonskay/issues/13)

Référence : [../features/mvp/technical.md §Authentification](../features/mvp/technical.md#authentification).

## À faire

1. Module NestJS `auth` : inscription et connexion par email/mot de passe (hash du mot
   de passe).
2. Stratégies Passport (`passport-jwt`) : access token court + refresh token en cookie
   httpOnly.
3. Endpoints tRPC : `register`, `login`, `refresh`, `logout`.
4. Guard NestJS pour protéger les routes authentifiées.

## Dépendances

[11-prisma-schema-core.md](11-prisma-schema-core.md).
