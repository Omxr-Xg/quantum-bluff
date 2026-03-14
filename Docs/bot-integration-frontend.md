# Intégration des bots côté frontend

## Endpoint API

`POST /api/bot/action`

## Payload à envoyer

```typescript
{
  playerCards: Card[];           // 2 cartes du bot
  communityCards: Card[];        // Cartes communes (0, 3, 4 ou 5)
  difficulty: 'easy' | 'medium' | 'hard';
  currentBet: number;            // Mise actuelle
  playerChips: number;           // Jetons restants du bot
  callAmount: number;            // Montant à suivre
  minRaise: number;              // Relance minimum
  potSize: number;               // Taille du pot
  position: number;              // Position (0 = dealer, 1 = small blind...)
  playersCount: number;          // Nombre total de joueurs
}
```

## Réponse

```typescript
{
  action: 'FOLD' | 'CALL' | 'CHECK' | 'RAISE';
  amount?: number;               // Pour RAISE
  reasoning?: string;            // Pour debug
}
```

## Exemple d'utilisation dans Game.tsx

```typescript
// Quand c'est le tour d'un bot
const handleBotTurn = async (botId: string) => {
  const bot = players.find(p => p.id === botId);
  if (!bot || !bot.isBot) return;

  setIsBotThinking(true);

  try {
    const response = await fetch('/api/bot/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerCards: bot.cards,
        communityCards: communityCards.filter(c => c !== null),
        difficulty: bot.difficulty,
        currentBet: currentBet,
        playerChips: bot.chips,
        callAmount: callAmount,
        minRaise: 20,
        potSize: pot,
        position: bot.position,
        playersCount: activePlayers.length
      })
    });

    const decision = await response.json();

    // Exécuter l'action
    switch (decision.action) {
      case 'FOLD':
        await handleFold(botId);
        break;
      case 'CALL':
        await handleCall(botId, decision.amount || callAmount);
        break;
      case 'CHECK':
        await handleCheck(botId);
        break;
      case 'RAISE':
        await handleRaise(botId, decision.amount);
        break;
    }

    console.log(`🤖 Bot ${bot.name} a joué:`, decision.reasoning);

  } catch (error) {
    console.error('Erreur bot:', error);
  } finally {
    setIsBotThinking(false);
  }
};
```

## Types à ajouter dans le frontend

```typescript
// types/bot.ts
export interface BotPlayer extends Player {
  isBot: true;
  difficulty: 'easy' | 'medium' | 'hard';
}
```
