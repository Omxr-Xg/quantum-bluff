# Gamification moteur

```mermaid
flowchart TD
  A[event game] --> B[awardXpInTransaction]
  B --> C[experience += delta]
  C --> D[levelFromExperience]
  D --> E[unlock badges]
  E --> F[persist user + user_badges]
```

```mermaid
flowchart LR
  X[casino stats] --> Y[slotBiggestWin]
  X --> Z[rouletteBiggestWin]
  X --> W[blackjackBiggestWin]
  Y --> L[leaderboard]
  Z --> L
  W --> L
```
