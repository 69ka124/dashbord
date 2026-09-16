#!/bin/bash
set -euo pipefail
APP_DIR="/opt/dashbord"
DATA_DIR="$APP_DIR/data"

mkdir -p "$DATA_DIR" "$APP_DIR/logs"
cd "$APP_DIR"

if [ ! -f .env ]; then
  SECRET=$(openssl rand -base64 32 | tr -d '\n')
  cat > .env <<EOF
DATABASE_URL="file:/opt/dashbord/data/prod.db"
AUTH_SECRET="$SECRET"
AUTH_TRUST_HOST=true
AUTH_URL="http://135.106.209.129:5001"
OWNER_EMAIL="owner@demo.local"
OPEN_ACCESS="false"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
EOF
  echo "Created $APP_DIR/.env"
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

echo "==> Ready: http://135.106.209.129:5001/login"
echo "==> Demo login email: owner@demo.local"
