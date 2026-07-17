FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-config/package.json packages/shared-config/package.json
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY . .
RUN npm run build -w @sara/backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci --omit=dev --workspaces --include-workspace-root
COPY --from=build /app/apps/backend/dist apps/backend/dist
EXPOSE 3333
CMD ["node", "apps/backend/dist/server.js"]
