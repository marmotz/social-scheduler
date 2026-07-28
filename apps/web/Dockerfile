FROM oven/bun:1 AS base
WORKDIR /repo

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY apps/web apps/web
COPY packages/shared packages/shared

WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["bun", "run", "dev", "--", "--host"]
