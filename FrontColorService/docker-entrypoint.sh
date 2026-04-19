#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__env__ = {
  COLOR: '${COLOR}',
  GATEWAY_URL: '${GATEWAY_URL}',
  KEYCLOAK_URL: '${KEYCLOAK_URL}',
  KEYCLOAK_REALM: '${KEYCLOAK_REALM}',
  KEYCLOAK_CLIENT_ID: '${KEYCLOAK_CLIENT_ID}',
  FRONT_GENERAL_URL: '${FRONT_GENERAL_URL}'
};
EOF

exec "$@"
