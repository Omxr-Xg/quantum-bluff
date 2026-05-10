# Guide de Test : Recharge Gratuite avec Cooldown

## ✅ Tests à effectuer après le déploiement

### Phase 1 : Vérification de la migration Prisma

```bash
# 1. Appliquer la migration
cd server
npx prisma migrate deploy

# 2. Vérifier que la table a été créée
npx prisma db execute --stdin <<EOF
SELECT * FROM free_recharges LIMIT 1;
EOF

# Résultat attendu: 0 lignes (la table existe mais est vide)
```

### Phase 2 : Vérification du compilage

```bash
# 1. Recompiler le serveur
cd server
npm run build

# Résultat attendu: ✅ Pas d'erreurs TypeScript

# 2. Vérifier les types Prisma
ls -la src/generated/prisma/
# Doit contenir: client.d.ts, client.js, etc.
```

### Phase 3 : Test des endpoints API (cURL)

#### Test 3.1 : Vérifier le statut initial

```bash
# S'identifier d'abord
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}' \
  | jq -r '.token')

# Récupérer le statut
curl -X GET http://localhost:3000/api/free-recharge/status \
  -H "Authorization: Bearer $TOKEN"

# Résultat attendu:
# {
#   "canRecharge": true,
#   "nextRechargeAt": null,
#   "hoursUntilRecharge": null,
#   "minutesUntilRecharge": null,
#   "totalMinutesUntilRecharge": null,
#   "lastRechargeAt": null,
#   "message": "Recharge gratuite disponible"
# }
```

#### Test 3.2 : Effectuer une recharge

```bash
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Résultat attendu:
# {
#   "success": true,
#   "newBalance": <balance_before + 1000>,
#   "addedAmount": 1000,
#   "nextRechargeAt": "2026-05-08T19:XX:XX.000Z",
#   "message": "Recharge de 1000 jetons effectuée avec succès!"
# }
```

#### Test 3.3 : Vérifier le cooldown

```bash
# Immédiatement après la recharge précédente:
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Résultat attendu:
# HTTP 429 Too Many Requests
# {
#   "error": "Recharge indisponible pendant Xh Ym",
#   "code": "COOLDOWN_ACTIVE"
# }
```

#### Test 3.4 : Vérifier le statut après recharge

```bash
curl -X GET http://localhost:3000/api/free-recharge/status \
  -H "Authorization: Bearer $TOKEN"

# Résultat attendu:
# {
#   "canRecharge": false,
#   "nextRechargeAt": "2026-05-08T19:XX:XX.000Z",
#   "hoursUntilRecharge": 3,
#   "minutesUntilRecharge": 59,
#   "totalMinutesUntilRecharge": 239,
#   "lastRechargeAt": "2026-05-08T15:XX:XX.000Z",
#   "message": "Prochaine recharge dans 3h 59m"
# }
```

### Phase 4 : Vérification de l'historique (BD)

```bash
# Connectez-vous à PostgreSQL
psql -h localhost -U postgres -d quantum_bluff

# Vérifier les entrées WalletLedgerEntry
SELECT id, user_id, amount, reason, balance_before, balance_after, created_at
FROM wallet_ledger_entries
WHERE reason = 'FREE_RECHARGE'
ORDER BY created_at DESC
LIMIT 5;

# Résultat attendu:
# - Chaque recharge doit créer 1 entrée
# - reason = 'FREE_RECHARGE'
# - amount = 1000
# - balance_after = balance_before + 1000

# Vérifier la table FreeRecharge
SELECT id, user_id, last_recharge_at, next_recharge_after, created_at
FROM free_recharges
WHERE user_id = 'USER_ID';

# Résultat attendu:
# - 1 ligne par utilisateur qui a rechargé
# - next_recharge_after = NOW() + 4 heures
```

### Phase 5 : Tests Frontend

#### Test 5.1 : Composant FreeRechargeButton

1. Créer une page de test :

```tsx
// pages/test-free-recharge.tsx
import { FreeRechargeButton } from '@/components/FreeRechargeButton'
import { useState } from 'react'

export default function TestPage() {
  const [balance, setBalance] = useState(1500)

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl mb-4">Test Recharge Gratuite</h1>
      <p className="mb-4">Balance: <strong>{balance}</strong> jetons</p>
      
      <div className="max-w-sm">
        <FreeRechargeButton 
          onClaimed={(newBalance) => {
            setBalance(newBalance)
            console.log('Recharge effectuée! Nouveau solde:', newBalance)
          }}
          showDetails={true}
        />
      </div>
    </div>
  )
}
```

2. Accéder à http://localhost:5173/test-free-recharge

3. Vérifier:
   - ✅ Le bouton s'affiche correctement
   - ✅ Cliquer le bouton recharge les jetons
   - ✅ Le solde se met à jour
   - ✅ Le bouton devient "Prochaine recharge dans X h Y m"
   - ✅ Le compteur se met à jour chaque seconde

#### Test 5.2 : Composant FreeRechargeModal

```tsx
// pages/test-modal.tsx
import { FreeRechargeModal } from '@/components/FreeRechargeModal'
import { useState } from 'react'

export default function TestModal() {
  const [showModal, setShowModal] = useState(false)
  const [balance, setBalance] = useState(1500)

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl mb-4">Test Modal Recharge</h1>
      <p className="mb-4">Balance: {balance}</p>
      
      <button 
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-amber-600 rounded"
      >
        Ouvrir Modal
      </button>

      <FreeRechargeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onClaimed={(newBalance) => setBalance(newBalance)}
      />
    </div>
  )
}
```

3. Vérifier:
   - ✅ La modal s'ouvre
   - ✅ Affiche le bouton ou le compteur selon l'état
   - ✅ Cliquer le bouton recharge
   - ✅ Fermer la modal fonctionne
   - ✅ Le compteur met à jour en temps réel

### Phase 6 : Tests de comportement edge-case

#### Test 6.1 : Plusieurs utilisateurs

```bash
# Créer 2 utilisateurs
USER1_TOKEN=$(curl ... | jq -r '.token')
USER2_TOKEN=$(curl ... | jq -r '.token')

# USER1 recharge
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $USER1_TOKEN" ...

# USER2 peut quand même recharger (cooldown par utilisateur)
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $USER2_TOKEN" ...

# Résultat attendu: ✅ USER2 réussit, USER1 échoue
```

#### Test 6.2 : Expiration du cooldown

```bash
# Attendre 4 heures... ou modifier le cooldown à 1 minute pour test rapide

# Après expiration:
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $TOKEN" ...

# Résultat attendu: ✅ Succès, nouvelle recharge effectuée
```

#### Test 6.3 : Utilisateur non authentifié

```bash
curl -X GET http://localhost:3000/api/free-recharge/status

# Résultat attendu:
# HTTP 401 Unauthorized
# { "error": "Non authentifié" }
```

### Phase 7 : Test de performance

```bash
# Générer 100 recharges simultanées (stress test)
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/free-recharge/claim \
    -H "Authorization: Bearer $TOKEN" \
    -d '{}' &
done
wait

# Vérifier:
# - Pas d'erreur 500
# - Les jetons sont cohérents en base
# - Les entrées WalletLedgerEntry sont créées
```

### Phase 8 : Test d'intégration avec DailyLogin

```bash
# Recharger gratuitement
curl -X POST http://localhost:3000/api/free-recharge/claim \
  -H "Authorization: Bearer $TOKEN"

# Réclamer daily login bonus
curl -X POST http://localhost:3000/api/daily-login/claim \
  -H "Authorization: Bearer $TOKEN"

# Vérifier que les deux contributions s'additionnent
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.chips'

# Résultat attendu: 
# balance_initial + 1000 (free recharge) + X (daily login)
```

## 📊 Métriques à vérifier

| Métrique | Attendu | Comment vérifier |
|----------|---------|-------------------|
| Temps réponse GET /status | < 100ms | `curl -w @curl-format.txt` |
| Temps réponse POST /claim | < 500ms | `curl -w @curl-format.txt` |
| Nombre d'entrées WalletLedgerEntry | 1 par recharge | `SELECT COUNT(*) ... WHERE reason='FREE_RECHARGE'` |
| Cohérence du solde | balance_before + 1000 = balance_after | SELECT dans wallet_ledger_entries |
| Temps du cooldown | Exactement 4h | Vérifier `next_recharge_after` |

## 🐛 Debugging

### Si le bouton n'apparaît pas

```tsx
// Vérifier dans la console du navigateur (F12)
console.log('[FreeRechargeButton] Rendering')

// Vérifier la réponse API
fetch('/api/free-recharge/status')
  .then(r => r.json())
  .then(d => console.log('Status:', d))
```

### Si le cooldown ne fonctionne pas

```bash
# Vérifier en base de données
SELECT next_recharge_after FROM free_recharges WHERE user_id = 'USER_ID';

# Vérifier que c'est bien 4 heures dans le futur
SELECT next_recharge_after - NOW() AS time_remaining FROM free_recharges;
```

### Si les jetons ne s'ajoutent pas

```bash
# Vérifier la transaction:
SELECT * FROM wallet_ledger_entries WHERE user_id = 'USER_ID' ORDER BY created_at DESC LIMIT 1;

# Vérifier le solde utilisateur:
SELECT chips FROM "User" WHERE id = 'USER_ID';

# Vérifier que balance_after = chips:
SELECT balance_after FROM wallet_ledger_entries WHERE reason = 'FREE_RECHARGE' LIMIT 1;
```

## ✅ Checklist finale

- [ ] Migration Prisma appliquée avec succès
- [ ] Types TypeScript générés (`npx prisma generate`)
- [ ] Serveur compile sans erreurs
- [ ] GET /api/free-recharge/status retourne le bon format
- [ ] POST /api/free-recharge/claim fonctionne
- [ ] Cooldown de 4h respecté
- [ ] Historique WalletLedgerEntry créé
- [ ] FreeRechargeButton affiche correctement
- [ ] FreeRechargeModal ouvrable et fermable
- [ ] Compteur se met à jour chaque seconde
- [ ] Plusieurs utilisateurs indépendants
- [ ] Pas d'erreur 500
- [ ] Performance acceptable (< 1s pour les recharges)
- [ ] Intégration avec DailyLogin OK
- [ ] Tests d'edge-case passent

