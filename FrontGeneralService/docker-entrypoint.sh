#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__env__ = {
  COLOR: 'neutral',
  GATEWAY_URL: '${GATEWAY_URL}',
  KEYCLOAK_URL: '${KEYCLOAK_URL}',
  KEYCLOAK_REALM: '${KEYCLOAK_REALM}',
  KEYCLOAK_CLIENT_ID: '${KEYCLOAK_CLIENT_ID}',
  FRONT_RED_URL: '${FRONT_RED_URL}',
  FRONT_BLUE_URL: '${FRONT_BLUE_URL}'
};
EOF

exec "$@"
