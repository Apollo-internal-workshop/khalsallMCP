#!/bin/sh
set -e

ROUTER_URL=${ROUTER_URL:-"router-j3nprurqka-ue.a.run.app"}

echo "Configuring app with ROUTER_URL: $ROUTER_URL"
sed -i "s|__ROUTER_URL__|$ROUTER_URL|g" /app/dist/config.js

exec node /app/server.js
