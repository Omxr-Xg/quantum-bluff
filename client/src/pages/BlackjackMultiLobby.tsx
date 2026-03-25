import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

/**
 * Ancienne route `/blackjack/lobby` — redirige vers le lobby principal (onglet Blackjack).
 */
export function BlackjackMultiLobby() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();

  useEffect(() => {
    if (roomId) {
      navigate(`/lobby?tab=blackjack&bjRoom=${encodeURIComponent(roomId)}`, { replace: true });
    } else {
      navigate("/lobby?tab=blackjack", { replace: true });
    }
  }, [navigate, roomId]);

  return null;
}
