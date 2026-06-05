# Miroir Google des Docker Official Images (évite TOOMANYREQUESTS sur public.ecr.aws / docker.io en CI).
FROM mirror.gcr.io/library/node:20-alpine AS build

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# prisma generate + tsc + copie client Prisma vers dist/
RUN npm run build && chmod +x docker-entrypoint.sh

# Image runtime allégée (sans jest, mermaid-cli, typescript, etc.)
FROM mirror.gcr.io/library/node:20-alpine AS production

WORKDIR /app
RUN chown node:node /app

USER node

ENV NODE_ENV=production
# Render free/starter (~512 Mo) : limite le heap V8 pour laisser de la RAM au natif (Prisma, Socket.IO).
ENV NODE_OPTIONS=--max-old-space-size=384
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

# Dépendances prod + CLI Prisma pour migrate deploy (entrypoint).
RUN npm ci --omit=dev && npm install prisma@6.19.2 --no-save

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
