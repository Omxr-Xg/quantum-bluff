# 🎮 Intégrer le bouton dans le Lobby (Step by Step)

## Étape 1️⃣ : Ajouter l'import

Ouvrir le fichier: `client/src/pages/Lobby.tsx`

**À la ligne ~30**, ajouter après les autres imports:

```tsx
import { DailyChallenges } from "../components/DailyChallenges";
import { TournamentWidget } from '../components/TournamentWidget';
import { getAuthItem } from "../utils/authStorage";
// 🆕 AJOUTER CETTE LIGNE:
import { FreeRechargeButton } from '../components/FreeRechargeButton';
```

---

## Étape 2️⃣ : Ajouter la gestion de l'état

À la ligne ~123 où vous trouvez `const [balance, setBalance]`:

```tsx
const [balance, setBalance] = useState<number>(getUserBalance());
// 🆕 AJOUTER CES LIGNES (juste après):
const [rechargeUpdated, setRechargeUpdated] = useState(false);

const handleRecharge = (newBalance: number) => {
  setBalance(newBalance);
  setRechargeUpdated(true);
  setTimeout(() => setRechargeUpdated(false), 2000); // Message de succès pendant 2s
};
```

---

## Étape 3️⃣ : Ajouter le composant au rendu

C'est l'étape importante. Vous devez trouver **où afficher le solde du joueur** dans le JSX.

Regardez autour de la ligne 400-600 du fichier, cherchez quelque chose comme:

```tsx
// Vous cherchez quelque chose qui ressemble à:
<div className="...player-info...">
  <p>Solde: {balance}</p>
  {/* ou */}
  <ChipStack />
  <span>{balance}</span>
</div>
```

Une fois trouvé, **ajouter le bouton juste après le solde**:

```tsx
{/* Affichage du solde existant */}
<div className="balance-display">
  <p>Solde: <strong>{balance}</strong> jetons</p>
</div>

{/* 🆕 AJOUTER LE BOUTON ICI: */}
<div className="mt-4 max-w-sm mx-auto">
  <FreeRechargeButton 
    onClaimed={handleRecharge}
    showDetails={true}
  />
</div>

{/* Message de succès optionnel */}
{rechargeUpdated && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="mt-2 text-center text-green-400 text-sm font-bold"
  >
    ✅ Recharge effectuée!
  </motion.div>
)}
```

---

## Alternative : Si vous trouvez pas facilement

Utilisez cette **recherche rapide** dans votre éditeur:

1. Ouvrir `Lobby.tsx`
2. Appuyer sur `Ctrl+F` (Cmd+F sur Mac)
3. Chercher: `PlayerDashboard` ou `balance` ou `chips`
4. Cela vous montrera où s'affiche les informations du joueur

---

## ✅ Pour tester immédiatement

Une fois modifié:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend (il va recharger automatiquement)
cd client
npm run dev

# Ouvrir http://localhost:5173
```

Vous devriez voir:

1. ✅ Le Lobby s'ouvre
2. ✅ Votre solde s'affiche
3. ✅ **Le bouton doré "Recharger maintenant" s'affiche juste en dessous** 🎉
4. ✅ Cliquer le bouton → +1000 jetons
5. ✅ Le bouton devient "Prochaine recharge dans 3h 59m"

---

## 🎬 Vidéo du workflow

```
1. Lancer le jeu
   ↓
2. Aller au Lobby
   ↓
3. Voir le bouton doré animé
   ↓
4. Cliquer
   ↓
5. +1000 jetons! ✨
   ↓
6. Cooldown activé → voir le compteur
   ↓
7. Attendre 4h (ou 3 min si vous avez modifié les constantes)
   ↓
8. Pouvoir recharger à nouveau
```

---

## 🔧 Si ça ne marche pas

### Erreur: "Cannot find module 'FreeRechargeButton'"

→ Vérifier que le fichier existe: `client/src/components/FreeRechargeButton.tsx`

### Le bouton ne s'affiche pas

→ Vérifier que vous l'avez ajouté au bon endroit (dans le JSX du Lobby, pas juste dans l'import)

### Le bouton s'affiche mais ne fonctionne pas

→ Vérifier que:
- Le backend tourne (`npm run dev:server`)
- Vous êtes authentifié (avoir un JWT valide)
- Ouvrir la console (F12) pour voir les erreurs

### Voir les logs

Ouvrir la console du navigateur (F12):
- **Console** → pour voir les erreurs
- **Network** → pour voir l'appel API à `/api/free-recharge/claim`
- **Application → Local Storage** → vérifier le token JWT

---

## 📍 Localisation du Lobby

Si vous avez vraiment du mal à trouver, voici les fichiers connexes:

```
client/src/
├── pages/Lobby.tsx                    ← MODIFIER ICI
├── components/PlayerDashboard.tsx     ← Peut afficher le solde aussi
├── components/TopBar.tsx              ← Peut afficher le solde aussi
└── hooks/useUser.ts                   ← Gère les données utilisateur
```

Cherchez l'un de ces fichiers pour voir où le solde s'affiche.

---

## 💡 Conseil Pro

Si le Lobby est compliqué à modifier, vous pouvez aussi:

1. **Option A:** Ajouter le bouton dans la **TopBar/HeaderBar** (en haut)
   - Plus simple, visible partout dans le jeu

2. **Option B:** Ajouter le bouton dans le **Profile** (`Profile.tsx`)
   - Moins visible mais plus propre

3. **Option C:** Ajouter une **Modal** accessible via un menu
   - Plus discret

Choisissez ce qui vous convient!

