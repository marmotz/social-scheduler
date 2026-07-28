# Sonskay — Backlog

## [MVP](features/mvp/overview.md)

### Fondation

| Fait | Issue                                               | Tâche                                                                     | Description                                   |
|------|-----------------------------------------------------|---------------------------------------------------------------------------|-----------------------------------------------|
| [x]  | [#10](https://github.com/marmotz/sonskay/issues/10) | [10-monorepo-setup](tasks/10-monorepo-setup.md)                           | Setup monorepo Bun + docker-compose           |
| [x]  | [#11](https://github.com/marmotz/sonskay/issues/11) | [11-prisma-schema-core](tasks/11-prisma-schema-core.md)                   | Schéma Prisma initial                         |
| [x]  | [#12](https://github.com/marmotz/sonskay/issues/12) | [12-network-capabilities-shared](tasks/12-network-capabilities-shared.md) | NetworkCapabilities / NetworkAdapter (shared) |

### Backend

| Fait | Issue                                               | Tâche                                                               | Description                              |
|------|-----------------------------------------------------|---------------------------------------------------------------------|------------------------------------------|
| [ ]  | [#13](https://github.com/marmotz/sonskay/issues/13) | [13-auth-module](tasks/13-auth-module.md)                           | Module auth (Passport + JWT)             |
| [ ]  | [#14](https://github.com/marmotz/sonskay/issues/14) | [14-oauth-token-encryption](tasks/14-oauth-token-encryption.md)     | Chiffrement AES-256-GCM des tokens OAuth |
| [ ]  | [#15](https://github.com/marmotz/sonskay/issues/15) | [15-networks-twitter-adapter](tasks/15-networks-twitter-adapter.md) | Adapter networks/twitter                 |
| [ ]  | [#16](https://github.com/marmotz/sonskay/issues/16) | [16-networks-bluesky-adapter](tasks/16-networks-bluesky-adapter.md) | Adapter networks/bluesky                 |
| [ ]  | [#17](https://github.com/marmotz/sonskay/issues/17) | [17-social-accounts-module](tasks/17-social-accounts-module.md)     | Module social-accounts                   |
| [ ]  | [#18](https://github.com/marmotz/sonskay/issues/18) | [18-media-storage-module](tasks/18-media-storage-module.md)         | Module media + StorageDriver MinIO       |
| [ ]  | [#19](https://github.com/marmotz/sonskay/issues/19) | [19-posts-module](tasks/19-posts-module.md)                         | Module posts                             |
| [ ]  | [#20](https://github.com/marmotz/sonskay/issues/20) | [20-publishing-module](tasks/20-publishing-module.md)               | Module publishing (polling)              |

### Frontend

| Fait | Issue                                               | Tâche                                                                     | Description                                                |
|------|-----------------------------------------------------|---------------------------------------------------------------------------|------------------------------------------------------------|
| [ ]  | [#21](https://github.com/marmotz/sonskay/issues/21) | [21-frontend-app-shell](tasks/21-frontend-app-shell.md)                   | Socle app front (Vite/TanStack Router/shadcn/Zustand/tRPC) |
| [ ]  | [#22](https://github.com/marmotz/sonskay/issues/22) | [22-frontend-auth-pages](tasks/22-frontend-auth-pages.md)                 | Pages login/register                                       |
| [ ]  | [#23](https://github.com/marmotz/sonskay/issues/23) | [23-frontend-social-accounts-ui](tasks/23-frontend-social-accounts-ui.md) | UI comptes réseaux connectés                               |
| [ ]  | [#24](https://github.com/marmotz/sonskay/issues/24) | [24-frontend-post-composer](tasks/24-frontend-post-composer.md)           | Composeur de post (thread/images/capacités)                |
| [ ]  | [#25](https://github.com/marmotz/sonskay/issues/25) | [25-frontend-scheduling-ui](tasks/25-frontend-scheduling-ui.md)           | UI programmation (fuseau, publication immédiate)           |
| [ ]  | [#26](https://github.com/marmotz/sonskay/issues/26) | [26-frontend-history-view](tasks/26-frontend-history-view.md)             | Vue historique/file à venir                                |

### Docs

| Fait | Issue                                               | Tâche                                                             | Description                           |
|------|-----------------------------------------------------|-------------------------------------------------------------------|---------------------------------------|
| [ ]  | [#27](https://github.com/marmotz/sonskay/issues/27) | [27-docs-self-hosting-guide](tasks/27-docs-self-hosting-guide.md) | Guide d'installation/auto-hébergement |
| [ ]  | [#28](https://github.com/marmotz/sonskay/issues/28) | [28-docs-api-reference](tasks/28-docs-api-reference.md)           | Doc endpoints tRPC + types            |
