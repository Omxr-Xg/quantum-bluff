# Implémentation : Recharge Gratuite avec Cooldown Intelligent

## 🎯 Vue d'ensemble

Système de recharge de jetons gratuits avec cooldown de 4 heures pour éviter les abus tout en protégeant les joueurs qui n'auraient plus de jetons.

**Caractéristiques:**
- ✅ Recharge de **1000 jetons gratuits** quand disponible
- ✅ Cooldown de **4 heures** entre les recharges
- ✅ Seuil critique : disponible si solde < 200 jetons (optionnel)
- ✅ Logique côté **serveur** pour éviter les triches (timestamps)
- ✅ Historique complet dans le **portefeuille** (WalletLedgerEntry)
- ✅ Interface avec **countdown en temps réel**

## 📁 Fichiers créés/modifiés

### Backend (TypeScript/Express)
```
server/src/
├── freeRecharge/
│   ├── freeRecharge.types.ts         # Types et interfaces
│   ├── freeRecharge.service.ts       # Logique métier + transactions
│   └── freeRecharge.routes.ts        # Endpoints API
│
├── generated/prisma/
│   └── schema.prisma                 # Schéma Prisma (MODIFIÉ)
│
└── index.ts                          # Configuration serveur (MODIFIÉ)
```

### Frontend (React/TypeScript)
```
client/src/
├── utils/
│   └── freeRecharge.ts               # Appels API client
│
└── components/
    ├── FreeRechargeButton.tsx        # Composant bouton simple
    └── FreeRechargeModal.tsx         # Modal complète avec infos
```

## 🔧 Installation

### 1. Appliquer la migration Prisma

```bash
cd server
npx prisma migrate dev --name add_free_recharge
```

Cela créera la table `free_recharges` et ajoutera la relation dans la table `users`.

### 2. Reconstruire le serveur

```bash
cd server
npm run build
```

Cela regénérera les types Prisma et TypeScript.

## 🚀 API Endpoints

### GET `/api/free-recharge/status`
Récupère le statut de la recharge gratuite de l'utilisateur.

**Authentification:** ✅ Requise (JWT)

**Réponse:**
```json
{
  "canRecharge": true,
  "nextRechargeAt": null,
  "hoursUntilRecharge": null,
  "minutesUntilRecharge": null,
  "totalMinutesUntilRecharge": null,
  "lastRechargeAt": "2026-05-08T14:30:00.000Z",
  "message": "Recharge gratuite disponible"
}
```

### POST `/api/free-recharge/claim`
Effectue une recharge gratuite (si cooldown expiré).

**Authentification:** ✅ Requise (JWT)

**Réponse:**
```json
{
  "success": true,
  "newBalance": 2500,
  "addedAmount": 1000,
  "nextRechargeAt": "2026-05-08T18:30:00.000Z",
  "message": "Recharge de 1000 jetons effectuée avec succès!"
}
```

**Erreurs:**
- `401` : Non authentifié
- `404` : Utilisateur non trouvé
- `429` : Cooldown actif (Too Many Requests)
- `500` : Erreur serveur

## 🎨 Intégration Frontend

### Utiliser le bouton simple

```tsx
import { FreeRechargeButton } from '@/components/FreeRechargeButton'
import { useState } from 'react'

export function MyGame() {
  const [balance, setBalance] = useState(1500)

  return (
    <div>
      <p>Solde: {balance}</p>
      
      <FreeRechargeButton 
        onClaimed={(newBalance) => setBalance(newBalance)}
        showDetails={true}
      />
    </div>
  )
}
```

### Utiliser la modal complète

```tsx
import { FreeRechargeModal } from '@/components/FreeRechargeModal'
import { useState } from 'react'

export function MyLobby() {
  const [showRecharge, setShowRecharge] = useState(false)
  const [balance, setBalance] = useState(1500)

  return (
    <div>
      <button onClick={() => setShowRecharge(true)}>
        Voir la recharge de secours
      </button>

      <FreeRechargeModal
        open={showRecharge}
        onClose={() => setShowRecharge(false)}
        onClaimed={(newBalance) => setBalance(newBalance)}
      />
    </div>
  )
}
```

## 💡 Logique métier

### Quand est-ce que la recharge est disponible ?

La recharge est disponible si **une** de ces conditions est vraie :
1. L'utilisateur n'a **jamais** effectué de recharge gratuite
2. Le cooldown de **4 heures** est **expiré**

### Quand est-ce que la recharge est bloquée ?

La recharge est bloquée si :
1. L'utilisateur a une recharge en attente (cooldown actif)

### Transaction atomique

Lors du claim, une transaction Prisma garantit que :
1. ✅ Les jetons sont ajoutés à l'utilisateur
2. ✅ Une entrée WalletLedgerEntry est créée (raison: `FREE_RECHARGE`)
3. ✅ Le cooldown est défini (nextRechargeAfter)

**Tout ou rien** — en cas d'erreur, tout est rollback.

### Sécurité

- ✅ **Côté serveur** : tous les timestamps sont générés en BD, pas en client
- ✅ **Validation JWT** : requiert authentification valide
- ✅ **Rate limiting** : le cooldown de 4h empêche les abus
- ✅ **Historique complet** : chaque recharge est tracée

## 🧪 Tests manuels

### Test 1 : Première recharge
```bash
curl -X GET http://localhost:3000/api/free-recharge/status \
  -H "Authorization: Bearer YOUR_JWT"
# Doit retourner canRecharge: true

curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer YOUR_JWT"
# Doit retourner success: true + nextRechargeAt
```

### Test 2 : Cooldown actif
```bash
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer YOUR_JWT"
# Doit retourner 429 avec message "Cooldown actif"
```

### Test 3 : Vérifier l'historique
```bash
# En SQL PostgreSQL:
SELECT * FROM wallet_ledger_entries 
WHERE reason = 'FREE_RECHARGE' 
ORDER BY created_at DESC;
```

## 📊 Schema Prisma

```prisma
model FreeRecharge {
  id                  String   @id @default(uuid())
  userId              String   @unique
  lastRechargeAt      DateTime?
  nextRechargeAfter   DateTime?
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@index([userId])
  @@index([nextRechargeAfter])
  @@map("free_recharges")
}

model User {
  // ... champs existants ...
  freeRecharge          FreeRecharge?
}
```

## 🎯 Cas d'usage

### Scénario 1 : Joueur avec solde bas
```
1. Joueur entre dans le casino avec 50 jetons
2. Voit le bouton "Recharger maintenant" en doré
3. Clique → reçoit 1000 jetons (total: 1050)
4. Cooldown activé, bouton devient "Prochaine recharge dans 3h 59m"
5. Après 4 heures, le bouton devient à nouveau disponible
```

### Scénario 2 : Joueur qui abuse
```
1. Joueur gagne une première recharge
2. Immédiatement après, essaie de recharger à nouveau
3. Serveur rejette: "429 - Cooldown actif"
4. Doit attendre 4 heures
```

### Scénario 3 : Intégration avec daily login
```
- Daily login: récompense quotidienne (100-1000 jetons, peu fréquent)
- Free recharge: recharge de secours (1000 jetons, avec cooldown de 4h)
Les deux sont complémentaires et indépendants.
```

## 🔍 Debugging

### Le statut ne se met pas à jour
→ Vérifier que le client appelle `/api/free-recharge/status` toutes les 30 secondes

### Le bouton reste bloqué après 4 heures
→ Rafraîchir la page ou appeler manuellement `loadStatus()`

### Transaction échouée en BD
→ Vérifier les logs serveur (journalisation Pino)
→ S'assurer que la migration Prisma a bien été appliquée

### Les jetons ne sont pas ajoutés
→ Vérifier que l'utilisateur est bien authentifié (JWT valide)
→ Vérifier que le cooldown est bien expiré
→ Consulter les logs du serveur

## 📈 Monitoring

### Métriques à tracker
1. **Nombre de recharges gratuites par jour**
2. **Taux de réutilisation du cooldown** (combien de fois par joueur)
3. **Montant total distribué** (recharges × 1000)
4. **Rétention** (% de joueurs qui reviennent après une recharge)

### Query SQL pour les stats

```sql
-- Recharges des dernières 24h
SELECT COUNT(*) as total_recharges, SUM(amount) as total_tokens
FROM wallet_ledger_entries
WHERE reason = 'FREE_RECHARGE'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Utilisateurs ayant recharger
SELECT COUNT(DISTINCT user_id) as unique_users
FROM wallet_ledger_entries
WHERE reason = 'FREE_RECHARGE';

-- Historique des recharges d'un joueur
SELECT created_at, balance_before, balance_after
FROM wallet_ledger_entries
WHERE user_id = 'USER_ID' AND reason = 'FREE_RECHARGE'
ORDER BY created_at DESC;
```

## ✅ Checklist de validation

- [ ] Migration Prisma appliquée (`npx prisma migrate dev`)
- [ ] Serveur recompilé (`npm run build`)
- [ ] Types TypeScript générés
- [ ] Routes API testées (POST/GET)
- [ ] Composant FreeRechargeButton importé et utilisé
- [ ] Composant FreeRechargeModal disponible
- [ ] Cooldown de 4h fonctionne
- [ ] Historique WalletLedgerEntry créé
- [ ] Interface affiche countdown en temps réel
- [ ] Erreurs gérées correctement (429, 404, etc.)

## 🚨 Notes importantes

1. **Pas de seuil critique côté serveur** : actuellement, le bouton est disponible tout le temps (pas de vérification du solde). Si vous voulez restricter à solde < 200 jetons, modifier `freeRecharge.service.ts`.

2. **Cooldown universel** : tous les joueurs ont le même cooldown de 4 heures. Si vous voulez faire varier par niveau/rang, adapter le service.

3. **Pas de limite quotidienne** : un joueur peut faire 6 recharges par jour (4h × 6 = 24h). Si vous voulez limiter à 1 par jour, ajouter une vérification supplémentaire.

4. **WalletLedgerEntry** : chaque recharge crée une entrée traçable. C'est bon pour l'audit et les statistiques.

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs serveur (terminal où tourne `npm run dev:server`)
2. Vérifier la connexion à PostgreSQL
3. Vérifier que JWT est valide
4. Consulter les erreurs dans la console navigateur (F12)
