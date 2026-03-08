import { describe, it, expect } from 'vitest';
// Attention à bien vérifier ce chemin d'import selon ton arborescence !
import { calculatePlayerPositions } from '../components/game/PokerTable';

describe('Logique Mathématique : calculatePlayerPositions', () => {
  
  it('doit générer exactement le nombre demandé de positions', () => {
    const playerCount = 6;
    const positions = calculatePlayerPositions(playerCount, false, false);
    expect(positions).toHaveLength(playerCount);
  });

  it('doit décaler le joueur principal (index 0) vers le bas de la table', () => {
    // Sur un écran Desktop (false, false), le rayon Y est de 210 (420/2)
    // Le décalage prévu dans ta fonction est de +40
    const positions = calculatePlayerPositions(4, false, false);
    
    // On s'attend à ce que le joueur 0 soit plus bas que le bord strict de l'ellipse
    expect(positions[0].y).toBeGreaterThan(210);
  });

  it('doit garantir que les joueurs ne se chevauchent jamais (Distance Euclidienne)', () => {
    const playerCount = 8; // Test de stress avec une table pleine
    const positions = calculatePlayerPositions(playerCount, false, false);
    
    // Distance minimale requise entre deux joueurs (en pixels)
    // Un avatar fait environ 60-80px de large, donc 100px est une bonne marge
    const MINIMUM_SAFE_DISTANCE = 100;

    // On compare chaque joueur avec tous les autres
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        // Formule de la distance euclidienne : √((x2 - x1)² + (y2 - y1)²)
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        expect(distance).toBeGreaterThan(MINIMUM_SAFE_DISTANCE);
      }
    }
  });

});