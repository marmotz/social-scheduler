# MVP Sonskay

**Statut** : conception technique posée, voir `technical.md`

## Contexte

Sonskay (SOcial Network SCHEduler) répond à l'absence d'alternative abordable aux
outils de planification de posts sur les réseaux sociaux, dont les offres existantes
sont quasi toutes payantes et chères. Le projet vise deux publics : les utilisateurs
qui veulent s'auto-héberger (version open source, autonomie complète) et ceux qui
préfèrent une version pro payante à un tarif correct.

Le cadrage détaillé de cette discussion vit dans `docs/product-scope.md`.

## Objectif

Livrer un premier MVP permettant de rédiger un post ou un thread (texte + images +
liens), une seule fois, puis de le publier — immédiatement ou à une date/heure
programmée — vers un ou plusieurs réseaux sélectionnés parmi X/Twitter et Bluesky.

## Décisions actées

- **Réseaux au lancement (MVP)** : X/Twitter et Bluesky uniquement. Contenu texte +
  image, pas de vidéo. Instagram, Facebook, LinkedIn, Mastodon prévus après le MVP.
- **Rédaction unique** : un post/thread est écrit une seule fois puis diffusé vers les
  réseaux sélectionnés, filtré/adapté selon un système de **capacités par réseau**
  (ex : Instagram ne supporte pas les threads).
- **Threads** : suite ordonnée de posts liés, publiés en chaîne de réponses.
- **Programmation** : publication immédiate ou programmée à date/heure précise ;
  saisie dans le fuseau horaire du navigateur, stockage en UTC.
- **Édition/annulation** : un post programmé non encore publié peut être modifié ou
  annulé.
- **Brouillons** : un post peut être enregistré sans être ni programmé ni publié.
- **Comptes réseaux** : un utilisateur peut connecter plusieurs comptes par réseau
  (OAuth propre à chacun, pas de compte applicatif partagé).
- **Limites (texte, nombre d'images)** : la limite la plus restrictive parmi les
  réseaux sélectionnés s'applique, avec avertissement à l'utilisateur.
- **Liens** : comportement neutre, pas de raccourcissement ni preview.
- **Mentions cross-réseaux** : hors périmètre MVP.
- **Échecs de publication** : le post/target est marqué en échec au MVP, sans
  notification (prévue plus tard).
- **Historique** : vue des posts déjà publiés avec leur statut, en plus de la file à
  venir.
- **Compte Sonskay** : inscription libre (email/mot de passe) au MVP.
- **Version pro vs open source** : fonctionnalités strictement identiques, seule la
  gestion de l'abonnement/paiement diffère et reste exclue du code open source
  (voir séparation en deux repos dans `docs/technical-design.md`).

Détail fonctionnel complet : `docs/product-scope.md`.
Conception technique : `docs/tech-stack.md` et `docs/technical-design.md`.
