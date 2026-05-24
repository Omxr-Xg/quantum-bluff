#!/usr/bin/env bash
# CI : migrations → boot API → stress test Socket.IO → arrêt propre.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[ci-stress] prisma generate + migrate…"
npx prisma generate
npx prisma migrate deploy

echo "[ci-stress] démarrage serveur…"
npx tsx src/index.ts &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 45); do
  if node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>r.json()).then(j=>process.exit(j.ready?0:1)).catch(()=>process.exit(1))"; then
    ready=1
    echo "[ci-stress] serveur prêt"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[ci-stress] le serveur s'est arrêté avant d'être ready"
    exit 1
  fi
  sleep 2
done

if [ "$ready" != "1" ]; then
  echo "[ci-stress] timeout — serveur non ready après 90s"
  exit 1
fi

echo "[ci-stress] lancement load-test (LOAD_TEST_CLIENTS=${LOAD_TEST_CLIENTS:-200})…"
npm run load-test
