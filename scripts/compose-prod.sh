#!/usr/bin/env bash
# Charge .env à la racine ET server/.env pour l’interpolation ${VAR} du compose
# (même comportement pratique qu’en local). Usage sur la VM :
#   ./scripts/compose-prod.sh -f docker-compose.prod.yml up -d --build
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
args=()
[[ -f .env ]] && args+=(--env-file .env)
[[ -f server/.env ]] && args+=(--env-file server/.env)
exec docker compose "${args[@]}" "$@"
