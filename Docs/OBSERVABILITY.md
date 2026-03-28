# Observabilité — contrat normatif (logs, métriques, health)

Ce document décrit les règles **obligatoires** pour l’exploitation (P0–P2). Le code sous `server/src/observability/` les implémente.

## 1. Règles de rédaction des logs

- **`msg`** : obligatoire pour tout événement structuré ; valeur **stable**, **`snake_case`**, issue d’un catalogue connu (ex. `http_request_complete`, `poker_action_rejected`, `degraded_mode_entered`, `casino_idempotency_rejected`, `security_suspicious_action`). Pas de phrase libre dans `msg`.
- **Champs utiles** : `requestId`, `userId`, `gameId`, `handId`, `roundId`, `actionId`, `routeGroup`, `code`, `durationMs`, `component`, `event`, `detail` / `reason` pour le texte explicatif.
- **Sévérité** :
  - `STALE_ACTION` → `warn`
  - `DUPLICATE_ACTION` (idempotence / dedup attendu) → `info` ou `warn` (pas `error`)
  - `PAYLOAD_MISMATCH` / idempotence → `warn`
  - rate limit dépassé → `warn` (événement `rate_limit_exceeded`)
  - recovery boot / cleanup **succès** → `info`
  - exception non gérée HTTP → `error` (`http_unhandled_error`)
  - dépendance critique indisponible + fallback actif → `warn` + état dégradé exposé (health + gauges)

### 1bis Redaction / sanitization

- **Interdit** : JWT, secrets, mots de passe, corps de requête/réponse complets, dumps d’objets arbitraires pouvant contenir des données sensibles.
- **Autorisé** : identifiants techniques (`userId`, `gameId`, …), montants métier, codes erreur, `routeGroup`, durées.

### Volume (prod)

- Une ligne **par requête HTTP** en `info` (`http_request_complete`) avec `status`, `durationMs`, `routeGroup` — pas de log de body.
- Événements socket très fréquents : niveau **`debug`** (ex. `socket_client_connected`) — ajuster `LOG_LEVEL` si besoin.
- Conserver en prod : erreurs, recovery, mismatch idempotence, transitions dégradées, rejets poker avec `code`.

## 2. Règles Prometheus

- **Labels faible cardinalité** uniquement : `route_group`, `method`, `status_class`, `code` (métier agrégé), `reason`, `component`, `event`, `game`, `phase`.
- **Interdit** : `userId`, `gameId`, `actionId`, `handId` en label.
- **Nouvelle métrique ou label** : justifier un cas d’usage dashboard ou alerte ; valider le risque de cardinalité.
- **HTTP** : jamais le path brut avec UUID — utiliser `route_group` / template (voir `getRouteGroup`).

Métriques exposées sur `GET /metrics` (voir §4).

## 3. Health : live / ready / résumé

| Endpoint | Rôle |
|----------|------|
| `GET /api/health/live` | Process répond (liveness kube). |
| `GET /api/health/ready` | DB joignable (`SELECT 1`) ; Redis **optionnel** — voir dégradé. |
| `GET /api/health` | Résumé texte : `OK`, `OK (degraded)`, ou `NOT_READY`. |

### Règles normatives `ready` / `degraded`

| Condition | `ready` | `degraded` |
|-----------|---------|------------|
| DB injoignable | **false** | indifférent |
| DB OK + Redis indisponible + fallback mémoire (idempotence, etc.) | **true** | **true** |
| DB OK + Redis OK | **true** | **false** |

Les diagnostics métier détaillés (poker/blackjack runtime) restent sur les routes **admin**, pas sur les probes kube de base.

### Mode dégradé

- Gauges : `app_component_up{component}`, `app_degraded{reason}` (ex. `redis_unavailable`).
- Log structuré au boot si Redis en fallback : `degraded_mode_entered`, champs `component`, `fallback`.

## 4. Scrape `/metrics`

- **Sécurité** : option `METRICS_BEARER_TOKEN` — requête avec `Authorization: Bearer <token>`. En production, restreindre aussi par réseau / ingress.
- **Tests** : sous Jest (`JEST_WORKER_ID`), le registre Prometheus est en **no-op** (pas de fuite ni de collision de métriques).

## 5. KPIs minimum (Grafana / PromQL)

1. **HTTP** : taux 5xx, latence p95/p99, 429 par `route_group` (`http_requests_total`, `http_request_duration_seconds`).
2. **Poker** : `poker_actions_total{code}` (ex. `ACCEPTED`, `STALE_ACTION`, `DUPLICATE_ACTION`).
3. **Casino** : `casino_idempotency_outcomes_total{reason}`.
4. **Recovery** : `recovery_boot_events_total{game,phase}`.
5. **Sockets** : `socket_io_events_total{event}`.
6. **DB** : `db_errors_total`, `prisma_query_duration_seconds`.

## 6. P0 / P1 / P2 (trajectoire)

- **P0** : Pino, `x-request-id`, ligne HTTP, `/metrics`, instrumentation poker + idempotence casino, recovery + dégradé Redis.
- **P1** : rate-limit métrique + logs, health live/ready/résumé, cette documentation.
- **P2** : alertes Prometheus (exemples `Docs/prometheus-alerts.example.yml`), `securityLogger` → double écriture fichier + **Pino** (`security_suspicious_action`), instrumentation Prisma min, **OpenTelemetry** / traces — backlog futur (propagation `traceparent`, export collector).

## 7. OpenTelemetry (backlog)

Après stabilisation des logs et métriques : propagation W3C Trace Context depuis HTTP puis WebSocket ; export OTel vers un collector.
