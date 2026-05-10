# ⚡ Guide Rapide de Test dans le Jeu

## 🚀 Lancer le jeu avec la recharge

### Étape 1: Ouvrir 2 terminaux

**Terminal 1 - Backend:**
```bash
cd C:\Users\Chouban\Documents\L3\S6\projet_integrateur\Azra\quantum-bluff\server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd C:\Users\Chouban\Documents\L3\S6\projet_integrateur\Azra\quantum-bluff\client
npm run dev
```

✅ Attendre que les deux disent "Server running" et "VITE v..."

---

## 🎮 Ajouter le bouton au Lobby

### Étape 2: Modifier le fichier Lobby

**Fichier:** `client/src/pages/Lobby.tsx`

**Chercher dans le fichier (Ctrl+F):** `const [balance, setBalance]`

Vous verrez quelque chose comme:
```tsx
const [balance, setBalance] = useState<number>(getUserBalance());
```

**Juste après cette ligne, ajouter:**
```tsx
const [rechargeKey, setRechargeKey] = useState(0);

const handleRechargeSuccess = (newBalance: number) => {
  setBalance(newBalance);
  setRechargeKey(prev => prev + 1);
};
```

---

### Étape 3: Ajouter l'import

**Chercher dans le fichier (Ctrl+F):** `import { DailyChallenges }`

Vous verrez:
```tsx
import { DailyChallenges } from "../components/DailyChallenges";
import { TournamentWidget } from '../components/TournamentWidget';
```

**Juste après, ajouter:**
```tsx
import { FreeRechargeButton } from '../components/FreeRechargeButton';
```

---

### Étape 4: Ajouter le bouton au JSX

**Chercher dans le fichier (Ctrl+F):** `return (` et cherchez le premier `<div className`

Puis cherchez où s'affiche le solde du joueur (chercher `balance` dans le rendu JSX).

**Vous verrez quelque chose comme:**
```tsx
<p>Solde: {balance}</p>
// ou
<span className="balance">{balance}</span>
// ou
<ChipStack balance={balance} />
```

**Juste après cet affichage, ajouter:**
```tsx
<FreeRechargeButton
  key={rechargeKey}
  onClaimed={handleRechargeSuccess}
  showDetails={true}
/>
```

---

## ✅ Tester

### Rafraîchir la page

Après les modifications, le frontend va **auto-recharger** (vous verrez "⚡ hmr update").

Allez sur http://localhost:5173 et testez!

---

## 🎬 Ce que vous devriez voir

### Avant de cliquer
```
┌─────────────────────────────┐
│  Lobby de Poker             │
├─────────────────────────────┤
│  Username: votreNom         │
│  Solde: 1500 jetons         │
│                             │
│  ┌─────────────────────┐    │
│  │ 🟡 Recharger...    │    │  ← BOUTON DORÉ
│  │   maintenant       │    │
│  │   + 1000           │    │
│  └─────────────────────┘    │
│                             │
│  Salles disponibles:        │
│  • Poker Texas Hold'em      │
│  • Blackjack               │
└─────────────────────────────┘
```

### Après avoir cliqué
```
┌─────────────────────────────┐
│  Lobby de Poker             │
├─────────────────────────────┤
│  Username: votreNom         │
│  Solde: 2500 jetons ✨      │  ← Solde augmenté!
│                             │
│  ┌─────────────────────┐    │
│  │ ⏰ Prochaine       │    │  ← COMPTEUR
│  │    recharge       │    │
│  │    dans 3h 59m    │    │
│  └─────────────────────┘    │
│                             │
│  Salles disponibles:        │
│  • Poker Texas Hold'em      │
│  • Blackjack               │
└─────────────────────────────┘
```

---

## 🧪 Tester les différents cas

### Cas 1: Première recharge ✅
1. Ouvrir le jeu
2. Voir le bouton "Recharger maintenant"
3. Cliquer
4. ✅ Solde passe de 1500 → 2500
5. ✅ Bouton devient "Prochaine recharge dans 3h 59m"
6. ✅ Voir "✅ Recharge de 1000 jetons effectuée avec succès!" dans la console

### Cas 2: Cooldown actif ❌
1. Immédiatement après, cliquer à nouveau
2. ❌ Le bouton est grisé (désactivé)
3. ✅ Voir le message "Prochaine recharge dans 3h 59m"

### Cas 3: Compte à rebours en temps réel ⏱️
1. Regarder le compteur
2. ✅ Les minutes diminuent chaque seconde
3. ✅ Les heures changent quand minutes passent de 59 → 0

### Cas 4: Rafraîchir la page 🔄
1. Recharger
2. Cliquer le bouton
3. Rafraîchir la page (F5)
4. ✅ Le bouton montre toujours "Prochaine recharge dans..."
5. ✅ Le compteur s'affiche correctement

---

## 🔍 Debugger si ça ne marche pas

### Ouvrir la console du navigateur (F12)

#### Cas 1: Erreur d'import
```
Uncaught SyntaxError: Cannot find module 'FreeRechargeButton'
```
→ Vérifier que le fichier existe: `client/src/components/FreeRechargeButton.tsx`

#### Cas 2: Le bouton ne s'affiche pas
→ Ouvrir F12 → Console → chercher les erreurs rouges
→ Vérifier que vous avez modifié le bon endroit du Lobby

#### Cas 3: Le bouton s'affiche mais ne fonctionne pas
→ F12 → Network → chercher `/api/free-recharge/claim`
→ Vérifier la réponse (Status 200 = succès, 429 = cooldown, 401 = auth)

---

## ⏱️ Temps nécessaire

```
Modifier Lobby.tsx .............. 5 minutes
Teste dans navigateur ........... 2 minutes
Cliquer et voir résultat ........ 30 secondes
─────────────────────────────────
Total ........................... ~10 minutes
```

---

## 🎯 Checklist finale

- [ ] Terminal 1: Backend lancé (`npm run dev` dans server/)
- [ ] Terminal 2: Frontend lancé (`npm run dev` dans client/)
- [ ] Fichier Lobby.tsx modifié (import + state + JSX)
- [ ] Page recharge automatiquement dans le navigateur
- [ ] Bouton visible en doré juste sous le solde
- [ ] Cliquer le bouton → solde augmente de 1000
- [ ] Bouton devient "Prochaine recharge dans X h Ym"
- [ ] Console navigate pas d'erreur (F12 → Console)
- [ ] Cooldown empêche les clics répétés
- [ ] Compteur se met à jour chaque seconde

---

## 💡 Si vous avez vraiment du mal

Dites-moi juste:
1. Avez-vous trouvé la ligne `const [balance, setBalance]` ?
2. Avez-vous trouvé où s'affiche le solde dans le JSX ?
3. Quels sont les messages d'erreur (F12 → Console) ?

Je peux adapter les instructions! 😊

