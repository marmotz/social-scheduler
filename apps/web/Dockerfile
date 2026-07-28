FROM oven/bun:1 AS base
WORKDIR /repo

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY apps/web apps/web
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/
COPY packages/shared packages/shared
RUN bun --cwd=packages/shared run build

WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["bun", "run", "dev", "--", "--host"]
