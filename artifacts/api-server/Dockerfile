FROM node:22-slim

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install pnpm and dependencies
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile

# Build
WORKDIR /app/artifacts/api-server
RUN pnpm build

# Start
CMD ["node", "dist/index.cjs"]
