FROM oven/bun:1 AS base
WORKDIR /repo

COPY package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN bun --cwd=packages/shared run build

WORKDIR /repo/apps/api
# Dummy value: `prisma generate` only reads the schema, it never connects to
# the database, but Prisma 7's config loader still requires DATABASE_URL to
# be resolvable. The real value is injected at runtime via docker-compose.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" bunx prisma generate

EXPOSE 3000
CMD ["bun", "run", "dev"]
