FROM node:20-slim AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dependencies
RUN npm ci

FROM dependencies AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM dependencies AS build
COPY . .
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000/ws
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
RUN npm install --global serve
COPY --from=build /app/dist ./dist
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
