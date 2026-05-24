# Quantum Bluff - Complete User Guide

## TABLE OF CONTENTS
1. Introduction & Getting Started
2. Authentication & Account
3. Lobby Interface
4. Poker - Cash Games & Tournaments
5. Casino Games (Blackjack, Roulette, Slots)
6. Progression & Rewards System
7. Social Interactions
8. Wallet Management
9. Tips & Strategies
10. Interactive Tutorial & Help
11. Feedback & Game Rating

---

## 1. INTRODUCTION & GETTING STARTED

### 1.1 What is Quantum Bluff?
Quantum Bluff is a multiplayer gaming platform offering:
- **Poker** (cash games and tournaments)
- **Casino games** (Blackjack, Roulette, Slot machines)
- **Social systems** (Friends, Loans, Messages)
- **Progression and gamification** (Levels, Badges, XP)
- **Global leaderboards** by category

### 1.2 Platform Access

**Available Platforms :**

- **Web** : Accessible via browser (responsive design, desktop/mobile)
  - URL : https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/
  
- **Windows Desktop** : Local installation from Git repository
  - File : `Quantum Bluff Setup 1.0.0.exe` (127 MB)
  - Location : `client/dist-electron/` from Git repository
  - Double-click the executable and follow the installation

- **Mac Desktop** : Local installation from Git repository
  - File : `Quantum Bluff-1.0.2-arm64.dmg` (175 MB)
  - Location : `Game_Versions/` from Git repository
  - Open the DMG file and drag the application to Applications

- **Android** : Native application via Capacitor
  - Source : `client/android/` from Git repository
  - Compilation : `npx cap build android` to generate the APK
  - Installation : Transfer the generated APK to your Android device
  - Same experience as web version

- **iOS** : Native application via Capacitor
  - Source : `client/ios/` from Git repository
  - Compilation : `npx cap build ios` to generate the Xcode project
  - Installation : Build with Xcode and install on your iOS device
  - Same experience as web version

**Supported Languages** : English, French, Spanish, Ukrainian, Arabic

**Game Currency** : Chips (tokens) — no real money

### 1.3 System Requirements
- Stable internet connection
- Modern browser (Chrome, Firefox, Safari, Edge)
- Minimum resolution: 320px (mobile) to 1920px+ (desktop)

---

## 2. AUTHENTICATION & ACCOUNT

### 2.1 Registration Steps

#### Getting Started
1. Home screen with inspiring quote (random from 20 famous poker quotes)
2. Click "Sign Up" or use "Register"

#### Process
**Step 1 — Email**
- Enter a valid email address
- System verifies availability
- Error codes: `EMAIL_ALREADY_EXISTS` (create new account or use "Login")

**Step 2 — Username & Password**
- **Username** : 3-20 alphanumeric characters + underscore
- **Password** : Minimum 8 characters (recommended: uppercase, lowercase, number, special character)
- Password confirmation required

**Step 3 — Security Question**
- Select one of 10 secret questions offered
- Answer with a phrase (case-insensitive)
- Used for account recovery (forgot password)

**Step 4 — Date of Birth**
- Mandatory for legal validation (minimum age: 18 years)
- ISO format (yyyy-mm-dd)
- Limits: 18 years old today to 120 years old

**Step 5 — Activation**
- Account created with 1000 initial chips (starting balance)
- Automatic redirect to login or lobby

### 2.2 Age Validation & Country Restrictions

**Country Detection :**
- Based on your request IP + CDN headers (Cloudflare, Vercel, etc.)
- Automatic — you don't need to do anything
- Used only for legal validation during registration

**Age Rules by Country :**

| Country/Region | Minimum Age | Notes |
|---|---|---|
| **United States (US)** | **21 years** | Online gambling federally regulated |
| **All other countries** | **18 years** | International standard |
| **Saudi Arabia (SA)** | ❌ Forbidden | Online gambling is not authorized |
| **Iran (IR)** | ❌ Forbidden | Online gambling is not authorized |

**Email Blocking System :**
- If you try to register before legal age, your email is automatically blocked
- You will receive the error: *"This email cannot be used to register before the age eligibility date related to your age"*
- Email is unlocked **automatically** when you reach legal age (at midnight UTC)
- Example: If you are 17 on May 15, 2026, you can register with this same email starting May 15, 2027 (at midnight UTC)

**Forbidden Countries :**
- If your IP comes from Saudi Arabia or Iran, registration is **completely refused** (error code 403)
- Message: *"Online gambling is not allowed from your country"*
- No future unlock system — this is a permanent restriction

**VPN Limitation :**
- If you use a VPN, the detected country is the **VPN exit** (not the VPN itself)
- Example: VPN based in Saudi Arabia but actual exit is in the United States → you will be treated as being in the United States

### 2.3 Login

#### Standard Process
1. **Email** : Enter account email
   - Verification: account existence
   
2. **Password** : Enter password
   - Display toggle (eye icon)
   - Case-sensitive

#### Post-Login Redirect
- Poker Lobby by default
- May redirect to previous page (ex: ongoing game)

### 2.4 Account Recovery (Forgot Password)

#### Flow
1. "Forgot Password" screen
2. Enter email
3. Answer security question (same answer as at registration)
4. Enter new password + confirmation
5. Success: redirect to login

#### Error Codes
- `INVALID_EMAIL` : Non-existent email
- `INVALID_SECURITY_ANSWER` : Wrong answer to question

### 2.5 Account Management

#### Profile (Account Tab)
- **Avatar** : Uploadable photo/avatar (PNG, JPG)
- **Username** : Modifiable (after logout/login)
- **Email** : Displayed (not user-modifiable)
- **Settings** : Language, accessibility, theme

#### Logout
- "Logout" button → return to Auth
- JWT session invalid after (token revoked on Redis side)
- localStorage clearing: avatar, gamification, balance cache

---

## 3. LOBBY INTERFACE

### 3.1 Main Navigation

#### Tabs
1. **POKER** (default)
   - Cash games (multiplayer tables)
   - Tournaments
   - Watch games live
   
2. **MINIGAMES** (Roulette, Slot machines)
   - Quick casino games
   - Personal statistics
   
3. **BLACKJACK**
   - Solo mode (1v1 vs dealer)
   - Multiplayer (tables with friends)

4. **PROFILE** 
   - Personal statistics
   - Badges and Levels
   - Game history

5. **FRIENDS**
   - Friends list
   - Pending requests
   - Private messages
   - Loans between friends

6. **LEADERBOARDS**
   - Global XP
   - Poker Wins
   - Biggest Casino Wins
   - Rankings by metric

### 3.2 POKER Section — Available Tables

#### List Structure
1. **Waiting Rooms** (Waiting to start)
   - Display: Name, Small Blind/Big Blind, Players registered, Status
   - Filter: Public / Private
   - Buttons: Join / Spectate

2. **Games In Progress** (Ongoing games)
   - Display: Phase (Preflop, Flop, Turn, River, Showdown)
   - Joinable status: "Can Join" if seat available
   - Spectate: Always possible

3. **Tournaments**
   - **Open** : In registration (display start date/time local)
   - **In Progress** : Bracket tables live
   - **Closed** : Final results

#### Filters & Search
- **Blind Range** : Slider for min/max big blind
- **Players** : Minimum number of players
- **Status** : Public/Private/All
- **Search** : Table/tournament name

### 3.3 Creating a Table

#### "Create New Table" Dialog
**Mandatory parameters :**
- **Name** : Table title (visible to others)
- **Visibility** : PUBLIC (visible to all) / PRIVATE (invite only)
- **Max Players** : 2-9 (heads-up to 9-max)
- **Small Blind** : ex. 5, 10, 25
- **Big Blind** : Must be > Small Blind
- **Min Balance** : Minimum balance required to play (optional, ex: 2× BB)
- **Turbo Mode** (checkbox) : Fast blind increase

**Validation :**
- Check player balance ≥ 2× Big Blind (initial buy-in)
- Check level unlocks blinds if limited by level
- Max simultaneous tables per player: ~5

**After creation :**
- Player automatically becomes "host" (table control)
- Redirect to Waiting Room
- Other players can join

### 3.4 Joining a Table (Cash Game)

#### "Join Game" Dialog
1. Select table
2. Enter buy-in (recommendation: 20-100× BB)
3. Upload avatar (optional)
4. Confirm

**Buy-in limits :**
- Minimum: 2× BB
- Maximum: Player balance or table cap
- Auto-adjust: if insufficient balance → `INSUFFICIENT_CHIPS` error

**Placement :**
- Player seated at next available seat (circular order)
- Initial role: PLAYER
- First dealer button position random or after departure

### 3.5 Creating a Tournament

#### "Create Tournament" Dialog
**Parameters :**
- **Name** : Tournament title
- **Max Players** : 2-128 (determines bracket structure)
- **Blinds Structure** :
  - Preset: Micro (5/10), Small (10/20), Medium (25/50), Large (100/200)
  - Increase: 10-30 min per level by default
- **Initial Stack** : Starting chips per player (ex: 1500)
- **Buy-in** : Registration cost (chips)
- **Start Date/Time** : Local format (datetime-local)
- **Turbo Mode** : Blind increase 2× faster

**Costs :**
- Buy-in deducted from player balance
- Founder automatically registered

**Registration :**
- Players join via Lobby
- Status: `Waiting` until start time
- After start: Status `In Progress` → tournament brackets
- Max 1 tournament/player simultaneously

### 3.6 Personal Dashboard

#### Widgets
1. **Balance** : Currently available chips
2. **Level & XP** : Progress toward next level (bar)
3. **Recent** : Last action (game played, win/loss)
4. **Friends Online** : Avatar + status (playing/idle)
5. **Daily Challenge** : Daily challenge + progress
6. **Free Top-up** (if QUANTUM code valid): "Free Top-up" button

#### Daily Challenge
- One challenge per day (midnight UTC)
- Examples: "Win 3 poker hands", "Spin roulette 5 times"
- Reward XP + bonus chips if completed
- Auto-resets J+1

#### Free Top-up
- Promo code: `QUANTUM` (default dev/staging)
- Adds 1000 chips
- Usable once per day (24h cooldown)

---

## 4. POKER — CASH GAMES & TOURNAMENTS

### 4.1 Fundamental Poker Rules (Texas Hold'em)

#### Variant
- **Texas Hold'em** (only supported variant)
- 2-9 players per table
- Community cards: 5 (Flop 3 + Turn 1 + River 1)
- Final hand: 5 cards from 7 (2 private + 5 community)

#### Roles & Positions

**Heads-up (2 players)**
- Button = Small Blind (acts last postflop, acts first preflop)
- Other player = Big Blind (acts first postflop)

**3+ players**
- **Dealer Button (D)** : Marked by "D" chip, rotates clockwise
- **Small Blind (SB)** : Left of dealer, posts SB before cards
- **Big Blind (BB)** : Left of SB, posts BB before cards
- **Others** : PLAYER (positions UTG, UTG+1, … CO, etc.)

**Preflop action order**
1. UTG (Under The Gun) — 1st left of BB
2. UTG+1, UTG+2, … CO (Cutoff)
3. Button
4. Small Blind
5. Big Blind

**Postflop order (Flop, Turn, River)**
1. Small Blind (if active)
2. Big Blind
3. UTG, UTG+1, … Button (if active)

#### Game Phases
1. **Pre-Game** : Players seat, chips distributed
2. **Preflop** : Blinds posted, cards dealt (2 per player)
3. **Preflop Action** : Bet/fold/check/raise until equalization or 1 remaining
4. **Flop** : 3 community cards revealed
5. **Flop Action** : Bet/check/fold/raise
6. **Turn** : 4th community card
7. **Turn Action** : Same mechanic
8. **River** : 5th and final community card
9. **River Action** : Bet/check/fold/raise
10. **Showdown** : Best hands compared, pot distributed

#### Action Options

**Normal Hand (player always active with chips)**
- **FOLD** : Abandon the hand (chips at stake lost)
- **CHECK** : Pass turn without betting (only if no one has bet)
- **CALL** : Equalize previous bet
- **RAISE** : Bet more (minimum: big blind or previous raise)
- **ALL-IN** : Commit all remaining chips (can be < required bet)

**Variants**
- **Check-Raise** : Check then raise after opponent raises (strategic)
- **Min-Raise** : Raise by minimum legal amount (rare, usually poor form)

#### Betting Rules

**Minimum Amounts**
- Preflop : Big Blind = minimum unit
- Postflop : Previous raise or big blind
- Raise : At minimum equalize last bet + 1 BB

**All-in Dynamic**
- If player out of chips but hand active → competitive pot created
- Remaining players continue to play
- Runout (all 5 community cards) played after all-in
- Pot side split according to participation

**Bet Cap (Table-dependent)**
- Some tables : bet cap (ex: 3 raises/street)
- Generally : no limit (No-Limit Texas Hold'em)

#### Hand Evaluation
**Ranking (best to worst) :**
1. **Royal Flush** : A-K-Q-J-10 same suit
2. **Straight Flush** : 5 consecutive cards same suit
3. **Quads (Four of a Kind)** : 4 identical cards
4. **Full House** : Three of a kind + Pair
5. **Flush** : 5 cards same suit
6. **Straight** : 5 consecutive cards (mixed suits)
7. **Three of a Kind** : 3 identical cards
8. **Two Pair** : 2 different pairs
9. **Pair** : 2 identical cards
10. **High Card** : Highest card

**Tie-breaking**
- Kickers (unpaired cards) compared if same type
- Ex: Pair of Kings + A-K-Q vs Pair of Kings + A-J-T → 1st hand wins (better kicker)

### 4.2 Gameplay - Typical Game Cycle

#### Before a Hand
1. **Setup table** : 2-9 players seated
2. **Blinds posted** : Automatically debited
3. **Cards dealt** : 2 private hole cards per player (visible to self)

#### Preflop Action
- **Player 1 (UTG)** :
  - Options : Fold, Call BB, Raise
  - Example : Raise to 60 (3× BB of 20)
  
- **Player 2** :
  - Options : Fold, Call 60, Raise to 150+
  - Example : Fold (loses ante)
  
- **Small Blind / Big Blind** :
  - Can fold, call or raise
  - SB : Can call 10 additional chips (balance 20 total)
  - BB : Can call 40 additional chips or raise

- **Continue Until** :
  - All but 1 player folded → hand over (pot to last remaining) — WIN_BY_FOLD
  - Or all active players have equalized the bet → next phase

#### Live Bet Window (Multi-player Cash)
- **PRE-HAND Window** (5 sec) : Window for hidden bets (see section 4.4)
- **Between Streets Windows** : Between Flop/Turn/River (LIVE_FLOP, LIVE_TURN, LIVE_RIVER)
- Poker action **frozen** during these windows
- UI locked (no action buttons)

#### Flop, Turn, River
- Same structure : small blind acts first (if active)
- Pots accumulate at each street

#### Showdown
- Remaining players reveal cards
- Best hand wins main pot
- If tie: Split pot (fair share)
- UI displays: Best hands, pot value, how it's distributed

**Showdown example :**
```
Player A: A-K (flush) vs Player B: Q-Q (three of a kind)
Pot: 1200
Winner: Player A (flush > three of a kind)
Balance changes: A +1200, B -1200
```

#### Next Hand
- Dealer button rotates clockwise
- Blinds repositioned
- Cycles repeat

### 4.3 Cash Game Multi-position — Specifics

#### Buy-in & Stack
- **Initial Stack** : Determined by player upon arrival (ex: 1000 chips, amount between 100 and 10,000 max)
- **Rebuy** : If stack reduced, buy more chips (optional, via wallet balance)
- **Leave** : Leave table anytime (between hands) → cashed-out chips credited to wallet

#### Custom Avatars
- Each player can upload avatar upon arrival
- Displayed on seat (small portrait)
- Visible to all players
- Reset: Default avatar used if none uploaded

#### Action Timeout
- **Time Limit** : 30-60 seconds per player (according to table config)
- Exceeded: Auto-fold
- Warning: Visual countdown counter

#### Spectator Mode & Rejoin at Next Hand

**Spectator**
- You can watch an ongoing hand as a spectator
- Access: "Spectate" button from lobby or during game
- Visibility: See community cards, not other players' hole cards

**Auto-rejoin at Next Hand**
- After a hand, if you leave or stay spectator → you can register to rejoin next hand
- Rejoin queue: Wait until next start (10-30 sec countdown between hands)
- Condition: You must have at least the defaultBuyIn in your wallet to rejoin
- Placement: Seated at next available seat (circular order)
- Note: Spectators re-registered in priority according to registration order

### 4.4 Hidden Bets (Side Bets Multi-player)

#### Concept
- **Quote/Place (Prop bets)** : Bet on other players' results
- **Available** : Multi-player cash games only
- **Status** : Optional, non-bluffing (wins/losses separate from main pot)

#### Flow

**PRE-HAND WINDOW (5 sec)**
- Window open before each hand
- Players can place bets on next hand (if hand ID known)
- Options: Quote (player wins), Place (player loses)
- Amounts: Free (limited to balance)

**Action Windows** (LIVE_FLOP, LIVE_TURN, LIVE_RIVER)
- Frozen windows between streets
- Poker action on table **paused** (no buttons)
- Bet results revealed after poker action continues

**Results**
- At showdown: Bets settled
- Wins/losses hydrated in balance
- History: Table visible, date/time, amounts

#### Ledger Transactions
- Each bet recorded in wallet ledger
- Type: "HIDDEN_BET_SETTLED" (ex: +250 chips for winning quote)
- Dashboard: History accessible via history icon

### 4.5 Tournaments

#### Tournament Structure

**Before**
- Registration window open (date_start - time X)
- Players register via Lobby (pay buy-in)
- Max players reached or registration time closed → start
- Initial stack distributed to each player

**During**
- **Blind Levels** : Scheduled increase (10-30 min by default)
- **Brackets** : Players assigned to tables by algorithm
- **Elimination** : If stack = 0 → player eliminated
- **Advancement** : Tables reduced (7-6-5-4...) as eliminations occur
- **Final Table** : Last table of 6-9 players

**After**
- Winner = last player with chips
- Payout structure: 1st place > 2nd > 3rd... (customizable)
- History: Tournament displayed in stats

#### Bracket & Advancement

**Multi-Leveled Structure :**
- Table 1, Table 2, … depending on players
- Play 1-2 levels per round
- Balanced tables: move winning players toward "stronger" tables (optional)

**Elimination :**
- Player out (0 chips) → marked as "Eliminated"
- Placement: Final position (ex: 45th, 23rd, 1st)
- Rewards: Distributed according to placement

#### Tournament Rewards

**Payout Structure (Example 64 players) :**
```
1st:  5000 chips
2nd:  3000 chips
3rd:  2000 chips
4-6:  1200 chips
7-12: 600 chips
13-24: 300 chips
25+: No payout
```

**XP Rewards :**
- All receive XP (even eliminated early)
- Bonus XP if advancing rounds: +10 XP per round
- Bonus XP if placing: +50 XP top 3, +25 XP top 10

#### Spectate Tournament
- "Spectate" button on ongoing tournaments
- See tables live, real-time action
- Spectators-only chat
- Notify friends (no mute)

#### Ready-Check Between Hands & Auto-Elimination

**After each hand (between hands)**
- "Ready" window displays for all survivors
- Delay: **30 seconds** to click "Ready"
- Timeout: Player considered **AFK (Away From Keyboard)** → **AUTO-ELIMINATED from tournament**
  - Elimination recorded in DB
  - Client receives "PLAYER_BUSTED" event with reason "AFK"

**AFK Management (30 sec timeout)**
- If **0 players ready** (all AFK) : Player with most chips wins (or tiebreak by userId)
- If **1+ players ready** : Hand continues with ready players, AFK are eliminated
- If **≥2 survivors** after elimination : Next hand starts automatically
- If **1 sole survivor** : Table ended, player advanced to next round

### 4.6 Bot Tables - Practice & Expert Mode

#### Purpose
- **Easy, Medium, Hard** : Training against variable AI (stable balance)
- **Expert** : Challenge against highly trained AI + real chips at stake
- Accessible without friends
- Progressive: difficulty increases by level

#### Access
- Lobby → "Play with Bots" or "Practice Game"
- Select difficulty :
  - **Easy / Medium / Hard** : Training (virtual balance)
  - **Expert** : Highly trained AI, real chips at stake
- Initial stack: Customizable (min 100 chips)
- Blinds: 50/100 presets

#### Bots Behavior
- **Easy / Medium / Hard** : Varied playstyle (tight/loose/aggressive/passive)
- **Expert** : Highly trained AI, sophisticated decisions
- Balanced (all levels) : Not always best play (human errors integrated)
- Bots reset chips between sessions (unlimited funds)

#### Rewards & Chips

**Easy / Medium / Hard (Training - Stable Balance)**
- Normal XP received (12 XP/hand preflop, 35 XP win)
- Chips won/lost **NOT credited to wallet** (balance remains stable)
- Perfect for risk-free learning

**Expert (Competitive Mode - Real Chips)**
- Normal XP received
- Chips won/lost **CREDITED to real wallet**
- Highly trained AI, real game currency at stake
- Reserved for experienced players

### 4.7 Tools & In-Game Interface

**All three tools implemented and accessible at bottom-right of screen during game :**
- **CHAT** — Message button, opens emoji panel + quick messages
- **COMBIS** — "Hand Rankings" button, opens panel with 11 poker hands with examples
- **PROBAS** — Display button, shows winning probabilities in real time

#### 4.7.1 CHAT — Emoji & Quick Message Communication

**Access :**
- **CHAT** button at bottom-left of screen (before action buttons)
- Click → opens **two-tab panel** : Emojis + Quick messages
- Accessible before, during, after action

**Emoji Tab (20 Predefined Reactions) :**
Grid of 20 emojis representing common poker reactions:
```
🃏 Cards (2 emojis)         📱 Casino          🔥 Dynamic
💎 Diamonds                 😎 Cool            🚀 Rapid
🤔 Thoughtful               😰 Nervous         👑 Royal  
⚡ Lightning                🏆 Trophy          🎉 Party
😲 Shocked                  🤯 Mind Blown     ❄️ Cold
💰 Rich
```
- **Interaction :** Click emoji to send to table
- **Organization :** 5 columns grid (mobile) or 6 columns (desktop)
- **Display :** Emoji visible immediately for you; appears on other players' seats

**Quick Messages Tab (12 Preset Messages) :**
Scrollable list of 12 common poker messages (French/English depending on language):
```
1. "Well played!" 
2. "All-in!"
3. "I'm bluffing"
4. "What a hand!"
5. "Lucky shot"
6. "Warming up!"
7. "Impressive"
8. "GG WP"
9. "Risky"
10. "Easy"
11. "Oops"
12. "Incredible"
```
- **Interaction :** Click message to send instantly
- **Display :** Message appears as text above player's seat
- **Limit :** Max 500 characters per message (if custom input future)

**Visibility :**
- Emojis/Messages visible to **all players** (seated + spectators)
- Timestamp: Relative time ("just now", "5 sec ago")
- No filtering or censorship

**Utility :**
- Sociability: Engage conversation during game
- Strategy signals: Indicate bluff/value without words (mind games)
- Fun: Celebrate wins, react to spectacular plays

#### 4.7.2 COMBIS — Poker Hand Rankings Reference

**Access :**
- **COMBIS** button at bottom-right of screen (next to CHAT)
- Click → opens **left panel** : "Hand Rankings"
- Accessible during game, before action, after hand

**Content — 11 Hand Rankings (Best to Worst) :**

| Rank | Hand | Description | Example |
|---|---|---|---|
| 1 | **Royal Flush** | A-K-Q-J-10 same suit (best hand) | A♠K♠Q♠J♠10♠ |
| 2 | **Straight Flush** | 5 consecutive cards same suit | 9♥8♥7♥6♥5♥ |
| 3 | **Quads** (Four of a Kind) | 4 identical cards | K♠K♥K♦K♣ |
| 4 | **Full House** | Three of a kind + Pair | J♠J♥J♦6♣6♥ |
| 5 | **Flush** | 5 cards same suit (free order) | K♣9♣7♣5♣2♣ |
| 6 | **Straight** | 5 consecutive cards (mixed suits) | 8♠7♥6♦5♣4♠ |
| 7 | **Trips** (Three of a Kind) | 3 identical cards | 5♠5♥5♦ + kickers |
| 8 | **Two Pair** | 2 different pairs | Q♠Q♥3♦3♣ + kicker |
| 9 | **Pair** | 2 identical cards | 10♠10♥ + 3 kickers |
| 10 | **High Card** | Highest card (no pair) | A♠K♣Q♦J♥9♠ |

**Visual Display :**
- Each hand displays **card examples** (PNG/SVG visuals)
- Color code: Real colors (♠ black, ♥/♦ red)
- Text: Clear description for each hand

**Tie-breaking (Kickers) :**
- Explains how to compare if 2 players same ranking
- Example: "Pair of Kings with A-K-Q beats Pair of Kings with A-J-T"
- Visual: Kicker cards highlighted

**Utility :**
- **Learning :** Quick reference for hand strength
- **Strategy :** Identify if hand needs competitiveness
- **Clarity :** Resolves showdown disputes (impossible with UI)

#### 4.7.3 PROBAS — Probabilities Display & Current Hand

**Access :**
- **PROBAS** button at bottom-right of screen (after COMBIS)
- Display **real time** : % win chance + current hand
- **Draggable panel** (drag by header)
- Position saved in localStorage

**Content — 2 Sections :**

**1. Win Probability Gauge**
- **Numeric value :** "67% win chance" (large text)
- **Visual gradient bar :**
  - Green (80-100%) : Strong hand (favourite)
  - Yellow (50-79%) : Competitive (coin flip) 
  - Red (0-49%) : Weak hand (underdog)
- **Update :** Real time (each street: flop, turn, river)
- **Calculation :** Based visible cards + community cards + equity vs opponents
- **Caveat :** Assumes opponent random hand (can't read/bluff)

**2. Current Hand Display**
- **Hand name :** Ex: "Pair of Kings" | "Flush" | "Straight Draw"
- **Visual cards :** Display your 2 hole cards + best 5 community
- **Hand value :** Ranking (High card to Royal Flush)
- **Updated :** Recalculated each street (flop, turn, river)

**Controls :**
- **Draggable header :** Click + drag to reposition panel in viewport
- **Position saved :** localStorage retains position (reappears next session)
- **Resizable :** Corner drag to resize (optional)
- **Close :** × button (reopen via PROBAS)

**Physical Display :**
- **Positioning :** Default bottom-right (doesn't block action buttons)
- **Transparency :** Slightly transparent to see table behind
- **Contrast :** White text on semi-black background readable
- **Responsive :** Auto-adjusts mobile (can be resized)

**Utility :**
- **Quick decision :** Evaluate hand strength before acting
- **Learning :** Understand equity in common situations
- **Strategy :** Identify draw vs made hand quickly
- **Mental variance reduction :** Less "felt bad" on bad beats if you knew odds

---

## 5. CASINO GAMES

### 5.1 BLACKJACK

#### Objective
- Get hand closer to 21 than dealer (without bust)

#### Rules (MVP)

**Deck**
- 6 decks (312-card shoe)
- Automatically shuffled per session
- No card counting possible (crypto RNG)

**Cards & Values**
- Numeric (2-10): Face value
- Figures (J, Q, K): 10 points
- Ace (A): 11 or 1 (best value ≤ 21)
- *Soft hand* : Hand with Ace = 11 (ex: A+6 = 17 soft) — can hit without bust risk

**Natural Blackjack**
- Ace + Figure/10 in 2 cards
- Beats non-BJ automatically
- Payout : 3:2 (net gain = stake × 1.5, payout = stake + gain)
- If dealer also BJ → Push (money returned)

**Dealer Stand/Hit**
- Dealer plays by fixed rule (no decision)
- **Hit if** : Total < 17
- **Stand if** : Total ≥ 17
- **Soft 17 (A+6)** : Stand (common rule) — don't hit

**Payouts**
```
Player BJ vs Dealer non-BJ : 1.5 × bet (plus initial bet)
Player wins normal :         2 × bet (bet + gain)
Push (tie) :                 1 × bet (refunded)
Player bust :                0 (lose bet)
Dealer bust :                2 × bet
```

#### Available Actions

**2 Cards**
- **Hit** : Draw 1 additional card
- **Stand** : Stop, compare to dealer
- **Double Down** : Double bet, draw exactly 1 card (end hand)
  - Condition: Only with 2 initial cards
  - Ex: Player A-10, bet 50 → double to 100, draw 1 card → end

**No Split** (MVP v1)
- No ability to split pair (ex: 8-8 → two separate hands)
- Future development

#### Typical Gameplay

1. **Enter Bet** : 10-1000 chips
2. **Cards Dealt** : Player 2 cards (visible), dealer 1 visible + 1 hidden
3. **Player Decision** :
   - Hit → new card displayed (value updated)
   - Stand → end player action
   - Double (if 2 cards) : Bet × 2, 1 bonus card, end
   - Bust (> 21) ? → Instant loss, pot lost
4. **Dealer Plays** : Hit until ≥ 17
5. **Result Displayed** : Hands compared, payout calculated
6. **Balance Updated** : Gain added or loss debited

#### Basic Strategy (Player Advice)

**Hard Hands (no Ace counted 11) :**
```
8-11:     Always double (except very weak dealer)
12:       Hit except dealer 4-6 → Stand
13-16:    Hit vs dealer 7+ ; Stand vs 2-6
17+:      Always Stand
```

**Soft Hands (Ace = 11) :**
```
A+2, A+3: Hit
A+4, A+5: Double if dealer 4-6, else Hit
A+6:      Double if dealer 3-6, else Hit (soft 17)
A+7:      Stand vs 2,7,8; Double vs 3-6; Hit vs 9-K
A+8, A+9: Always Stand
```

### 5.2 EUROPEAN ROULETTE

#### Objective
- Bet number/color/section → Wheel spins → Match result

#### Wheel & Numbers

**Wheel**
- 37 cases: 0 (green) + 1-36 (red/black)
- Physical ranking: Specific order (wheel order constant)

**Red/Black Numbering** (Mnemonic)
```
Red: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
Black: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
Green: 0
```

**Sections**
- **Dozen** : 1st (1-12), 2nd (13-24), 3rd (25-36)
- **Column** : Col 1 (1,4,7,...34), Col 2, Col 3
- **Even/Odd** : 1-36 (even skip 0)
- **High/Low** : Low (1-18), High (19-36)

#### Bet Types

| Type | Coverage | Payout | Examples |
|------|----------|--------|----------|
| **Straight** | 1 number | 36:1 | Bet "17" |
| **Split** | 2 adjacent numbers | 18:1 | "16-17" or "0-1" |
| **Street** | 3 numbers in line | 12:1 | "1-2-3" |
| **Corner** | 4 numbers square | 9:1 | "1,2,4,5" |
| **Six Line** | 6 numbers 2 lines | 6:1 | "1-2-3-4-5-6" |
| **Dozen** | 12 numbers (1-12, 13-24, 25-36) | 3:1 | "First dozen" |
| **Column** | 12 numbers column | 3:1 | "Col 1" |
| **Red/Black** | 18 numbers color | 2:1 | "Red" |
| **Even/Odd** | 18 numbers even/odd | 2:1 | "Odd" |

**Payout Calculation**
```
Win = Bet × Multiplier
Payout = Bet + Win
Loss = 0 (bet lost if lose)
```

#### Limits

| Limit | Value |
|--------|--------|
| Min Bet / Line | 10 chips |
| Max Bet / Line | 750 chips |
| Max Stake Total | 5000 chips (all bets combined) |
| Max Bets/Spin | 40 bets |

#### Common Strategies

**Martingale** (not recommended):
- Double bet after loss → stop after win
- Risk: Losing streak can create huge final bet (bust bankroll)

**D'Alembert**:
- +1 bet unit after loss, -1 after win
- More stable but house edge still -2.7% (0 no advantage)

**Outside Bets Only**:
- Red/Black/Even/Odd (nearly 50% win, 2:1 payout)
- Lower variance, longer sessions

**Bankroll Management**:
- Limit session to 5-10 buyin
- Quit ahead (win limit 20-30% bankroll)
- Never chase losses

### 5.3 SLOT MACHINE

#### Objective
- Spin 3 reels → match symbols → win chips

#### Symbols & Weights

| Symbol | Weight | Frequency | Payout (3-of-kind) |
|---------|-------|-----------|-------------------|
| Cherry | 32 | 32% | 5× bet |
| Lemon | 24 | 24% | 8× bet |
| Bell | 18 | 18% | 10× bet |
| Seven | 14 | 14% | 15× bet |
| Diamond | 8 | 8% | 20× bet |

**Total weight: 96 (pairwise distribution)**

#### Payout Rules

**3 Identical (Brelan)**
```
Winnings = Bet × Multiplier (symbol-dependent)
Payout = Bet + Winnings
Example: 50 chips × 10 (Bell) = 500 refunded
```

**2 Identical (Pair)**
```
Winnings = 1× Bet (bet refund only)
Example: 50 chips pair = 50 chips refunded (no profit, break-even)
```

**No Match**
```
Loss = Bet lost entirely
```

#### Limits

| Parameter | Value |
|-----------|--------|
| Min Bet | 10 chips |
| Max Bet | 1000 chips |
| Max Bet (Level ≤ 25) | Progressive (500 level 1 → 1000 level 25+) |

#### RTP (Return to Player) Theoretical

```
RTP = (Sum of all payouts) / (Sum of all bets)
Quantum Bluff Slot: ~88-92% (standard)
Meaning: Over infinite spins, expect lose 8-12% house edge
```

#### Strategies

**Bankroll Management**:
- Spin limit: Max 50 spins per session
- Win target: 30-50% bankroll profit → quit
- Bet sizing: 1-2% bankroll per spin (prevents ruin)

**Symbol Frequency**:
- Cherry (32%) vs Diamond (8%) highly different
- Low variance/high hit: Cherry + Lemon
- High variance/potential: Diamond only

**No "Hot Streak"**:
- Crypto RNG → each spin independent
- Past results don't influence future
- Don't "double down" after losses (except strategy)

### 5.4 Accessing Casino Games

#### From Lobby
1. "MINIGAMES" Tab → Select Roulette/Slots/Blackjack
2. Click game → redirect to page (Blackjack → auto-create solo game)

#### Wallet Balance
- Balance displayed at top of page
- Bet entry: Auto-validate insufficient chips
- Post-spin: Balance updated (live) + ledger recorded

#### History

**Ledger Entries (visible in Wallet)**
- Type: "ROULETTE_SPIN", "SLOT_SPIN", "BLACKJACK_HAND"
- Amount: ±chips
- Timestamp: UTC time of spin
- Game ID: Reference

**Personal Stats**
- Biggest win roulette/slot/blackjack
- Total blackjack hands
- Win rate per game

---

## 6. PROGRESSION & REWARDS SYSTEM

### 6.1 Levels & XP

#### XP System

**Threshold per Level**
```
Formula: XP_threshold(L) = 50 × L × (L - 1)

Level 1: 0 XP (start)
Level 2: 100 XP
Level 3: 300 XP (200 XP since Lvl 2)
Level 4: 600 XP (300 XP since Lvl 3)
Level 5: 1000 XP (400 XP since Lvl 4)
...
Level 99: 482,550 XP (max level)
```

**Player Progression**
- Total XP tracked (cumulative)
- Level auto-calculated (live)
- XP to Next: UI displays progress bar

**Max Level**
- Cap: Level 99
- No XP after Lvl 99 (or counts but not used)

#### XP Sources

| Source | XP Received | Condition |
|--------|---------|-----------|
| **Poker Hand (Bot)** | 12 | Preflop played without fold |
| **Poker Hand Win (Bot)** | +20 | Win hand vs bots |
| **Poker Showdown Win** | 35 | Cash/tournament showdown win |
| **Poker Showdown Loss** | 10 | Showdown participated (not winning) |
| **Slot Spin** | 4 | Each spin (win or lose) |
| **Slot Win Bonus** | +8 | Win match (pair+ symbols) |
| **Roulette Spin** | 4 | Each spin |
| **Roulette Win Bonus** | +10 | Win roulette bet |
| **Blackjack Hand** | 5 | Each hand played |
| **Blackjack Win** | +10 | Hand won |
| **Login Streak** | 5/day | Each day new session |

#### Badges - Unlock by Level

| Badge | Level Required | Description |
|-------|--------------|-------------|
| Novice | 2 | New player |
| Player | 3 | Regular at the tables |
| Bluffer | 5 | Bluffing mindset |
| Strategist | 7 | Tactical play |
| High Roller | 10 | Big-stakes flair |
| Expert | 12 | Expert skill |
| Elite | 15 | Elite tier |
| Master | 18 | Full mastery |
| Champion | 22 | Champion status |
| Legend | 25 | Legendary |

**Auto-Unlock**
- Reach level threshold → badge instantly added
- History: Display unlock date on profile

**Badge Display**
- Public profile: All badges visible
- Leaderboard: Highest badge displayed beside name
- Lobby widgets: Recent unlock toast

### 6.2 Bet Limits by Level

#### Casino Games Max Bets

**Blackjack**
```
Max Bet = 1000 chips (fixed all levels)
```

**Slot Machine**
```
Level 1: 500 chips
Level 5: 600 chips
Level 15: 850 chips
Level 25+: 1000 chips (cap)
Formula: base=500, span=500, t=(L-1)/24 capped [0,1]
```

**Roulette**
```
Max per Line: 750 chips (fixed)
Max Total Stake: 5000 chips (all bets combined)
```

#### Poker Cash Games

**Available Blinds** (per level)
```
Level 1: 5/10, 10/20
Level 5: 5/10, 10/20, 25/50
Level 10: 5/10, 10/20, 25/50, 50/100
Level 15+: All blinds available
```

**Min Balance Required** (table dependent)
```
Table asks: Min balance = 2× BB (ex: 50/100 → 200 chips min)
Server-side verification before join
```

### 6.3 Daily Challenges & Login Streak

#### Daily Challenges

**Reset**
- Midnight UTC each day
- New challenge automatically assigned
- Max 1 challenge active per day

**Examples**
- "Win 3 poker hands vs opponents"
- "Spin roulette 5 times"
- "Play 2 blackjack hands"
- "Complete 1 full poker tournament"

**Reward**
- Bonus XP: +25 XP (if completed)
- Bonus chips: +100-200 chips (optional, vary)
- Visible on lobby dashboard (progress bar)

**Display**
- Card widget: Challenge text + progress (ex: "2/3 wins")
- Countdown: Time until reset
- Complete notification: Toast "Challenge completed!"

#### Login Streak

**Mechanic**
- Day 1 login: Streak = 1
- Day 2 login (< 24h after day 1): Streak = 2
- Day 3 login (< 24h after day 2): Streak = 3
- Miss day: Streak reset to 1

**Streak Rewards**
```
Day 1: 5 XP
Day 2: 10 XP
Day 3: 15 XP
Day 4: 20 XP
Day 5: 25 XP (cap)
```

**Display**
- Profile page: Streak counter ("X day streak")
- Lobby dashboard: Calendar visual (checked days)
- Notification: Streak maintained/reset alert

### 6.4 Casino & Poker Rewards

#### Cash Game Rewards
- Chips won: Transferred directly to balance
- XP: Via formula per action
- No fixed bonus (other than XP)

#### Tournament Rewards

**Prize Distribution** (structured)
- Customizable by tournament creator
- Typical: Top 3 guaranteed, remaining diluted
- Example 128-player tournament:
  - 1st: 5000 chips
  - 2nd: 3000 chips
  - 3-6: 1200 chips
  - 7-15: 500 chips
  - Rest: None

**Bonus XP Tournament**
```
Round 1-4 elimination: +10 XP × (round number)
Top 10 placement: +50 XP
1st Place: +100 XP (cumulative)
```

---

## 7. SOCIAL INTERACTIONS

### 7.1 Friends System

#### Add a Friend

**User Search**
1. "Friends" Tab → "Find Friends" search bar
2. Type username or email (partial search supported)
3. Results display user card: Avatar, Level, Stats, Action button

**Send Request**
- Click "Add Friend" button
- Status changes to "Request Sent"
- Notification on recipient side: Toast + Friends tab badge

**Acceptance**
- Recipient: Friends tab → "Pending Requests"
- Accept/Decline buttons
- If accept: Bidirectional friendship created
- If decline: Request removed, no friendship

#### Manage Friends List

**Display**
- Avatar, Username, Level, Status (Online/Offline/Playing)
- Filter: Online/Offline/All
- Sort: Recent, Oldest, Alphabetical

**Actions**
- Click friend → profile popup (stats, level, join game)
- "Invite to Game" → invite table/tournament
- "Block" → user blocked (no further contact)
- "Remove Friend" → friendship deleted
- "Message" → opens DM chat

### 7.2 Private Messages System

#### Send Message

1. Click friend → open chat panel
2. Enter message text
3. Click send or press Enter
4. Message delivered (queue live socket)

**Message Rules**
- Max 500 chars per message
- Link censoring: URLs rewritten or removed (anti-spam)
- Timestamp displayed: UTC time
- Seen status: "Delivered" / "Seen"

#### Chat History
- Old conversations loaded (pagination)
- Limit: Last 100 messages per conversation
- Clear history: Purge button (irreversible)

#### Notifications
- Friend login: Toast "X came online"
- New message: Toast + Friends tab badge
- Sound alert: Optional (settings control)

### 7.3 Loans Between Friends System

#### Concept
- Player A lends chips to Player B
- Annual interest rate configured
- Repayment: B pays principal + interest
- Automatic: Portion of wins auto-deducted for repayment

#### Create a Loan

**"Request Loan" Dialog**
1. Select borrower friend
2. Principal amount (ex: 500 chips)
3. Choose repayment rate (10%, 15%, 20%, 25%, 30%, 40%, 50%)

**Annual Interest Rate** (based on repayment rate)
```
Repayment % | Annual Interest %
10%         | 30%
15%         | 24%
20%         | 18%
25%         | 14%
30%         | 10%
40%         | 7%
50%         | 5%
```

**Calculate Amount Due**
```
Total Due = Principal + (Principal × Interest% / 100)
Example: 500 principal @ 20% rate (18% annual)
Interest = 500 × 18 / 100 = 90 chips
Total Due = 590 chips
```

**Validation Fees**
- Lender balance ≥ principal (else `INSUFFICIENT_CHIPS` error)
- Borrower accepts terms

#### Manage Loans

**Loan Status**
- **PENDING** : Borrower not yet accepted
  - Borrower: Request notification, Accept/Decline buttons
  - Lender: Wait for response
  
- **ACTIVE** : Loan in progress
  - Timer: Show accumulated interest (live calc)
  - Remaining Due: Principal + current accumulated interest
  - Gain monitoring: Borrower gains tracked (auto-repay detected)
  
- **REPAID** : Fully settled
  - History: Visible in loan history
  - Date/Amounts displayed

- **CANCELLED** : Cancelled
  - By lender before acceptance
  - Chips returned to lender

#### Auto-Repayment

**Mechanic**
1. Borrower plays & wins chips
2. Gain calculation: Payout - Buy-in
3. Repayment slice = Gain × (Repayment Rate %) / 100
4. Slice caps at remaining due
5. Slice auto-deducted, lender receives

**Example**
```
Loan: 500 principal, 20% repayment rate (18% annual)
Total Due initially: 590 chips
Borrower plays hand:
  - Bet 50, win 200 → Gross gain = 150 chips
  - Repayment slice = 150 × 20% = 30 chips
  - Balance after auto-repay: 150 - 30 = 120 chips (new balance)
  - Lender receives: +30 chips
  - Remaining Due: 590 - 30 = 560 chips

Next win:
  - Bet 100, win 300 → Gross = 200
  - Slice = 200 × 20% = 40
  - Remaining Due: 560 - 40 = 520 chips
```

**Limits**
- Max 1 active loan per borrower (cannot stack)
- Max amount: Lender balance (min check)
- Min amount: 10 chips
- Auto-repay stop: Borrower balance = 0 (no more slices possible)

#### Loan History

**Loans Panel**
- List all loans (active + closed)
- Filter: Active/Completed
- Details: Principal, Rate, Accumulated interest, Total Due, Status
- Timeline: Date opened/repaid

### 7.4 Invitations & Joins

#### Invite Friend to Table

**Method 1 : From Table**
1. Create/join table
2. Menu → "Invite Friend"
3. Select friend
4. Invitation sent (direct message + notification)

**Method 2 : From Friends Panel**
1. Click friend → Profile popup
2. Button "Invite to Game"
3. Select game/table (if multiple)
4. Send invitation

#### Accept Invitation
- Notification toast: "X invited you to [Table Name]"
- Click → auto-navigate to table lobby
- Join button active (if seat available)

#### Block / Unblock

**Block User**
1. Friends tab → User action menu
2. Click "Block"
3. User blocked: Cannot message, invite, send requests

**Unblock**
- Friends tab → "Blocked Users" list
- Click user → "Unblock"
- Block cleared, normal interaction restored

---

## 8. WALLET MANAGEMENT

### 8.1 Balance & Chips

#### Display Balance
- **Header top** : Chips counter prominent (ex: "12,450 chips")
- **Games** : Updated live post-hand
- **Sync** : Auto-fetch server every 30 sec (ensures correctness)

#### Transaction History

**Ledger Types**
```
POKER_CASH_GAME     Poker cash win/loss
POKER_TOURNAMENT    Tournament payout
BLACKJACK_HAND      Blackjack hand result
ROULETTE_SPIN       Roulette spin result
SLOT_SPIN           Slot spin result
HIDDEN_BET_SETTLED  Hidden bet (prop bet) settled
GIFT_CODE_REDEEMED  Gift code bonus
PROMO_CODE_REDEEMED Promo code bonus
FRIEND_LOAN_CREATED Loan principal debit (lender) or credit (borrower)
FRIEND_LOAN_REPAID  Auto-repay debit (borrower) or credit (lender)
```

**Details Displayed**
- Type: Transaction category
- Amount: ±chips
- Timestamp: UTC time
- Game ID: Game reference (if applicable)
- Balance Before/After: Balance before and after

#### Free Recharge

**Promo Code: QUANTUM**
- Default dev/staging (can be changed in production)
- Adds 1000 chips
- Cooldown: 24 hours between uses
- Button "Free Recharge" in lobby if available

**Validation**
- Server-side validation (anti-exploit)
- Once/day per user
- Chips added directly to balance

### 8.2 Cheat Prevention

#### Server Validations
- Balance check pre-action (insufficient chips reject)
- Bet validation: Min/max caps controlled
- Crypto RNG: All game results from server RNG
- Ledger immutable: Transactions recorded irreversibly

#### Rate Limiting
- API endpoints throttled (prevent abuse)
- Websocket message queuing (limit flood)
- Login attempts: Max 5/minute per IP (account protection)

---

## 9. TIPS & STRATEGIES

### 9.1 Poker - Fundamental Tips

#### Position Importance
**Early Position (UTG, UTG+1)**
- Play tight: Top 15% hands (AA, KK, QQ, AK)
- Avoid marginal hands
- Reason: Many players to act after = high chance better hand vs you

**Middle Position (MP1, MP2)**
- Slightly widened: Top 20% hands
- Include mid-pairs (TT, JJ), good aces (AJ+)

**Late Position (CO, Button)**
- Widen range: Top 30% hands, plus combos (suited connectors)
- Steal blinds with wide range if aggressive image
- Advantage: Act last postflop

**Blind Positions (SB, BB)**
- Defend: Call raises with wider range
- BB: Check option if nobody raises (free look flop)
- SB: Reduced range (2nd position discomfort)

#### Bet Sizing
- **Preflop raise** : 3-3.5× BB (standard)
- **Postflop bet** : 50-75% pot
- **Raise** : Min 1× previous bet
- **All-in** : Only when necessary (short stack, premium hand)
- **Bluff** : Less frequent early stages; increase deep stacks

#### Fold Equity & Showdown Value
- **Fold equity** : Chance opponent folds vs bluff
- **Showdown value** : Hand strength absolute (high card pair+)
- Mix bluffs and value bets for balance
- Tight image = bluffs work better; loose image = need value

#### Bankroll Management
- Never play above comfort level
- Min 20 buyins cash game, 50 tournament
- Stop loss: Walk away after fixed loss amount (ex: 5 buyins)
- Win rate tracking: Know expected hourly profit

### 9.2 Casino - Variance & Expectation

#### Slots - House Edge
- RTP ~90%: Average lose 10% chips long term
- Volatility high: Significant variance (big wins/losses normal)
- Short sessions: Exploit randomness (lucky days possible)
- Never chase: Past losses don't predict futures

#### Roulette - Edge Math
- House edge: 2.7% (zero unique)
- All bets: Same house edge (no "better" bets)
- Trends non-existent: Each spin independent
- Martingale risk: Losing streaks create unfunded bets

#### Blackjack - Basic Strategy Value
- Basic strategy: Reduces house edge ~0.5%
- Card counting impossible (shoes reshuffled constantly)
- Insurance: Avoid (bad EV long term)
- Soft 17: Hit A+6 vs dealer (not stand)

### 9.3 Leveling Efficiently

#### XP Optimal Farm
1. **Bot Tables** : 12 XP/hand (reliable, always available)
2. **Roulette Spins** : 4 XP + 10 potential (if win)
3. **Slot Spins** : 4 XP + 8 potential (if win)
4. **Cash Games** : High variance, but 35 XP per win

#### Progression Timeline
```
Level 1-5: Bot tables (quick learning, easy XP)
Level 5-15: Mix cash games + casino (XP plateau, but socializing)
Level 15+: Focus cash/tournaments (higher stakes, better peers)
```

#### Daily Routine
1. Login: +5 XP streak
2. Daily challenge: +25 XP (if completed)
3. 10 bot hands: +120 XP
4. Few roulette spins: +40-60 XP
5. Total: ~200 XP/day (conservative)

### 9.4 Bankroll Management

#### Allocation Strategy
```
Total Balance: 10,000 chips
Cash Games (60%): 6000 chips → 20 buyins @ 300
Casino (20%): 2000 chips → 200 spins @ 10 avg
Tournaments (20%): 2000 chips → 2-4 tournaments @ 500-1000
```

#### Risk Management
- Never play entire bankroll one session
- Max loss/session: 10-20% bankroll
- Win target: 30-50% session → leave table
- Track win rate: Adjust blind/stake level if downswing

#### Regain from Losses
- Reduce stakes (move down blind levels)
- Increase casino play (higher RTP odds)
- Focus bot tables (consistent XP, minimize variance)
- Ask friend loan if motivated (pay back via winning)

### 9.5 Milestones & Checkpoints

| Level | Milestone | Badges |
|--------|-----------|--------|
| Lvl 1-3 | First 100 hands poker | Novice → Player |
| Lvl 5 | First big win casino | Bluffer |
| Lvl 10 | First tournament cash | High Roller |
| Lvl 15 | 1000 total XP | Elite |
| Lvl 25 | 5000 total XP | Legend |
| Lvl 50 | 50,000 total XP | XP climb continues (bet caps rise) |

---

## 10. INTERACTIVE TUTORIAL & HELP

### 10.1 Getting Started Guide (First-Time Experience)

**Auto-Trigger :**
- On your first login after registration, tutorial displays automatically
- Launched 450ms after entering lobby to let interface load
- You are **not required** to follow it — you can skip anytime

**Duration & Difficulty :**
- 13 lobby steps + 8-10 game steps (optional)
- Total duration: about 5-8 minutes
- No complex mechanics — gentle intro to key concepts

### 10.2 Lobby Tutorial (13 Steps)

Educational spotlight guides you through each zone:

| Step | Highlighted Zone | Learning |
|-------|---|---|
| 1 | Welcome | Welcome & game objectives |
| 2 | Header | Top navigation (profile, settings) |
| 3 | Tabs | Poker / Minigames / Blackjack |
| 4 | Bot Practice | Training alone vs AI |
| 5 | Multiplayer | Join real player tables |
| 6 | Waiting Rooms | Understand waiting lists |
| 7 | Games in Progress | Spectate live games |
| 8 | Minigames | Roulette & Slots quick games |
| 9 | Blackjack | Game 21 solo & multiplayer |
| 10 | Daily Challenges | Daily challenges for XP |
| 11 | Friends | Friends list & private messages |
| 12 | Done | Summary & lobby tutorial end |

**Controls :**
- **Next** : Right chevron button → advance step
- **Previous** : Left chevron button → go back
- **Skip** : × button → close and continue freely

### 10.3 Game Tutorial (Optional)

**Access :**
- Offered at end of lobby tutorial ("Next: your first hand" button)
- Or find it via **?** button at top of lobby

**Content :**
- Complete heads-up poker game vs scripted bot
- You are BTN+SB, bot is BB
- Full poker hand guided (preflop → flop → turn → river → showdown)

**Typical Steps :**
1. Blind rules (explained visually)
2. Your hole cards (K♠Q♠)
3. Preflop action (you decide: fold/check/raise)
4. Bot responds automatically
5. Flop → community cards revealed
6. Your flop action (check/bet/raise)
7. Turn & River (same system)
8. Showdown — compare hands & rankings
9. Your ranking displayed (ex: "Pair of Kings")

**Educational Spotlight :**
- Highlighted zones: pot, hero cards, bot cards, actions, rankings table
- Detailed explanatory text for each concept
- You can only progress if you click the expected action

**End :**
- Green **COMPLETE** button after showdown
- You're returned to lobby
- Tutorial marked as "completed" server-side

### 10.4 Access Tutorial Later

**From Anywhere (Lobby or Game) :**
- Look for **purple circular button with ?** icon at **bottom-left** of screen (fixed position)
- Click → opens help modal with detailed sections
- Accessible everywhere: lobby, during game, spectate, etc.
- Close: Click "Got it!" button or click outside modal

**Settings :**
- Settings button at top of lobby
- Access Audio, Aesthetic, Accessibility settings
- You can also rate the game from there (see section 11)

### 10.5 Tutorial Tips

- **Go at your pace** — no time limit per step
- **Click the highlighted zone** if you want more details
- **Go back** with "Previous" button if you missed something
- **After tutorial**, game is unlocked — play without restrictions
- **Replay anytime** — tutorial is repeatable from lobby

---

## 11. FEEDBACK & GAME RATING

### 11.1 Rating System

**Why Rate?**
- We collect your feedback to improve the game
- Your ratings & comments help our dev team
- Every evaluation is taken seriously

**Auto-Trigger :**
- After every **5th completed game** (5, 10, 15, 20... games)
- Light modal displays at end of game
- Completely optional — you can always answer "Later"

**Anti-spam :**
- Each game counted once (no duplicate even with multi-tabs)
- You're asked only once every 5 games

### 11.2 "Rate the Game" Modal

**Appearance :**
```
┌─────────────────────────────────┐
│  RATE THE GAME                  │
├─────────────────────────────────┤
│  Do you like Quantum Bluff ?    │
│                                  │
│  [☆][☆][☆][☆][☆]               │  1-5 stars (clickable)
│                                  │
│  Comment (optional) :           │
│  [Your opinion on the game...]  │  max 2000 characters
│                                  │
│  [Later]      [Send]            │
└─────────────────────────────────┘
```

**Steps :**
1. **Select a rating** : Click 1 to 5 stars (5 = excellent)
   - Stars fill in gold
   - You can change before submitting
   
2. **Add a comment** (optional) :
   - Text area for your remarks
   - Limited to 2000 characters
   - Suggestions: "Love poker but blackjack has a bug", "Clean and smooth interface", etc.
   
3. **Submit or Report** :
   - **Send** : Validate & send your data
   - **Later** : Close modal (you'll be asked again in 5 games)

### 11.3 Manual Rating (Settings)

**Access :**
- From anywhere: click Settings button
- Settings modal opens with 3 tabs: Aesthetic, Audio, Accessibility
- **At bottom of modal** : Button to rate the game

**Differences :**
- No auto-trigger
- Same rating modal displays
- You can rate as many times as you want manually

### 11.4 What We Do With Your Ratings

**Storage :**
- Your ratings sent to `/api/feedback/game-rating`
- Stored securely server-side (associated with your account)
- Never shared publicly

**Analysis :**
- **Global ratings** : Overall average (ex: "4.8/5 stars")
- **Trends** : Tracked over time (if rating drops, we investigate)
- **Comments** : Read manually by support team

**Actions :**
- Rating ≤ 2 stars + comment → support priority (we contact you)
- Repeated negative feedback → analyze bugs
- Positive feedback → team motivation & roadmap

### 11.5 Rating FAQ

**Q: Are my ratings anonymous?**
A: No, they're associated with your account. But your feedback is respected & never used against you. Be honest!

**Q: Can I change my mind after rating?**
A: Currently no (one rating = final). But if you have follow-up, contact support & we'll address it.

**Q: Is 5 stars required?**
A: You must rate at least 1 star to submit. But nothing forces enthusiasm — 2-3 star critical ratings help us too!

**Q: What if I have a bug to report?**
A: Ratings < 3 stars with detail → include: bug name, when it happened, and how to reproduce it.

---

## GLOSSARY

- **All-in** : Commit all remaining chips
- **Blind** : Forced small/big bet before cards
- **Bluff** : Bet weak hand hoping opponent folds
- **Buy-in** : Chip amount to play table
- **Bust** : Exceed 21 in blackjack
- **Call** : Equalize bet
- **Chip** : Virtual game currency unit
- **Flop** : First 3 community cards
- **Fold** : Abandon hand
- **Head-up** : 2-player poker
- **Kicker** : Unpaired card assist tiebreak
- **Level** : Player progression (1-99)
- **Pot** : Chips at center (accumulated)
- **Raise** : Increase bet
- **River** : 5th last community card
- **Showdown** : Cards revealed, winner determined
- **Soft Hand** : Hand with Ace counted 11
- **Stack** : Total chips player has
- **Street** : Action round (preflop, flop, turn, river)
- **Turn** : 4th community card
- **Wallet** : Personal chip balance

---

## SUPPORT & TROUBLESHOOTING

### Frequently Asked Questions

**Q: Forgot password?**
A: Auth menu → "Forgot Password" → answer security question → new password

**Q: Where to find my avatar?**
A: Profile → Edit → Avatar section (upload image)

**Q: How to unlock all blinds?**
A: Progress level (level 15+ unlock all blinds)

**Q: Can you cancel a friend loan?**
A: Lender can cancel if borrower hasn't accepted.
Otherwise: Auto-repayment continues until settled

**Q: Is RNG fair?**
A: Crypto RNG server-side, not client-side, verified seeded

### Contact Support
- **Email** : support@quantumbluff.com

---

## VERSION & CHANGELOG

**Version** : 1.0 (MVP)
**Date** : May 2026
**Last Updated** : 2026-05-16

**Implemented Features :**
- Poker cash games & tournaments
- Blackjack solo + multi
- Roulette & Slots
- XP/Level/Badges
- Friends & Messages
- Friend Loans
- Leaderboards
- Mobile apps (iOS/Android via Capacitor)

**Coming Soon (Future) :**
- 2FA (Two-Factor Authentication) - Backend implemented, UI in progress
- Blackjack Split option
- More casino games (Baccarat, Craps)
- Video poker
- Poker variants (Omaha, Stud)
- Clan/Team system
- Live tournaments
- Sponsorship system

---

**END OF USER GUIDE**

*Complete document generated for new & existing users. Share widely & update regularly with new features.*
