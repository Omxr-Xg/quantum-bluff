# Render / Prisma P3009 — migration belote en échec

Si le déploiement affiche :

```text
The `20260531170000_belote_join_requests_user_id_index` migration ... failed
```

## 1. Supabase SQL Editor (indexes belote)

```sql
CREATE INDEX IF NOT EXISTS "belote_join_requests_userId_idx" ON "belote_join_requests"("userId");
CREATE INDEX IF NOT EXISTS "belote_room_invitations_senderId_idx" ON "belote_room_invitations"("senderId");
CREATE INDEX IF NOT EXISTS "belote_room_seats_userId_idx" ON "belote_room_seats"("userId");
```

(Ne rien exécuter si les tables belote n’existent pas encore — laisser `migrate deploy` créer `20260603120000_belote_v1` d’abord.)

## 2. Marquer la migration ratée (une fois, en local avec `DIRECT_URL` prod)

```bash
cd server
npx prisma migrate resolve --rolled-back 20260531170000_belote_join_requests_user_id_index
```

Si les migrations `20260531180000_*` ou `20260531190000_*` sont aussi en échec :

```bash
npx prisma migrate resolve --rolled-back 20260531180000_belote_room_invitations_sender_id_index
npx prisma migrate resolve --rolled-back 20260531190000_belote_room_seats_user_id_index
```

## 3. Redéployer le backend

Les dossiers `2026053117/18/19*` sont des no-op ; `20260605150000_belote_fk_indexes` crée les index après `belote_v1`.

## 4. `DIRECT_URL` sur Render

Définir **`DIRECT_URL`** (Supabase port **5432**, pas le pooler **6543**) pour `migrate deploy` et le script RLS.
