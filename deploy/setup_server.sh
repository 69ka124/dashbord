#!/bin/bash
set -euo pipefail
APP_DIR="/opt/dashbord"
DATA_DIR="$APP_DIR/data"
# Set before first run, e.g. export PUBLIC_URL="https://dashbord.example.com"
PUBLIC_URL="${PUBLIC_URL:-http://127.0.0.1:5001}"
OWNER_EMAIL_DEFAULT="${OWNER_EMAIL:-owner@example.com}"

mkdir -p "$DATA_DIR" "$APP_DIR/logs"
cd "$APP_DIR"

if [ ! -f .env ]; then
  SECRET=$(openssl rand -base64 32 | tr -d '\n')
  cat > .env <<EOF
DATABASE_URL="file:/opt/dashbord/data/prod.db"
AUTH_SECRET="$SECRET"
AUTH_TRUST_HOST=true
AUTH_URL="$PUBLIC_URL"
OWNER_EMAIL="$OWNER_EMAIL_DEFAULT"
OPEN_ACCESS="false"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
EOF
  echo "Created $APP_DIR/.env — edit OWNER_EMAIL and AUTH_URL before sharing"
fi

if ! grep -q '^OPEN_ACCESS=' .env 2>/dev/null; then
  echo 'OPEN_ACCESS=false' >> .env
fi

echo "==> npm ci"
npm ci

echo "==> prisma"
npx prisma generate
npx prisma db push

echo "==> build"
export NODE_OPTIONS="--max-old-space-size=3072"
npm run build

echo "==> standalone static assets"
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> systemd"
cp deploy/systemd/dashbord.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable dashbord
systemctl restart dashbord
systemctl is-active dashbord

echo "==> Ready: $PUBLIC_URL/login"
echo "==> Login with OWNER_EMAIL from .env"
