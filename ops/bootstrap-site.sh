#!/usr/bin/env bash
# Run once as root with this directory and deploy_key.pub present.
set -euo pipefail
cd "$(dirname "$0")"
site=demosha2026.storkyproduct.ru
base=/srv/demosha2026
config=/etc/nginx/sites-available/$site
enabled=/etc/nginx/sites-enabled/$site
if [[ -e "$config" || -L "$enabled" || -e "$base" ]]; then
  echo 'This site already exists; refusing to overwrite it.' >&2
  exit 1
fi
nginx -t
backup=/root/demosha2026-setup-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup"
find /etc/nginx -type f -exec sha256sum {} + > "$backup/nginx-before.sha256"
docker ps --format '{{.Names}} {{.Status}}' > "$backup/containers-before.txt"
if id demosha-deploy >/dev/null 2>&1; then
  echo 'Deployment user already exists; refusing to reuse it.' >&2
  exit 1
fi
useradd --system --create-home --home-dir /home/demosha-deploy --shell /bin/bash demosha-deploy
install -d -o demosha-deploy -g demosha-deploy -m 755 "$base" "$base/releases" "$base/incoming"
install -d -m 755 "$base/acme"
install -d -o demosha-deploy -g demosha-deploy -m 700 /home/demosha-deploy/.ssh
printf 'restrict,command="/usr/local/libexec/demosha2026-deploy" %s\n' "$(cat deploy_key.pub)" > /home/demosha-deploy/.ssh/authorized_keys
chown demosha-deploy:demosha-deploy /home/demosha-deploy/.ssh/authorized_keys
chmod 600 /home/demosha-deploy/.ssh/authorized_keys
install -d -m 755 /usr/local/libexec
install -m 755 deploy_receiver.py /usr/local/libexec/demosha2026-deploy
install -m 644 nginx-http.conf "$config"
ln -s "$config" "$enabled"
if ! nginx -t; then
  rm -- "$enabled" "$config"
  exit 1
fi
systemctl reload nginx
certbot certonly --webroot -w "$base/acme" -d "$site" --cert-name "$site" \
  --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
cp "$config" "$backup/site-http.conf"
install -m 644 nginx-https.conf "$config"
if ! nginx -t; then
  cp "$backup/site-http.conf" "$config"
  exit 1
fi
systemctl reload nginx
# A hook dedicated to this certificate; it does not replace existing hooks.
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/demosha2026-nginx <<'HOOK'
#!/bin/sh
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/demosha2026.storkyproduct.ru ]; then
    /usr/sbin/nginx -t && /usr/bin/systemctl reload nginx
fi
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/demosha2026-nginx
sha256sum --check "$backup/nginx-before.sha256"
printf '\nSite configured. Existing Nginx files are unchanged. Baseline: %s\n' "$backup"
