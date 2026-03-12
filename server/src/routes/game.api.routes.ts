import express from 'express';
import { prisma } from '../config/database.js';
import { GameTable } from '../logic/GameTable.js';
import type { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';
//import { Server } from 'socket.io';

const router = express.Router();

// POST /api/game/start - Démarrer une partie depuis une salle d'attente
router.post('/start', async (req, res) => {
  try {
    const { roomId, hostId } = req.body;

    // Récupérer la salle d'attente
    const waitingRoom = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    if (!waitingRoom) {
      return res.status(404).json({ error: 'Salle introuvable' });
    }

    // Vérifier que c'est bien le host qui démarre
    if (waitingRoom.hostId !== hostId) {
      return res.status(403).json({ error: 'Seul le host peut démarrer la partie' });
    }

    // Vérifier qu'il y a assez de joueurs
    if (waitingRoom.players.length < 2) {
      return res.status(400).json({ error: 'Minimum 2 joueurs requis' });
    }

    // Convertir les utilisateurs en joueurs pour GameTable
    const players: Player[] = waitingRoom.players.map((rp, _index) => ({
      id: rp.user.id,
      name: rp.user.username,
      cards: [],
      chips: 1000, // Jetons de départ
      role: 'PLAYER',
      isActive: true,
      position: _index,
      isDealer: false,
      isConnected: true
    }));

    // Créer une nouvelle partie
    const gameId = `game_${Date.now()}`;
    const gameTable = new GameTable(gameId, players);
    gameTable.startHand();

    // Sauvegarder la partie active
    activeGames.set(gameId, gameTable);
    const io = req.app.get('io'); // Récupérer l'instance Socket.io
    if (io) {
      io.to(roomId).emit('GAME_STARTED', { gameId });
      // Faire rejoindre tous les joueurs à la nouvelle room de jeu
      waitingRoom.players.forEach(_p => {
        // Ici il faudrait avoir une correspondance socketId ↔ userId
        // Pour l'instant, on notifie juste
      });
    }

    // Mettre à jour le statut de la salle d'attente
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: { status: 'IN_GAME' }
    });

    // Optionnel : sauvegarder l'historique
    await prisma.gameHistory.create({
      data: {
        id: gameId,
        tableId: roomId,
        gameId: gameId,
        board: [],
        pot: 0,
        winnerId: '', // Sera mis à jour à la fin
      }
    });

    res.json({
      gameId,
      state: gameTable.getSanitizedState()
    });

  } catch (error) {
    console.error('Erreur démarrage partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/:gameId - Récupérer l'état d'une partie
router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;
  console.log(`🔍 Recherche de la partie: ${gameId}. Clés dans le Map:`, Array.from(activeGames.keys()));
  
  const game = activeGames.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' });
  }

  res.json(game.getSanitizedState());
});

// POST /api/game/:gameId/action - Effectuer une action
router.post('/:gameId/action', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;

    const game = activeGames.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Partie introuvable' });
    }

    game.handlePlayerAction(playerId, action, amount);
    
    res.json(game.getSanitizedState(playerId));

  } catch (error) {
    console.error('Erreur action:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/game/active - Liste des parties actives
router.get('/active/list', (req, res) => {
  const games = Array.from(activeGames.entries()).map(([id, game]) => ({
    id,
    players: game.state.players.length,
    phase: game.state.phase
  }));
  res.json(games);
});

export default router;
