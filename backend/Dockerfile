FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

ENV NODE_ENV=production

# Runs the TypeScript entrypoint with tsx
CMD ["npx", "tsx", "index.ts"]
