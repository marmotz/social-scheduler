# Backend — module publishing (déclenchement par polling, exécution, échecs)

**Statut** : à faire
**Type** : backend
**Issue** : [marmotz/sonskay#20](https://github.com/marmotz/sonskay/issues/20)

Référence : [../features/mvp/technical.md §Programmation & publication](../features/mvp/technical.md#programmation--publication).

## À faire

1. Module NestJS `publishing` avec un cron (`@nestjs/schedule`) interrogeant les `Post`
   dus (`scheduledAt <= now AND status = 'scheduled'`).
2. Pour chaque `Post` dû, exécuter la publication vers chaque `PostTarget` via le
   `NetworkAdapter` correspondant (délégation au module `networks/*`).
3. Écrire le résultat par `PostTargetItem` (`externalId`, `status`, `errorMessage`),
   agréger le statut du `PostTarget` puis du `Post` (`published`/`failed`/`partial`).
4. Chemin "publication immédiate" : même logique, déclenchée directement (sans attendre
   le prochain tick de polling) au moment de l'appel `publishNow`.
5. Aucune notification utilisateur en cas d'échec au MVP (juste le marquage de statut).

## Dépendances

[19-posts-module.md](19-posts-module.md),
[17-social-accounts-module.md](17-social-accounts-module.md).
