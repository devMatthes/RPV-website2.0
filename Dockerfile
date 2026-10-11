FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG PUBLIC_SERVICE_API_URL
ENV PUBLIC_SERVICE_API_URL=$PUBLIC_SERVICE_API_URL
RUN npm run check && npm run api:check && npm test && npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATA_DIR=/data STATIC_DIR=/app/dist STATIC_BASE=/
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/lib ./src/lib
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
CMD ["node", "--experimental-strip-types", "server/index.ts"]
