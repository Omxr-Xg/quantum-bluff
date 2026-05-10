# Étape 1 : Build de l'application Vite / React
# Kaniko snapshotte après chaque RUN : un RUN npm ci seul fige un énorme node_modules
# et fait souvent OOM sur des runners K8s peu dimensionnés. Une seule couche :
# install → build → suppression de node_modules avant snapshot.
FROM public.ecr.aws/docker/library/node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm ci --legacy-peer-deps && npm run build && rm -rf node_modules /root/.npm

# Étape 2 : Serveur Nginx pour les fichiers statiques (avec support du React Router)
FROM public.ecr.aws/docker/library/nginx:alpine
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