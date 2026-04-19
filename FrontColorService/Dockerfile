FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=builder /app/dist/FrontColorService/browser /usr/share/nginx/html

ENV COLOR=neutral \
    GATEWAY_URL=http://localhost:8000 \
    KEYCLOAK_URL=http://localhost:8080 \
    KEYCLOAK_REALM=pokemon-drafter \
    KEYCLOAK_CLIENT_ID=frontend-client \
    FRONT_GENERAL_URL=http://localhost:4200

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
