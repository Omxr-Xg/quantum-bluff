# IA Expert Bot Poker

Le niveau `expert` du mode bot peut déléguer sa décision à un service Python FastAPI. Les autres difficultés restent entièrement gérées par les heuristiques TypeScript existantes.

## Flux

```text
GameTable / API bot
  -> server/src/services/botAi.service.ts
  -> POST AI_SERVICE_URL/predict/poker
  -> validation backend + sanitizeBotDecision
  -> applyPokerAction
```

Le backend n’envoie que les informations visibles par le bot : ses deux cartes, les cartes communes, le pot, le montant à call, les stacks, la position, le nombre de joueurs et un historique court d’actions. Les cartes cachées adverses ne sont jamais transmises.

## Service Python

Fichiers principaux :

- `server/ai-service/main.py` : endpoint `POST /predict/poker`.
- `server/ai-service/poker/hand_evaluator.py` : évaluation poker complète, tirages et texture du board.
- `server/ai-service/poker/features.py` : vectorisation des situations poker.
- `server/ai-service/poker/expert_rules.py` : professeur heuristique expert pour labelliser les simulations.
- `server/ai-service/poker/decision.py` : combinaison modèle + règles + randomisation.
- `server/ai-service/poker/simulator.py` : génération de situations artificielles.
- `server/ai-service/poker/train.py` : entraînement et régénération de `model/expert_bot.pt`.
- `server/ai-service/poker/evaluate_bot.py` : comparaison IA Python vs baseline heuristique.
- `server/ai-service/poker/replay_real_matches.py` : validation qualitative sur situations réelles exportées.

Lancer en local :

```bash
cd server/ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

En développement, `npm run dev` à la racine lance aussi le service IA via `dev:ai`. Après modification de `server/.env`, il faut redémarrer `npm run dev` pour que le backend relise `AI_SERVICE_ENABLED` et `AI_SERVICE_URL`.

Régénérer le modèle :

```bash
cd server/ai-service
python -m poker.simulator --samples 100000 --output data/simulated_poker_dataset.csv
python -m poker.train --dataset data/simulated_poker_dataset.csv --epochs 8 --output model/expert_bot.pt
```

Évaluer l’IA :

```bash
cd server/ai-service
python -m poker.evaluate_bot --samples 1000 --output model/evaluation_report.json
python -m poker.replay_real_matches --input data/real_match_situations.json --output model/real_match_replay.csv
```

## Backend

Variables serveur :

```env
AI_SERVICE_ENABLED=true
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=450
```

Si le service Python est désactivé, indisponible, trop lent, ou renvoie une action invalide, le backend utilise automatiquement l’heuristique `expert` actuelle. Le moteur poker ne supporte pas directement `ALL_IN`; le backend convertit donc cette sortie en `RAISE`, `CALL`, `CHECK` ou `FOLD` compatible avant validation.

## Contrôles de sécurité

- Le service IA ne modifie jamais la partie directement.
- Le backend valide la forme de la réponse IA avec Zod.
- `sanitizeBotDecision` reste le dernier filtre avant l’application de l’action.
- `applyPokerAction` conserve les validations de tour, main, street et montant.
