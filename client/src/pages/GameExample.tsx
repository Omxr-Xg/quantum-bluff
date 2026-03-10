import { useEffect } from "react";
import { usePokerSocket, usePokerGame, usePokerDeck } from "../hooks";

/**
 * Exemple d'utilisation des hooks personnalisés
 * 
 * Cette page montre comment utiliser l'architecture propre avec les hooks customs
 */
export function GameExample() {
  // 🎣 Hook pour la connexion WebSocket
  const { isConnected, sendAction, joinGame, leaveGame, error } = usePokerSocket({
    gameId: "room-123",
    playerId: "user-456",
    onGameStateUpdate: (newState) => {
      console.log("📡 État du jeu mis à jour:", newState);
    },
    onError: (err) => {
      console.error("❌ Erreur:", err);
    },
  });

  // 🎮 Hook pour gérer l'état du jeu
  const {
    phase,
    pot,
    communityCards,
    players,
    nextPhase,
    addToPot,
    nextPlayer,
    allPlayersActed,
  } = usePokerGame();

  // 🃏 Hook pour gérer le deck
  const { generateDeck, drawCard, drawCards, burnCard, cardsRemaining } = usePokerDeck();

  // Initialisation : générer le deck au chargement
  useEffect(() => {
    const newDeck = generateDeck();
    console.log("🎴 Deck généré:", newDeck.length, "cartes");
  }, [generateDeck]);

  // Rejoindre la partie au chargement
  useEffect(() => {
    joinGame("room-123");
    
    return () => {
      leaveGame();
    };
  }, [joinGame, leaveGame]);

  // Gérer les actions des joueurs
  const handlePlayerAction = (action: "fold" | "call" | "raise", amount?: number) => {
    // 1. Envoyer l'action au serveur
    sendAction(action, amount);
    
    // 2. Mettre à jour l'état local (en attendant la réponse du serveur)
    if (action === "call" || action === "raise") {
      addToPot(amount || 0);
    }
    
    // 3. Passer au joueur suivant
    nextPlayer();
    
    // 4. Si tous ont joué, passer à la phase suivante
    if (allPlayersActed()) {
      handlePhaseTransition();
    }
  };

  // Gérer les transitions entre les phases
  const handlePhaseTransition = () => {
    switch (phase) {
      case "preflop":
        // Brûler une carte puis distribuer le flop
        burnCard();
        const flopCards = drawCards(3);
        console.log("🎴 Flop:", flopCards);
        nextPhase();
        break;
        
      case "flop":
        // Brûler une carte puis distribuer le turn
        burnCard();
        const turnCard = drawCard();
        console.log("🎴 Turn:", turnCard);
        nextPhase();
        break;
        
      case "turn":
        // Brûler une carte puis distribuer la river
        burnCard();
        const riverCard = drawCard();
        console.log("🎴 River:", riverCard);
        nextPhase();
        break;
        
      case "river":
        // Passer au showdown
        nextPhase();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎰 Exemple d'utilisation des Hooks</h1>
        
        {/* Statut de connexion */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📡 Connexion</h2>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connecté au serveur' : 'Déconnecté'}</span>
          </div>
          {error && <p className="text-red-400 mt-2">❌ {error}</p>}
        </div>

        {/* État du jeu */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🎮 État du jeu</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Phase</p>
              <p className="text-xl font-bold text-yellow-400">{phase}</p>
            </div>
            <div>
              <p className="text-gray-400">Pot</p>
              <p className="text-xl font-bold">{pot} jetons</p>
            </div>
            <div>
              <p className="text-gray-400">Cartes restantes</p>
              <p className="text-xl font-bold">{cardsRemaining}</p>
            </div>
            <div>
              <p className="text-gray-400">Joueurs</p>
              <p className="text-xl font-bold">{players.length}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Actions</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handlePlayerAction("fold")}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Se coucher
            </button>
            <button
              onClick={() => handlePlayerAction("call", 50)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Suivre (50)
            </button>
            <button
              onClick={() => handlePlayerAction("raise", 100)}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Relancer (100)
            </button>
          </div>
        </div>

        {/* Code example */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💻 Code utilisé :</h3>
          <pre className="bg-slate-900 p-4 rounded overflow-x-auto text-sm">
{`// Hooks personnalisés
const { sendAction } = usePokerSocket({ ... });
const { phase, pot, nextPhase } = usePokerGame();
const { drawCard, burnCard } = usePokerDeck();

// Action du joueur
const handlePlayerAction = (action, amount) => {
  sendAction(action, amount);  // → Serveur
  addToPot(amount);             // → État local
  nextPlayer();                 // → Joueur suivant
};`}
          </pre>
        </div>
      </div>
    </div>
  );
}
