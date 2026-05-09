FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app
# Un seul chown sur le répertoire de travail — pas de parcours de node_modules.
RUN chown node:node /app

USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

RUN npm ci

COPY --chown=node:node . .

# `npm run build` = prisma generate + tsc + copie client Prisma vers dist/
RUN npm run build && chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
