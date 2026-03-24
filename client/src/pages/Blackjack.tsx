import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { apiUrl } from "../utils/apiBase";
import { BlackjackLobbyBackdrop } from "../components/blackjack/BlackjackLobbyBackdrop";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Blackjack « solo » : même pipeline que créer une table + démarrer (une place, pas d’autres joueurs),
 * puis redirection vers `/blackjack/table/:gameId` (UI multijoueur).
 */
export function Blackjack() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const create = await fetch(apiUrl("/api/blackjack-tables"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            name: t("bjMulti.soloRoomName"),
            maxSeats: 2,
            minBet: 10,
            visibility: "PRIVATE",
          }),
        });
        if (!create.ok) {
          const err = (await create.json().catch(() => ({}))) as { error?: string };
          const msg = err.error ?? t("bjMulti.soloRoomFailed");
          setError(msg);
          addToast(msg, "error");
          return;
        }
        const { room } = (await create.json()) as { room: { id: string } };
        const start = await fetch(apiUrl(`/api/blackjack-tables/${room.id}/start`), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({}),
        });
        if (!start.ok) {
          const err = (await start.json().catch(() => ({}))) as { error?: string };
          const msg = err.error ?? t("bjMulti.soloStartFailed");
          setError(msg);
          addToast(msg, "error");
          return;
        }
        const { gameId } = (await start.json()) as { gameId: string };
        navigate(`/blackjack/table/${gameId}`, { replace: true });
      } catch {
        const msg = t("bjMulti.soloRoomFailed");
        setError(msg);
        addToast(msg, "error");
      }
    })();
  }, [navigate, t, addToast]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0608] p-6">
      <BlackjackLobbyBackdrop />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        {!error ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-rose-400" />
            <p className="max-w-sm text-sm text-rose-200/80">{t("bjMulti.soloStarting")}</p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/lobby?tab=blackjack")}
            className="rounded-xl bg-rose-700 px-6 py-3 font-bold text-white transition hover:bg-rose-600"
          >
            {t("bjMulti.backToLobby")}
          </button>
        )}
      </div>
    </div>
  );
}
