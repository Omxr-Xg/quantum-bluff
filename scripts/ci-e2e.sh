#!/usr/bin/env bash
# CI GitLab : migrations → seed E2E → API + Vite → Playwright.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export E2E_EMAIL="${E2E_EMAIL:-e2e@quantum-bluff.test}"
export E2E_PASSWORD="${E2E_PASSWORD:-E2eTestPassword123!}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:5175}"
export PLAYWRIGHT_API_URL="${PLAYWRIGHT_API_URL:-http://127.0.0.1:3000}"
export CI=true

cleanup() {
  if [[ -n "${CLIENT_PID:-}" ]] && kill -0 "$CLIENT_PID" 2>/dev/null; then
    kill "$CLIENT_PID" 2>/dev/null || true
    wait "$CLIENT_PID" 2>/dev/null || true
  fi
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[ci-e2e] server deps + migrate + seed…"
cd "$ROOT/server"
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npx tsx scripts/seedE2eUser.ts

echo "[ci-e2e] démarrage API…"
npx tsx src/index.ts &
SERVER_PID=$!

ready=0
for _ in $(seq 1 45); do
  if node -e "fetch('${PLAYWRIGHT_API_URL}/api/health/ready').then(r=>r.json()).then(j=>process.exit(j.ready?0:1)).catch(()=>process.exit(1))"; then
    ready=1
    echo "[ci-e2e] API prête"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[ci-e2e] l'API s'est arrêtée avant ready"
    exit 1
  fi
  sleep 2
done
if [[ "$ready" != "1" ]]; then
  echo "[ci-e2e] timeout API"
  exit 1
fi

echo "[ci-e2e] client + Playwright…"
cd "$ROOT/client"
npm ci --legacy-peer-deps
npx playwright install chromium --with-deps

npm run dev -- --host 127.0.0.1 --port 5175 &
CLIENT_PID=$!

vite_ready=0
for _ in $(seq 1 45); do
  if curl -sf "${PLAYWRIGHT_BASE_URL}/" >/dev/null 2>&1; then
    vite_ready=1
    echo "[ci-e2e] Vite prêt"
    break
  fi
  if ! kill -0 "$CLIENT_PID" 2>/dev/null; then
    echo "[ci-e2e] Vite s'est arrêté avant ready"
    exit 1
  fi
  sleep 2
done
if [[ "$vite_ready" != "1" ]]; then
  echo "[ci-e2e] timeout Vite"
  exit 1
fi

E2E_EMAIL="$E2E_EMAIL" E2E_PASSWORD="$E2E_PASSWORD" npm run test:e2e
echo "[ci-e2e] OK"
