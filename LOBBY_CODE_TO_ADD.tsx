// ============================================
// CODE À AJOUTER AU LOBBY
// ============================================

// ============================================
// ÉTAPE 1: AJOUTER À L'IMPORT (Ligne ~30)
// ============================================

// Ajouter cette ligne avec les autres imports de composants:
import { FreeRechargeButton } from '../components/FreeRechargeButton';
import { FreeRechargeModal } from '../components/FreeRechargeModal'; // Optionnel


// ============================================
// ÉTAPE 2: AJOUTER À L'ÉTAT (Ligne ~123)
// ============================================

// Ajouter après: const [balance, setBalance] = useState<number>(getUserBalance());

const [rechargeKey, setRechargeKey] = useState(0); // Pour forcer refresh

const handleRechargeSuccess = (newBalance: number) => {
  setBalance(newBalance);
  setRechargeKey(prev => prev + 1); // Forcer un refresh
  // Optionnel: afficher une notification
  // toast.success('Recharge effectuée!');
};


// ============================================
// ÉTAPE 3: AJOUTER AU RENDU (Chercher "balance" dans le JSX)
// ============================================

{/* OPTION A: Bouton simple (recommandé) */}
<div className="mt-4 max-w-sm">
  <FreeRechargeButton
    key={rechargeKey}
    onClaimed={handleRechargeSuccess}
    showDetails={true}
  />
</div>

{/* OU */}

{/* OPTION B: Avec Modal */}
<button
  onClick={() => setShowRechargeModal(true)}
  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold flex items-center gap-2 mx-auto mt-4"
>
  <Zap className="w-4 h-4" />
  Recharge de secours
</button>

<FreeRechargeModal
  open={showRechargeModal}
  onClose={() => setShowRechargeModal(false)}
  onClaimed={handleRechargeSuccess}
/>

// Si vous utilisez la modal, ajouter aussi à l'état:
const [showRechargeModal, setShowRechargeModal] = useState(false);


// ============================================
// VERSION COMPLÈTE (Copier-coller direct)
// ============================================

/*
Si vous voulez ajouter tout en une seule fois, voici la structure complète:

1. Dans les imports (chercher "import { Zap" ou similaire):
   import { FreeRechargeButton } from '../components/FreeRechargeButton';

2. Dans les useState (avec les autres states):
   const [balance, setBalance] = useState<number>(getUserBalance());
   const [rechargeKey, setRechargeKey] = useState(0); // Ajouter cette ligne

3. Ajouter une fonction de callback:
   const handleRechargeSuccess = (newBalance: number) => {
     setBalance(newBalance);
     setRechargeKey(prev => prev + 1);
   };

4. Dans le JSX de rendu (ajouter après l'affichage du solde):
   <FreeRechargeButton
     key={rechargeKey}
     onClaimed={handleRechargeSuccess}
     showDetails={true}
   />
*/


// ============================================
// STRUCTURE PROBABLE DU LOBBY
// ============================================

/*
Vous verrez probablement quelque chose comme ça:

export function Lobby() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(getUserBalance());
  // ... autres states ...

  return (
    <div className="lobby-container">
      {/* En-tête avec infos joueur */}
      <div className="player-header">
        <h1>{username}</h1>
        <div className="balance">
          <ChipIcon />
          <span>{balance} jetons</span>
        </div>

        {/* 🆕 AJOUTER LE BOUTON ICI: */}
        <FreeRechargeButton
          onClaimed={handleRechargeSuccess}
          showDetails={true}
        />
      </div>

      {/* Salles de jeu */}
      <div className="waiting-rooms">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}
*/
