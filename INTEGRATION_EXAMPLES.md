# Exemples d'intégration : Recharge Gratuite

## 🎯 Où intégrer le composant ?

Le bouton de recharge peut être intégré dans plusieurs endroits :

### Option 1 : Dans le Lobby (Panel latéral) ⭐ **RECOMMANDÉ**

Afficher le bouton dans le panel latéral du lobby, à côté du solde de jetons.

**Fichier à modifier:** `client/src/pages/Lobby.tsx` (ou équivalent)

```tsx
import { FreeRechargeButton } from '@/components/FreeRechargeButton'
import { useState } from 'react'

export function Lobby() {
  const [userBalance, setUserBalance] = useState(1500)

  return (
    <div className="lobby-container">
      {/* En-tête avec solde */}
      <div className="player-header">
        <div className="balance-display">
          <ChipIcon className="w-6 h-6" />
          <span className="text-2xl font-bold">{userBalance} jetons</span>
        </div>

        {/* 🆕 AJOUTER ICI */}
        <FreeRechargeButton 
          onClaimed={(newBalance) => setUserBalance(newBalance)}
          className="w-full mt-4"
          showDetails={true}
        />
      </div>

      {/* Reste du lobby... */}
    </div>
  )
}
```

---

### Option 2 : Dans le profil utilisateur

Afficher le bouton dans la section "Portefeuille" du profil.

**Fichier à modifier:** `client/src/pages/Profile.tsx`

```tsx
import { FreeRechargeButton } from '@/components/FreeRechargeButton'

export function ProfilePage() {
  const [balance, setBalance] = useState(...)

  return (
    <div className="profile-container">
      <section className="wallet-section">
        <h2>Portefeuille</h2>
        
        <div className="balance-info">
          <p>Solde actuel: <strong>{balance}</strong> jetons</p>
        </div>

        {/* 🆕 AJOUTER ICI */}
        <FreeRechargeButton 
          onClaimed={(newBalance) => setBalance(newBalance)}
          className="mt-4"
          showDetails={true}
        />

        <div className="wallet-history">
          {/* Historique des transactions */}
        </div>
      </section>
    </div>
  )
}
```

---

### Option 3 : Modal indépendante (avec bouton d'accès)

Créer un bouton "Recharge de secours" qui ouvre une modal détaillée.

**Fichier à modifier:** `client/src/pages/Lobby.tsx`

```tsx
import { FreeRechargeModal } from '@/components/FreeRechargeModal'
import { useState } from 'react'
import { Zap } from 'lucide-react'

export function Lobby() {
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [balance, setBalance] = useState(1500)

  return (
    <div className="lobby-container">
      {/* Bouton pour ouvrir la modal */}
      <button
        onClick={() => setShowRechargeModal(true)}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold flex items-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Recharge de secours
      </button>

      {/* 🆕 AJOUTER ICI */}
      <FreeRechargeModal
        open={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onClaimed={(newBalance) => setBalance(newBalance)}
      />

      {/* Reste du lobby... */}
    </div>
  )
}
```

---

### Option 4 : Dans la barre d'accueil supérieure

Afficher un petit badge avec le statut du cooldown dans la barre du haut.

**Fichier à modifier:** `client/src/components/Header.tsx`

```tsx
import { FreeRechargeButton } from '@/components/FreeRechargeButton'

export function Header() {
  const [balance, setBalance] = useState(...)

  return (
    <header className="top-navigation">
      <div className="flex items-center justify-between">
        <div>Logo</div>

        {/* 🆕 AJOUTER ICI - Petit bouton compact */}
        <div className="flex-1 max-w-sm">
          <FreeRechargeButton 
            onClaimed={(newBalance) => setBalance(newBalance)}
            showDetails={false}
          />
        </div>

        <div>Menu utilisateur</div>
      </div>
    </header>
  )
}
```

---

## 💡 Patterns de gestion d'état

### Pattern 1 : Remonter l'état au parent

```tsx
// Dans le composant parent (Lobby.tsx)
const [userBalance, setUserBalance] = useState(0)

// Passer setUserBalance au composant
<FreeRechargeButton 
  onClaimed={(newBalance) => setUserBalance(newBalance)}
/>

// Le composant met à jour le parent quand la recharge est faite
```

### Pattern 2 : Utiliser un Context (meilleur pour les apps grandes)

```tsx
// contexts/UserContext.tsx
import { createContext, useContext, useState } from 'react'

const UserContext = createContext<{
  balance: number
  setBalance: (b: number) => void
}>({ balance: 0, setBalance: () => {} })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }) {
  const [balance, setBalance] = useState(0)
  return (
    <UserContext.Provider value={{ balance, setBalance }}>
      {children}
    </UserContext.Provider>
  )
}

// Dans le composant
const { balance, setBalance } = useUser()
<FreeRechargeButton onClaimed={setBalance} />
```

### Pattern 3 : Avec Socket.io (pour sync temps réel)

```tsx
import { useEffect } from 'react'
import { socket } from '@/utils/socket'

export function Lobby() {
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    // Écouter les mises à jour du serveur
    socket.on('user:balance-updated', (newBalance) => {
      setBalance(newBalance)
    })

    return () => socket.off('user:balance-updated')
  }, [])

  return (
    <FreeRechargeButton 
      onClaimed={(newBalance) => {
        setBalance(newBalance)
        // Le serveur peut aussi envoyer un event socket si besoin
      }}
    />
  )
}
```

---

## 🎨 Personnalisation visuelle

### Changer les couleurs

```tsx
<FreeRechargeButton
  className="max-w-sm mx-auto"
  onClaimed={handleClaimed}
/>

// Ou modifier le composant pour accepter des props:
// Éditer FreeRechargeButton.tsx et ajouter:
// type FreeRechargeButtonProps = {
//   buttonColor?: string  // "amber" | "gold" | "yellow"
//   ...
// }
```

### Intégrer avec le thème existant

```tsx
// Si le projet utilise next-themes ou un provider de thème:
import { useTheme } from 'next-themes'

export function FreeRechargeButton() {
  const { theme } = useTheme()
  
  return (
    <button className={`
      ${theme === 'dark' ? 'bg-amber-600' : 'bg-amber-500'}
      ...
    `}>
      Recharger
    </button>
  )
}
```

---

## 🔗 Intégration avec DailyLoginModal

Les deux systèmes sont **indépendants mais complémentaires** :

```tsx
// Dans le Lobby ou une page centrale
export function MainHub() {
  const [balance, setBalance] = useState(1500)
  const [showDailyLogin, setShowDailyLogin] = useState(false)
  const [showFreeRecharge, setShowFreeRecharge] = useState(false)

  return (
    <>
      {/* Daily Login - récompense quotidienne */}
      <DailyLoginModal
        open={showDailyLogin}
        onClose={() => setShowDailyLogin(false)}
        onClaimed={(newBalance) => setBalance(newBalance)}
      />

      {/* Free Recharge - recharge de secours avec cooldown */}
      <FreeRechargeModal
        open={showFreeRecharge}
        onClose={() => setShowFreeRecharge(false)}
        onClaimed={(newBalance) => setBalance(newBalance)}
      />

      {/* Boutons d'accès */}
      <div className="flex gap-4">
        <button onClick={() => setShowDailyLogin(true)}>
          📅 Connexion Quotidienne
        </button>
        <button onClick={() => setShowFreeRecharge(true)}>
          ⚡ Recharge de Secours
        </button>
      </div>
    </>
  )
}
```

---

## 🚀 Optimisations avancées

### Garder le statut en sync sur plusieurs onglets

```tsx
// Utiliser le localStorage et des events de storage
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'free-recharge-status') {
      loadStatus() // Recharger depuis le serveur
    }
  }

  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])
```

### Pré-charger le statut au mount

```tsx
useEffect(() => {
  // Charger le statut immédiatement au mount
  const loadInitialStatus = async () => {
    const status = await fetchFreeRechargeStatus()
    if (status) {
      setStatus(status)
      // Calculer le temps restant
      if (status.nextRechargeAt) {
        const until = new Date(status.nextRechargeAt).getTime() - Date.now()
        scheduleRefresh(until + 1000) // Refresh 1s après l'expiration
      }
    }
  }

  loadInitialStatus()
}, [])
```

### Notification quand le cooldown expire

```tsx
useEffect(() => {
  if (!status?.nextRechargeAt) return

  const now = Date.now()
  const until = new Date(status.nextRechargeAt).getTime()
  const msUntilExpiry = until - now

  if (msUntilExpiry <= 0) {
    // Déjà expiré
    loadStatus()
    return
  }

  // Programmer une notification 10 secondes avant
  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('Recharge disponible!', {
        body: 'Vous pouvez à nouveau utiliser la recharge gratuite',
        icon: '⚡',
      })
    }
    loadStatus()
  }, msUntilExpiry - 10000)

  return () => clearTimeout(timeoutId)
}, [status?.nextRechargeAt])
```

---

## 🧪 Checklist pour intégrer

- [ ] Choisir l'emplacement (Lobby/Profil/Header/Modal)
- [ ] Importer le composant (`FreeRechargeButton` ou `FreeRechargeModal`)
- [ ] Mettre en place la gestion d'état (state local ou context)
- [ ] Tester le bouton en mode développement
- [ ] Vérifier le cooldown après une recharge
- [ ] Vérifier l'historique WalletLedgerEntry
- [ ] Tester sur mobile (responsive)
- [ ] Ajouter des tests unitaires si nécessaire

