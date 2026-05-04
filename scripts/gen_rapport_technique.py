#!/usr/bin/env python3
"""
Rapport technique dense (~N lignes exactes), sans remplissage sémantique :
- extraits de code source préfixés (vérité terrain)
- schéma Prisma ligne à ligne
- inventaire fichiers (TS/TSX/py/prisma) hors node_modules
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Docs" / "Rapport_final" / "RAPPORT_TECHNIQUE_COMPLET.md"
TARGET = int(os.environ.get("RAPPORT_LINES", "10000"))


def sh_lines(cmd: list[str]) -> list[str]:
    p = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return [ln for ln in p.stdout.splitlines() if ln.strip()]


def emit_file(lines_out: list[str], tag: str, rel: str, max_lines: int | None = None) -> None:
    path = ROOT / rel
    if not path.is_file():
        lines_out.append(f"| ERR | {tag} | missing `{rel}` |")
        return
    raw = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if max_lines is not None:
        raw = raw[:max_lines]
    for i, ln in enumerate(raw, start=1):
        # une seule ligne markdown : pas de pipe non échappé dans le contenu (rare)
        safe = ln.replace("|", "\\|")
        lines_out.append(f"| {tag} | `{rel}` | L{i:05d} | {safe} |")


def main() -> None:
    lines: list[str] = []

    def W(s: str = "") -> None:
        lines.append(s)

    W("# RAPPORT_TECHNIQUE_COMPLET — Quantum Bluff (densité code)")
    W("")
    W("> **Fmt** : `| TAG | chemin | Lno | code |` — extraits sources ; `PRM` = Prisma ; `INV` = inventaire fichier.")
    W("> **Cible** : lignes totales = **{}** (généré)".format(TARGET))
    W("")

    W("## SYN — Synthèse ultra-compacte (jeux + IA + RT)")
    W("- **POK_MP** : cash + tournoi via `Socket.IO` (`PLAYER_ACTION`, snapshots `GAME_UPDATE`/`GAME_STATE_UPDATED`) + orchestrateur `applyPokerAction`.")
    W("- **POK_BOT** : practice `POST /api/game/bot/start` (`practice-bot-*`) + bots `qb-bot-*` ; actions `POST /api/bot/action` ; showdown winner `POST /api/bot/evaluate-winner` ; fin main `POST /api/game/record-result` (`persistChips` si expert).")
    W("- **IA_EXP** : `difficulty=expert` → `decideBotActionWithExpertAi` → HTTP FastAPI `server/ai-service` si activé ; sinon heuristique `expertBotDecision` (`server/src/logic/botAI.ts`).")
    W("- **IA_NON_EXP** : `easy|medium|hard` → `decideBotAction` pur TS (`normalizedHandStrength` + règles par palier).")
    W("- **CAS_ROU** : `POST /api/roulette/spin` TX Prisma + ledger + XP (fallback gamification si erreur).")
    W("- **CAS_SLOT** : `POST /api/slot/spin` TX + XP + ledger.")
    W("- **BJ_SOLO** : `POST /api/blackjack/start|action`.")
    W("- **BJ_MULTI** : `POST /api/blackjack-tables/*` REST + état ; synchro temps réel via GW (`JOIN_BLACKJACK_TABLE`, `BLACKJACK_TABLE_UPDATE`).")
    W("- **HB** : `hidden-bets` : quote/place/markets/history/ticket.")
    W("- **TRN** : `/api/tournaments/*` + cron `tournament.cron` + service `TournamentService` (buy-in/rebuy côté wallet).")
    W("- **FRD** : `/api/friends/*` + `/api/invitations/*` : demandes, accept/reject, recherche, statut WS `FRIEND_STATUS_CHANGED`.")
    W("- **LOAN** : `/api/friends/loans/*` : demande prêt, accept/reject/cancel, ledger interne prêt.")
    W("- **WRM** : `/api/waiting-room/*` : création salle poker, join/leave/ready/start, rematch, join-requests privées.")
    W("- **DCH** : `/api/daily-challenges/*` : progression + claim récompense.")
    W("- **LDB** : `/api/leaderboard/*` : agrégation stats publiques.")
    W("- **FBK** : `/api/feedback/game-rating` : note + message.")
    W("- **RPT** : `/api/reports/player` : signalement joueur + console admin lecture.")
    W("- **ADM** : `/api/admin/console/*` (JWT rôle admin) ; routes dev `/api/admin/*` runtime désactivées en prod (`index.ts`).")
    W("- **2FA** : `/api/auth/2fa/*` TOTP enable/verify/disable sur `User.totpSecret`.")
    W("- **UPD** : `/updates/latest` : flux mises à jour client/Electron.")
    W("- **SEC** : JWT REST + JWT WS ; Helmet+CSP ; CORS allowlist ; RL global + RL domaines ; idempotency header ; anti-cheat middleware + checks réaction.")
    W("")

    W("## SRC — Extraits code (cœur jeux + IA + gateway)")
    chunks: list[tuple[str, str, int | None]] = [
        ("AI_PY", "server/ai-service/main.py", None),
        ("AI_DEC", "server/ai-service/poker/decision.py", None),
        ("BOT_AI", "server/src/logic/botAI.ts", None),
        ("BOT_SVC", "server/src/services/botAi.service.ts", None),
        ("BOT_RT", "server/src/routes/bot.routes.ts", None),
        ("GAME_API", "server/src/routes/game.api.routes.ts", None),
        ("PRAC", "server/src/poker/services/practiceBotTurns.service.ts", None),
        ("ROU", "server/src/routes/roulette.routes.ts", None),
        ("SLOT", "server/src/routes/slot.routes.ts", None),
        ("HB", "server/src/routes/hiddenBets.routes.ts", None),
        ("BJ", "server/src/routes/blackjack.routes.ts", None),
        ("BJM", "server/src/routes/blackjackMulti.routes.ts", None),
        ("GW", "server/src/sockets/game.gateway.ts", None),
        ("GTS", "server/src/index.ts", 320),
        ("CFG", "server/src/config/env.ts", 220),
        # tronqué pour tomber pile ~10k avec PRM+SYN+INV (voir calcul dans `gen_rapport_technique.py`)
        ("CL_GAME", "client/src/pages/Game.tsx", 487),
        ("CL_BOT", "client/src/pages/BotConfiguration.tsx", None),
        ("CL_R", "client/src/pages/Roulette.tsx", 650),
        ("CL_S", "client/src/pages/SlotMachine.tsx", 550),
        ("CL_SOCK", "client/src/contexts/SocketContext.tsx", 220),
        ("CL_API", "client/src/utils/apiBase.ts", None),
    ]
    for tag, rel, mx in chunks:
        emit_file(lines, tag, rel, mx)

    W("")
    W("## PRM — `server/prisma/schema.prisma` (intégral)")
    emit_file(lines, "PRM", "server/prisma/schema.prisma", None)

    W("")
    W("## INV — inventaire fichiers (TS/TSX/py/prisma)")
    files = sh_lines(
        [
            "find",
            str(ROOT),
            "(",
            "-path",
            "*/node_modules/*",
            "-o",
            "-path",
            "*/.git/*",
            "-o",
            "-path",
            "*/.venv/*",
            "-o",
            "-path",
            "*/venv/*",
            "-o",
            "-path",
            "*/dist/*",
            "-o",
            "-path",
            "*/dist-electron/*",
            "-o",
            "-path",
            "*/src/generated/*",
            ")",
            "-prune",
            "-o",
            "-type",
            "f",
            "(",
            "-name",
            "*.ts",
            "-o",
            "-name",
            "*.tsx",
            "-o",
            "-name",
            "*.py",
            "-o",
            "-name",
            "*.prisma",
            ")",
            "-print",
        ]
    )
    rels = sorted(Path(f).relative_to(ROOT).as_posix() for f in files)

    # compléter jusqu'à TARGET en ajoutant INV, sinon tronquer
    for rp in rels:
        if len(lines) >= TARGET:
            break
        lines.append(f"| INV | `{rp}` |")

    if len(lines) > TARGET:
        del lines[TARGET:]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines[:TARGET]) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} lines={min(len(lines), TARGET)}")


if __name__ == "__main__":
    main()
