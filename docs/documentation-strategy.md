# Sonskay — Stratégie de documentation

Exigence transverse : le projet étant open source et auto-hébergeable, la documentation
n'est pas optionnelle. Elle fait partie du livrable, au même titre que le code.

## Statut

Principe posé, contenu à produire au fil du développement.

## Documentation attendue

### 1. API & types

- Documentation précise des endpoints de l'API (tRPC), incluant les types d'entrée/sortie.
- Doit rester synchronisée avec le code (idéalement générée ou vérifiée automatiquement,
  vu que tRPC expose déjà les types — éviter la dérive doc/code).

### 2. Installation & auto-hébergement

- Documentation d'installation et de configuration du projet en auto-hébergement
  (Docker/docker-compose : front, API, DB, MinIO).
- Doit permettre à quelqu'un de non-familier avec le projet d'être autonome
  (cohérent avec l'objectif produit : "chacun soit autonome", voir `product-scope.md`).

### 3. Sujets "touchy" / spécifiques

- Documentation dédiée pour tout sujet sensible ou non trivial qui mérite une explication
  à part (ex: système de capacités par réseau, gestion des fuseaux horaires, architecture
  driver de stockage, séparation modules OSS/SaaS, etc.).
- À produire au fur et à mesure que ces sujets sont conçus/implémentés, pas après coup.

## Outillage

- La documentation vit dans le dossier **`docs/`** du repo, en Markdown, versionnée avec
  le code. Simple pour démarrer ; un site généré (Docusaurus/Starlight) pourra être
  envisagé plus tard si le besoin de présentation se fait sentir.

## Questions ouvertes

_Aucune pour l'instant._
