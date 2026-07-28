# Sonskay — Cadrage produit

Notes de discussion pour définir les contours du projet, indépendamment de la stack technique actuelle.

## Statut

En discussion.

## Contexte

Sonskay = SOcial Network SCHEduler.

Pour anticiper/planifier ses posts sur les réseaux sociaux, les offres existantes sont
quasi toutes payantes et assez chères. Il manque une alternative accessible.

## Vision / problème résolu

Proposer une alternative aux outils de planification de réseaux sociaux payants et chers,
via deux volets :

1. **Version open source, auto-hébergeable** — avec documentation pour que chacun soit
   autonome (installation, maintenance, hébergement chez soi/son serveur).
2. **Version pro (SaaS payant)** — pour les personnes qui ne peuvent pas ou ne veulent pas
   auto-héberger, à un tarif correct (pas dans les prix des offres actuelles du marché).

## Utilisateurs cibles

- Profil "auto-hébergeur" : à l'aise technique, veut garder la main sur ses données,
  prêt à installer/maintenir lui-même (version open source).
- Profil "pro payant" : veut le service sans la gestion technique, sensible au prix
  (version SaaS, tarif accessible).

_À affiner : particuliers, créateurs de contenu, petites entreprises, agences ?_

## Périmètre fonctionnel envisagé

### Réseaux ciblés

Contenu texte + image uniquement (pas de vidéo).

- X / Twitter
- Instagram
- Facebook
- LinkedIn
- Mastodon
- Bluesky

### Utilisateurs cibles (fonctionnel)

Toute personne ayant besoin de gérer/planifier ses posts à l'avance (pas de segmentation
plus fine pour l'instant — solo, entreprise, agence : tous concernés).

### MVP

- Rédaction d'un post ou d'un thread (plusieurs posts liés)
- Ajout d'image(s), de liens, de mentions
- Réseaux supportés au lancement : **X/Twitter + Bluesky uniquement**
- Programmation à une date/heure précise (publication automatique)

## Hors périmètre (pour l'instant)

- Vidéo (donc pas de YouTube, TikTok, Reels Instagram)
- Instagram, Facebook, LinkedIn, Mastodon en tant que réseaux : prévus dans la vision
  mais pas dans le MVP (après X/Twitter + Bluesky)
- Statistiques / analytics
- Calendrier éditorial visuel
- Gestion multi-comptes / multi-utilisateurs (agences)

## Fonctionnement multi-réseaux

- Rédaction unique : l'utilisateur écrit son post/thread une seule fois, puis sélectionne
  les réseaux de destination.
- Chaque réseau a des **capacités** différentes (ex: Instagram ne supporte pas les threads).
  Il faut un système de capacités par réseau qui :
  - filtre ce qui est réalisable ou non selon les réseaux sélectionnés,
  - adapte ce qui est affiché/proposé à l'utilisateur en fonction de ces capacités.

## Authentification aux réseaux

- Chaque utilisateur connecte son propre compte sur chaque réseau (OAuth ou équivalent
  selon le réseau) — pas de compte applicatif partagé.

## Gestion des échecs (MVP)

- Si une publication échoue (token expiré, post refusé, etc.), le post est marqué en échec.
- Pas de notification à l'utilisateur au MVP — prévu pour une itération ultérieure.

## Version pro vs open source

- Fonctionnalités **identiques** entre les deux versions.
- Seule différence : la version pro ajoute la gestion de l'abonnement/paiement, et
  éventuellement d'autres modules propres au fonctionnement SaaS (facturation, etc.).
- Ces modules additionnels (paiement et liés au SaaS) ne doivent **pas** être présents
  dans la version open source — à garder séparés architecturalement dès le départ.

## Images

- Plusieurs images par post, si supporté par le réseau (à vérifier : X et Bluesky
  semblent permettre plusieurs images par post).
- Contraintes de format/taille par réseau : à définir plus tard (pas bloquant pour le
  cadrage produit).

## Édition / suppression après programmation

- Un post déjà programmé (mais pas encore publié) peut être modifié ou annulé avant
  son heure de publication.

## Comptes connectés

- Un utilisateur peut connecter **plusieurs comptes** sur un même réseau (ex: 2 comptes
  X différents), sans limite arbitraire.

## Historique des posts

- Au MVP, vue listant les posts déjà publiés avec leur statut (succès/échec), en plus
  de la file des posts à venir.

## Fuseau horaire

- La programmation se fait dans le **fuseau horaire du navigateur** de l'utilisateur.
- Stockage en **UTC** en base.
- Envoi/publication déclenché à la bonne heure correspondante.

## Compte utilisateur Sonskay

- Inscription libre (email/mot de passe) au MVP.
- Un mode "instance privée / pas d'inscription publique" pourra être configuré plus
  tard (pas bloquant pour le MVP).

## Limite de longueur de texte

- Chaque réseau a sa propre limite de caractères (ex: X = 280, Bluesky = 300).
- Le MVP doit **avertir** l'utilisateur s'il dépasse la limite d'un des réseaux
  sélectionnés pour le post.
- Si plusieurs réseaux sont sélectionnés en même temps, la limite affichée/appliquée
  est la **plus restrictive** parmi eux (ex: X + Bluesky → avertir à 280, pas 300),
  pour ne bloquer aucun des réseaux choisis.

## Thread

- Un thread est une suite ordonnée de posts liés entre eux, publiés comme une chaîne
  de réponses (mécanique de réponse en chaîne, comme nativement sur X et Bluesky).

## Mentions cross-réseaux

- Hors MVP : pas de gestion spécifique des mentions (`@handle`) pour un post écrit une
  seule fois pour plusieurs réseaux. À traiter dans une itération ultérieure.

## Publication immédiate vs programmée

- Le MVP permet les deux : publication immédiate ET programmation à date/heure précise.

## Brouillons

- Le MVP permet d'enregistrer un post en brouillon, sans le programmer ni le publier.

## Liens

- Comportement neutre : l'URL est laissée telle quelle, pas de raccourcissement ni de
  preview géré par Sonskay.

## Nombre maximum d'images par post

- Même règle que pour la longueur du texte : la limite la plus restrictive parmi les
  réseaux sélectionnés s'applique (avertissement à l'utilisateur).

## Questions ouvertes

_Aucune pour l'instant._
