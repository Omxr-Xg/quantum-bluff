import { GameTable } from '../logic/GameTable.js';
import { saveGame, getGame, deleteGame, restoreAllGames } from '../config/redis.config.js';

class ActiveGamesManager {
  private localCache: Map<string, GameTable> = new Map();
  private useRedis: boolean = true;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.useRedis) {
      try {
        const restored = await restoreAllGames();
        this.localCache = restored;
      } catch (err) {
        console.error('Erreur restauration Redis, utilisation du cache local uniquement:', err);
        this.useRedis = false;
      }
    }
  }

  async get(gameId: string): Promise<GameTable | undefined> {
    // D'abord vérifier le cache local
    if (this.localCache.has(gameId)) {
      return this.localCache.get(gameId);
    }

    // Sinon chercher dans Redis
    if (this.useRedis) {
      const game = await getGame(gameId);
      if (game) {
        this.localCache.set(gameId, game);
        return game;
      }
    }

    return undefined;
  }

  async set(gameId: string, game: GameTable): Promise<void> {
    this.localCache.set(gameId, game);
    if (this.useRedis) {
      await saveGame(gameId, game);
    }
  }

  async delete(gameId: string): Promise<void> {
    this.localCache.delete(gameId);
    if (this.useRedis) {
      await deleteGame(gameId);
    }
  }

  async getAll(): Promise<Map<string, GameTable>> {
    if (this.useRedis) {
      const redisGames = await restoreAllGames();
      // Fusionner avec le cache local (priorité au cache local)
      return new Map([...redisGames, ...this.localCache]);
    }
    return new Map(this.localCache);
  }

  size(): number {
    return this.localCache.size;
  }

  // Pour la compatibilité avec l'ancien code
  getSync(gameId: string): GameTable | undefined {
    return this.localCache.get(gameId);
  }

  setSync(gameId: string, game: GameTable): void {
    this.localCache.set(gameId, game);
    // Sauvegarde asynchrone en arrière-plan
    if (this.useRedis) {
      saveGame(gameId, game).catch(err => 
        console.error('Erreur sauvegarde Redis:', err)
      );
    }
  }
}

export const activeGames = new ActiveGamesManager();
