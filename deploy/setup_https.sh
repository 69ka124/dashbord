#!/bin/bash
# HTTPS via nginx + certbot.
# Usage: DOMAIN=your.domain.example bash deploy/setup_https.sh
set -euo pipefail

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "Set DOMAIN first, e.g.: DOMAIN=dashbord.example.com bash deploy/setup_https.sh"
  exit 1
fi

CONF=/etc/nginx/sites-available/dashbord
sed "s/YOUR_DOMAIN/${DOMAIN}/g" /opt/dashbord/deploy/nginx/dashbord.conf > "$CONF"
ln -sfn "$CONF" /etc/nginx/sites-enabled/dashbord
nginx -t
systemctl reload nginx

mkdir -p /var/www/html
certbot certonly --webroot -w /var/www/html -d "$DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email

cat > "$CONF" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

nginx -t
systemctl reload nginx

python3 - <<PY
from pathlib import Path
path = Path("/opt/dashbord/.env")
text = path.read_text() if path.exists() else ""
new = 'AUTH_URL="https://${DOMAIN}"'
import re
if re.search(r'^AUTH_URL=', text, re.M):
    text = re.sub(r'^AUTH_URL=.*$', new, text, count=1, flags=re.M)
else:
    text = text.rstrip() + "\n" + new + "\n"
path.write_text(text)
print("AUTH_URL updated to", new)
PY

systemctl restart dashbord
systemctl is-active dashbord
echo "HTTPS ready: https://${DOMAIN}/login"
