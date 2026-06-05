# Consommation Redis (Upstash) — audit, métriques, optimisations

Quota cible : **500 000 commandes / mois**. Approche **pilotée par métriques** (`redis_commands_total`, `redis_monthly_projection`).

---

## 1. Vérifier les instances Render

1. [Render Dashboard](https://dashboard.render.com) → service **backend** (API).
2. **Scaling** → nombre d’instances.
3. Variables d’environnement :

| Instances | Configuration |
|-----------|----------------|
| **1** (recommandé quota) | `INSTANCE_COUNT=1`, `SOCKET_IO_REDIS_ADAPTER=false` |
| **2+** | `INSTANCE_COUNT=N`, `SOCKET_IO_REDIS_ADAPTER=true` |

Log au boot :

```json
{ "msg": "backend_scaling_config", "instanceCount": 1, "socketIoRedisAdapter": false }
```

Log chaque minute : `redis_usage_window` avec `topFeatures` et `monthlyProjection`.

---

## 2. Métriques Prometheus (Phase 0)

| Métrique | Description |
|----------|-------------|
| `redis_commands_total{feature, command}` | Compteur par fonctionnalité |
| `redis_commands_per_minute` | Volume dernière minute |
| `redis_monthly_projection` | `cmd/min × 43200` (30 j) |
| `redis_adapter_up` | 1 = adaptateur Socket.IO Redis actif |

```bash
curl -sS -H "Authorization: Bearer $METRICS_BEARER_TOKEN" \
  https://api.quantum-bluff.com/metrics | grep -E '^redis_'
```

```promql
topk(10, sum by (feature) (rate(redis_commands_total[5m])))
```

### Features instrumentées

| `feature` | Rôle |
|-----------|------|
| `socket_io_adapter` | Pub/sub Socket.IO (≈0 si adapter off) |
| `presence` | Présence / activité |
| `poker_state` | `poker:runtime:*` |
| `poker_lock` | Verrous (0 si mono-instance) |
| `blackjack_state` | Tables BJ |
| `rate_limit` | Rate limit (0 si mono-instance) |
| `casino_idempotency` | Idempotence casino |
| `http_idempotency` | Header `X-Idempotency-Key` |
| `jwt_blacklist` | JWT révoqués |
| `core` | Legacy `game:*` (si activé), action logs distribués |

**Vocal** : aucun Redis sous `server/src/voice/` — test `voice.noRedis.test.ts`.

---

## 3. Classement des consommateurs (audit code)

| Rang | Source | Optimisation appliquée |
|------|--------|------------------------|
| 1 | Socket.IO Redis adapter | `SOCKET_IO_REDIS_ADAPTER=false` si 1 instance |
| 2 | Présence liste amis (2×N) | `getPresenceBatch` + pipeline |
| 3 | Poker double écriture | `PERSIST_LEGACY_GAME_KEYS=false` (défaut), debounce `POKER_STATE_REDIS_DEBOUNCE_MS` |
| 4 | Rate limit Redis | Store mémoire si `INSTANCE_COUNT=1` |
| 5 | Blackjack Redis | Option `BLACKJACK_STATE_STORE=memory` |
| 6 | Locks poker Redis | Mémoire locale si mono-instance |
| 7 | Présence socket | Mémoire-first + TTL Redis |
| 8 | Idempotency / JWT | Cache mémoire, GET évité si entrée connue |
| 9 | `KEYS` poker/game | Index `SET` (`poker:runtime:index`, `game:index`) |
| 10 | Action log poker | Mémoire seule si mono-instance |

---

## 4. Variables d’environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `INSTANCE_COUNT` | `1` | Nb instances backend |
| `SOCKET_IO_REDIS_ADAPTER` | `false` si count=1 | Adaptateur Socket.IO |
| `PERSIST_LEGACY_GAME_KEYS` | `false` | Clés `game:*` legacy |
| `POKER_STATE_REDIS_DEBOUNCE_MS` | `800` | Debounce écritures poker runtime |
| `PRESENCE_REDIS_TTL_SEC` | `900` | TTL présence Redis |
| `VOICE_SOCIAL_CACHE_TTL_MS` | `300000` | Cache amis/blocages voix (5 min) |
| `JWT_BLACKLIST_MISS_CACHE_SEC` | `60` | Cache négatif blacklist |
| `USER_PROFILE_CACHE_TTL_MS` | `300000` | Cache profils (appels, etc.) |
| `BLACKJACK_STATE_STORE` | `redis` si Redis configuré | `memory` pour 0 cmd BJ |
| `POKER_STATE_STORE` | `redis` si Redis configuré | `memory` possible |

**Render mono-instance (recommandé) :**

```env
INSTANCE_COUNT=1
SOCKET_IO_REDIS_ADAPTER=false
PERSIST_LEGACY_GAME_KEYS=false
```

---

## 5. Estimation gain (ordre de grandeur)

| Scénario | Cmd / mois (estimé) |
|----------|---------------------|
| 1 instance, adapter **ON**, pas d’optim | 60–120 M+ |
| 1 instance, adapter **OFF** + phases 0–1 | −70 à −90 % sur le total |
| + phases 2–5 (legacy off, debounce, batch, RL mémoire) | Cible **< 100k–300k** selon trafic |

### Procédure avant / après

1. **Avant** : noter `redis_monthly_projection` et `topFeatures` (logs ou `/metrics`).
2. Déployer avec variables ci-dessus.
3. **24–48 h** de trafic représentatif (lobby, amis, 1 table, appel vocal).
4. **Après** : même relevé → calculer `%` de baisse par `feature`.

| Optimisation | Gain typique sur son poste |
|--------------|----------------------------|
| Adapter OFF | −70 à −90 % **total** |
| Batch présence amis | −80 % sur route amis |
| Legacy `game:*` off + debounce poker | −50 à −70 % écritures poker |
| Rate limit + locks mémoire (1 inst.) | −100 % sur ces features |
| `KEYS` → index | Pics boot/recovery réduits |

---

## 6. Runbook Upstash

- Alerte dashboard Upstash à **70 %** du quota mensuel.
- Si dépassement : vérifier `redis_usage_window` → désactiver adapter, confirmer `INSTANCE_COUNT=1`, activer `BLACKJACK_STATE_STORE=memory` si BJ charge.
- Multi-instance obligatoire : garder adapter + `distributedRedis`, optimiser emits Socket.IO (rooms ciblées).

---

## 7. Phases implémentées

- **Phase 0** : métriques, adapter conditionnel, instrumentation.
- **Phase 1** : présence mémoire-first, batch amis, vocal sans Redis.
- **Phase 2** : legacy off, debounce poker, index SET, action log mémoire mono-instance.
- **Phase 3** : TTL cache voix/profils, cache négatif JWT.
- **Phase 4–5** : locks poker + rate limit mémoire si 1 instance ; idempotency évite GET si mémoire.

Voir aussi [`SCALING.md`](SCALING.md), [`VOIX_APPELS_ET_SON.md`](VOIX_APPELS_ET_SON.md) (vocal = mémoire serveur).
