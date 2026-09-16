#!/bin/bash
set -euo pipefail

cp /opt/dashbord/deploy/nginx/dashbord.conf /etc/nginx/sites-available/dashbord
ln -sfn /etc/nginx/sites-available/dashbord /etc/nginx/sites-enabled/dashbord
nginx -t
systemctl reload nginx

mkdir -p /var/www/html
certbot certonly --webroot -w /var/www/html -d 135.106.209.129.sslip.io \
  --non-interactive --agree-tos --register-unsafely-without-email

cat > /etc/nginx/sites-available/dashbord <<'NGINX'
server {
    listen 80;
    server_name 135.106.209.129.sslip.io;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name 135.106.209.129.sslip.io;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/135.106.209.129.sslip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/135.106.209.129.sslip.io/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

nginx -t
systemctl reload nginx

python3 - <<'PY'
from pathlib import Path
path = Path("/opt/dashbord/.env")
text = path.read_text()
old = 'AUTH_URL="http://135.106.209.129:5001"'
new = 'AUTH_URL="https://135.106.209.129.sslip.io"'
if old in text:
    path.write_text(text.replace(old, new))
    print("AUTH_URL updated")
elif "135.106.209.129.sslip.io" in text:
    print("AUTH_URL already sslip.io")
else:
    print("AUTH_URL line not found, appending")
    path.write_text(text.rstrip() + "\n" + new + "\n")
PY

systemctl restart dashbord
systemctl is-active dashbord
echo "HTTPS ready: https://135.106.209.129.sslip.io/access"
