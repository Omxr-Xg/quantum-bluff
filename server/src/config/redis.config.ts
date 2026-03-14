import Redis from 'ioredis';
const RedisClient = Redis.default || Redis; // Compatibilité CommonJS/ESM

import { GameTable } from '../logic/GameTable.js';
import type { GameState, Player } from '../types/poker.js';

// Configuration Redis
const redisClient = new (RedisClient as any)({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis connecté');
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Erreur Redis:', err);
});

// Préfixe pour les clés Redis
const GAME_PREFIX = 'game:';
const PLAYER_PREFIX = 'player:';

// Fonctions de sérialisation/désérialisation
export const serializeGame = (gameId: string, game: GameTable): string => {
  const state = game.getState();
  return JSON.stringify({
    id: game.id,
    state: {
      pot: state.pot,
      communityCards: state.communityCards,
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        currentBet: p.currentBet || 0,
        position: p.position || 0,
        role: p.role,
        isActive: p.isActive,
        isDealer: p.isDealer || false,
        isConnected: p.isConnected !== false
      })),
      currentTurn: state.currentTurn,
      phase: state.phase
    }
  });
};

export const deserializeGame = (gameId: string, data: string): GameTable | null => {
  try {
    const parsed = JSON.parse(data);
    const players: Player[] = parsed.state.players.map((p: any) => ({
      ...p,
      cards: []
    }));
    
    const game = new GameTable(gameId, players);
    // Restaurer l'état
    game.state = {
      ...game.state,
      pot: parsed.state.pot,
      communityCards: parsed.state.communityCards,
      currentTurn: parsed.state.currentTurn,
      phase: parsed.state.phase
    };
    // Restaurer les mains des joueurs depuis l'historique si nécessaire
    return game;
  } catch (err) {
    console.error('Erreur désérialisation partie:', err);
    return null;
  }
};

// Sauvegarder une partie
export const saveGame = async (gameId: string, game: GameTable, ttl: number = 3600): Promise<void> => {
  const key = `${GAME_PREFIX}${gameId}`;
  const serialized = serializeGame(gameId, game);
  await redisClient.setex(key, ttl, serialized);
};

// Récupérer une partie
export const getGame = async (gameId: string): Promise<GameTable | null> => {
  const key = `${GAME_PREFIX}${gameId}`;
  const data = await redisClient.get(key);
  if (!data) return null;
  return deserializeGame(gameId, data);
};

// Supprimer une partie
export const deleteGame = async (gameId: string): Promise<void> => {
  const key = `${GAME_PREFIX}${gameId}`;
  await redisClient.del(key);
};

// Récupérer toutes les parties actives
export const getAllGames = async (): Promise<Map<string, GameTable>> => {
  const keys = await redisClient.keys(`${GAME_PREFIX}*`);
  const games = new Map<string, GameTable>();
  
  for (const key of keys) {
    const gameId = key.replace(GAME_PREFIX, '');
    const data = await redisClient.get(key);
    if (data) {
      const game = deserializeGame(gameId, data);
      if (game) games.set(gameId, game);
    }
  }
  
  return games;
};

// Restaurer toutes les parties au démarrage
export const restoreAllGames = async (): Promise<Map<string, GameTable>> => {
  console.log('🔄 Restauration des parties en cours...');
  const games = await getAllGames();
  console.log(`✅ ${games.size} parties restaurées`);
  return games;
};

export default redisClient;