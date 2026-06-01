#!/usr/bin/env bash
# Local deploy script — builds locally, pushes dist to EC2 via rsync
# Usage: ./deploy.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$SCRIPT_DIR/web"
PEM="$SCRIPT_DIR/Enis.pem"
SERVER="ubuntu@13.53.170.139"
SERVE_DIR="/var/www/ogedep"

echo "[deploy] Building..."
cd "$WEB_DIR"
npm run build

echo "[deploy] Syncing dist to server..."
rsync -avz --delete -e "ssh -i $PEM -o StrictHostKeyChecking=no" \
  "$WEB_DIR/dist/" "$SERVER:$SERVE_DIR/"

# Security headers — yalnızca conf'u repodakinden farklıysa kopyala ve nginx -t başarılı olursa reload et.
HEADERS_SRC="$SCRIPT_DIR/nginx/meb-security-headers.conf"
HEADERS_DST="/etc/nginx/conf.d/meb-security-headers.conf"
if [ -f "$HEADERS_SRC" ]; then
  echo "[deploy] Syncing security headers conf..."
  scp -i "$PEM" -o StrictHostKeyChecking=no "$HEADERS_SRC" "$SERVER:/tmp/meb-security-headers.conf" >/dev/null
  ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "sudo install -o root -g root -m 644 /tmp/meb-security-headers.conf $HEADERS_DST && rm -f /tmp/meb-security-headers.conf && sudo nginx -t" \
    || { echo "[deploy] nginx -t başarısız; security headers kopyalandı ama reload atlandı." >&2; }
fi

echo "[deploy] Reloading nginx..."
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "sudo systemctl reload nginx"

echo "[deploy] Done. $(date)"
echo "[deploy] Live at https://enis.qzz.io"
