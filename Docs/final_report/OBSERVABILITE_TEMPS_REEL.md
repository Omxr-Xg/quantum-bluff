# Rapport final — observabilité backend (temps réel)

**Périmètre.** Ce document résume ce qui a été livré sur la branche de travail dédiée au plan d’observabilité « version durcie » : fondations d’exploitation pour un backend temps réel (poker, casino, sockets, recovery), sans prétendre à une couverture totale du front (erreurs réseau client restent côté client ou à corréler via `requestId`).

**Référence normative.** Le contrat détaillé (champs de log, sévérité, santé, Prometheus, sanitization) est dans [`Docs/OBSERVABILITY.md`](../OBSERVABILITY.md). Les exemples d’alertes Prometheus sont dans [`Docs/prometheus-alerts.example.yml`](../prometheus-alerts.example.yml).

---

## 1. Objectif atteint

Passer d’un socle essentiellement basé sur `console.log`, un healthcheck texte et des endpoints admin ponctuels à un **pipeline d’observabilité structuré** : logs JSON requêtables, corrélation HTTP (`x-request-id`), métriques Prometheus à faible cardinalité, séparation **liveness / readiness / dégradé**, et instrumentation des chemins critiques (poker, idempotence casino, recovery, rate limit, sockets).

---

## 2. Livrables code

### Module `server/src/observability/`

| Fichier | Rôle |
|--------|------|
| `logger.ts` | Logger racine Pino (`LOG_LEVEL`, JSON). |
| `routeGroup.ts` | `getRouteGroup` / `pathToRouteGroup` — groupes de routes sans UUID en label. |
| `httpAccess.middleware.ts` | `requestId` + log d’accès `http_request_complete` (status, durée, `routeGroup`). |
| `metrics.ts` | Registre Prometheus : HTTP, poker, idempotence casino, recovery, composants, dégradé, rate limit, sockets, DB/Prisma — **no-op sous Jest** (`JEST_WORKER_ID`). |
| `rateLimitWithMetrics.ts` | Enveloppe `express-rate-limit` : `rate_limit_exceeded` + compteur. |
| `healthCheck.ts` | `getReadyState()` (DB vs Redis + dégradé), `logDegradedStateAtBoot()`. |
| `businessLog.ts` | Helper `logBusinessEvent` pour événements avec `msg` stable. |
| `index.ts` | Ré-exports publics. |

### Intégration

- **`server/src/index.ts`** : middlewares observabilité, endpoints `GET /api/health/live`, `/api/health/ready`, `/api/health`, `GET /metrics` (option `METRICS_BEARER_TOKEN`), erreurs HTTP → `http_unhandled_error`.
- **`server/src/poker/services/pokerActionOrchestrator.service.ts`** : `poker_actions_total{code}`, logs `poker_action_rejected` avec champs métier.
- **`server/src/casino/services/idempotency.service.ts`** : `casino_idempotency_outcomes_total{reason}`, logs `casino_idempotency_rejected`.
- **`server/src/blackjack/recovery/blackjackRecovery.service.ts`** et **`poker/recovery/pokerRecovery.service.ts`** : `recovery_boot_events_total`, logs structurés de recovery.
- **`server/src/sockets/game.gateway.ts`** : métriques connexion/déconnexion, logs auth et connexion en `debug` pour limiter le bruit.
- **`server/src/utils/securityLogger.ts`** : conservation des fichiers `logs/` + émission parallèle vers Pino (`security_suspicious_action`).
- **`server/src/config/database.ts`** / **`redis.config.ts`** : logs structurés connexion/erreurs, métriques Prisma/DB côté configuration.

### Dépendances

- `pino`, `prom-client` (voir `server/package.json`).

---

## 3. Endpoints et sondes

| Endpoint | Usage |
|----------|--------|
| `GET /api/health/live` | Liveness : process répond (kube). |
| `GET /api/health/ready` | Readiness : JSON avec `ready`, `degraded`, `components` (DB `up`/`down`, Redis `up` ou `fallback_memory`). |
| `GET /api/health` | Résumé texte pour compatibilité (`OK`, `OK (degraded)`, `NOT_READY`). |
| `GET /metrics` | Scrape Prometheus ; protection optionnelle par bearer token. |

**Règle métier documentée.** Base injoignable → `ready: false`. Redis indisponible mais fallback mémoire opérationnel → `ready: true` et `degraded: true`.

---

## 4. Métriques Prometheus (aperçu)

Les séries suivent une gouvernance de **labels faibles** (pas d’IDs utilisateur ou de mains en label). Les corrélations fines restent dans les **logs**.

- HTTP : `http_requests_total`, `http_request_duration_seconds` (méthode, `route_group`, `status_class`).
- Poker : `poker_actions_total{code}`.
- Casino : `casino_idempotency_outcomes_total{reason}`.
- Recovery : `recovery_boot_events_total{game,phase}`.
- Infra : `app_component_up`, `app_degraded`, `rate_limit_exceeded_total`, `socket_io_events_total`, `db_errors_total`, `prisma_query_duration_seconds`, etc.

---

## 5. Ce qui reste (backlog / P2)

Documenté dans le plan et dans `Docs/OBSERVABILITY.md` :

- Dashboards Grafana et tuning Alertmanager sur la base des exemples YAML.
- Propagation **OpenTelemetry** / traces (`traceparent`) après stabilisation des métriques et des logs.
- **AsyncLocalStorage** si la propagation `requestId` / contexte métier vers tous les handlers devient lourde.
- Enrichissement ciblé des logs **sockets** (corrélation `gameId` / `handId` sur événements critiques) sans exploser le volume.

---

## 6. Critère de « done » honnête

L’observabilité n’est pas réduite à « Pino + `/metrics` » : elle est **exploitable** lorsque les logs sont **requêtables** (notamment `msg` en snake_case), que live / ready / dégradé sont **distincts**, que les KPIs de base sont **observables** en PromQL, et que la trajectoire (sécurité unifiée, OTel) est **assumée** dans la documentation.

---

*Document de synthèse — livrable `Docs/final_report`. Pour toute évolution du contrat, modifier d’abord `Docs/OBSERVABILITY.md` puis ce rapport si pertinent.*
