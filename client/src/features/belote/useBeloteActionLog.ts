import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HandActionLogEntry } from "../../components/HandActionLogPanel";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";
import {
  formatBeloteActionLogLine,
  type BeloteLastAction,
} from "./beloteActionLogFormat";
import { parseBeloteActionLogLine } from "./beloteActionLogParse";
import type { BeloteSanitizedState } from "./useBeloteSocket";

export function useBeloteActionLog(
  gameId: string | null,
  state: BeloteSanitizedState | null,
  myUserId: string | undefined,
) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<HandActionLogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const lastVersionRef = useRef(0);
  const dealLogIdRef = useRef<string | null>(null);

  const appendFromAction = useCallback(
    (action: BeloteLastAction) => {
      const line = formatBeloteActionLogLine(action, t, myUserId);
      setEntries((prev) => [
        ...prev.slice(-99),
        { id: `b-${action.actionVersion}`, line },
      ]);
    },
    [t, myUserId],
  );

  useEffect(() => {
    const dealId = state?.dealLogId ?? null;
    if (dealId && dealLogIdRef.current && dealId !== dealLogIdRef.current) {
      setEntries([]);
      lastVersionRef.current = 0;
    }
    if (dealId) dealLogIdRef.current = dealId;
  }, [state?.dealLogId]);

  useEffect(() => {
    if (state?.actionVersion != null) {
      lastVersionRef.current = Math.max(lastVersionRef.current, state.actionVersion);
    }
  }, [state?.actionVersion]);

  useEffect(() => {
    const la = state?.lastBeloteAction;
    if (!la || la.actionVersion <= lastVersionRef.current) return;
    lastVersionRef.current = la.actionVersion;
    appendFromAction(la);
  }, [state?.lastBeloteAction, appendFromAction]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    setEntries([]);
    lastVersionRef.current = 0;
    dealLogIdRef.current = null;

    const token = getAuthItem("token");
    fetch(apiUrl(`/api/belote-rooms/game/${gameId}/action-log`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: { entries?: string[]; dealLogId?: string } | null,
        ) => {
          if (cancelled || !data?.entries?.length) return;
          if (data.dealLogId) dealLogIdRef.current = data.dealLogId;
          const restored = data.entries
            .map((line, i) => {
              const parsed = parseBeloteActionLogLine(line);
              if (!parsed) return null;
              return {
                id: `restored-${i}`,
                line: formatBeloteActionLogLine(parsed, t, myUserId),
              };
            })
            .filter((e): e is HandActionLogEntry => e != null);
          if (restored.length > 0) {
            setEntries(restored);
            lastVersionRef.current = restored.length;
          }
        },
      )
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [gameId, t, myUserId]);

  return { entries, open, setOpen };
}
