FROM node:20-slim AS base
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @guardrails/worker build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/apps/worker/dist ./dist
COPY --from=build /app/apps/worker/package.json .
COPY --from=build /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.js"]
