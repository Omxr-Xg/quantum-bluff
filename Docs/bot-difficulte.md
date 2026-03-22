# Bots : niveaux de difficulté — logique et différences

Ce document décrit **comment** les bots décident d’une action (fold / check / call / raise) et **ce qui différencie** les niveaux.  
**Code source :** `server/src/logic/botAI.ts` (IA), `server/src/routes/bot.routes.ts` (HTTP), `client/src/pages/Game.tsx` (mapping URL → API).

---

## 1. Vue d’ensemble

| Côté | Rôles |
|------|--------|
| **Serveur** | **Quatre** difficultés distinctes : `easy`, `medium`, `hard`, `expert`. Endpoint : `POST /api/bot/action`. |
| **Client** | Libellés **FR** dans l’URL : `facile`, `moyen`, `difficile`, `expert` → mappés 1:1 vers l’API. |
| **Récompense chips** | `winMultiplier` (mode bot sans partie réseau) pondère les gains **humain** ; indépendant de l’algo du bot (voir §5). |

---

## 2. Correspondance UI (français) → API (anglais)

| Paramètre URL | `difficulty` envoyée au serveur |
|----------------|----------------------------------|
| `facile` | `easy` |
| `moyen` | `medium` |
| `difficile` | `hard` |
| `expert` | `expert` |

**`difficile` et `expert` n’utilisent plus la même IA** : `hard` et `expert` partagent la même *structure* (pot odds + profil), mais avec des **paramètres** différents (bluffs, steals, hero calls).

---

## 3. Force de main (`normalizedHandStrength`)

Toutes les difficultés qui s’appuient sur la force utilisent **`getHandValue`** (Evaluator) sur **toutes** les cartes connues (2 à 7), normalisée sur le score max théorique.

**Correction importante :** l’ancien code renvoyait `0,5` dès que le total de cartes était &lt; 5, ce qui cassait la cohérence postflop partiel. Désormais la normalisation est valable pour le flop à 3 cartes, turn, river, etc.

---

## 4. Comportement par niveau

### `easy` — loose / imprécis
- Mélange **aléatoire** et **légère** influence de la force (`normalizedHandStrength`).
- Tendance **call station** ; **bluffs naïfs** quand personne n’a misé (~14 %).
- Fold un peu plus quand la main est très faible face à une grosse mise — mais beaucoup d’erreurs (style débutant).

### `medium` — lecture de main + table
- **Preflop** : paires / grosses cartes / défense large en HU, **steals** et **3-bet light** occasionnels.
- **Postflop** : seuils sur la force (fort / médian / faible), **bluffs** et **floats** en HU, **bluffcatch** plus fréquent qu’en multicouche.

### `hard` — pot odds + équité
- Estime une **probabilité de gagner** (force + marge pour cartes à venir).
- Compare à **`potOdds`** = `callAmount / (pot + callAmount)`.
- **Value raises** quand largement devant ; **bluffs** sur zones marginales ; **fold** -EV sinon. Profil `advancedPotOddsDecision` avec constantes « hard ».

### `expert` — même moteur que `hard`, profil plus agressif
- **Steal preflop** et **bluffs** en spots marginaux **plus fréquents**.
- **Calls** un peu plus larges (marge `potOddsTighten` plus faible).
- **Value raises** un peu plus grosses (multiplicateurs `minRaise` plus élevés).
- Plus de **hero calls** en HU sur les jets de bluff.

---

## 5. Multiplicateur de gains (`winMultiplier`) — mode bot

| Difficulté (URL) | Multiplicateur |
|------------------|----------------|
| `facile` | **0,3** |
| `moyen` | **0,6** |
| `difficile` | **1,0** |
| `expert` | **1,0** |

Cela modifie uniquement les **jetons gagnés par le joueur humain** en mode bot local, pas la légitimité des cartes au showdown.

---

## 6. Showdown

Le gagnant est calculé via `POST /api/bot/evaluate-winner` (Evaluator) — **aucune difficulté ne triche** aux cartes ; seule la **séquence d’actions** change.

---

## 7. Références code

| Élément | Fichier |
|---------|---------|
| `easyBotDecision`, `mediumBotDecision`, `hardBotDecision`, `expertBotDecision`, `decideBotAction` | `server/src/logic/botAI.ts` |
| Normalisation JSON + cartes | `server/src/routes/bot.routes.ts` |
| Mapping URL → `difficulty` | `client/src/pages/Game.tsx` (`getPlayers`) |
| UI choix difficulté | `client/src/pages/BotConfiguration.tsx` |
