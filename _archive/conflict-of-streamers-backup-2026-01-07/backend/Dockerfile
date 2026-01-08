FROM node:20-slim AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dependencies
RUN npm ci

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev

FROM dependencies AS development
COPY . .
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM production-dependencies AS production
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]
