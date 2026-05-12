# Étape 1 : Build de l'application Vite / React
# Kaniko snapshotte après chaque RUN : un RUN npm ci seul fige un énorme node_modules
# et fait souvent OOM sur des runners K8s peu dimensionnés. Une seule couche :
# install → build → suppression de node_modules avant snapshot.
# Sur runners K8s partagés : docker.io et public.ecr.aws peuvent renvoyer TOOMANYREQUESTS ;
# `mirror.gcr.io/library/*` = miroir Google des Docker Official Images.
FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# CI Kaniko / petits pods : évite OOM pendant le bundling Vite.
ENV NODE_OPTIONS=--max-old-space-size=4096
# Image web uniquement : pas de binaire Electron ni de navigateurs Playwright (évite ENOSPC sur runners K8s).
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Dépendances d’abord → moins de pics disque (cache npm vidé avant le build Vite).
# Ne pas utiliser --omit=optional : Rollup (Vite) requiert @rollup/rollup-linux-x64-musl sur Alpine.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund \
  && npm cache clean --force
COPY . .
RUN npm run build && rm -rf node_modules /root/.npm

# Étape 2 : Serveur Nginx pour les fichiers statiques (avec support du React Router)
FROM mirror.gcr.io/library/nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

RUN echo "server {" > /etc/nginx/conf.d/default.conf && \
    echo "    listen 80;" >> /etc/nginx/conf.d/default.conf && \
    echo "    location / {" >> /etc/nginx/conf.d/default.conf && \
    echo "        root /usr/share/nginx/html;" >> /etc/nginx/conf.d/default.conf && \
    echo "        index index.html;" >> /etc/nginx/conf.d/default.conf && \
    echo "        try_files \$uri \$uri/ /index.html;" >> /etc/nginx/conf.d/default.conf && \
    echo "    }" >> /etc/nginx/conf.d/default.conf && \
    echo "}" >> /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]