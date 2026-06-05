#!/bin/sh
set -e

KEY=/data/certs/key.pem
CERT=/data/certs/cert.pem

if [ ! -f "$KEY" ] || [ ! -f "$CERT" ]; then
  mkdir -p /data/certs
  openssl req -x509 -newkey rsa:2048 \
    -keyout "$KEY" -out "$CERT" \
    -days 3650 -nodes -subj "/CN=campmate"
  chmod 600 "$KEY"
  echo "▲ Generated TLS certificate (stored in /data/certs/)"
fi

exec node server-https.js
