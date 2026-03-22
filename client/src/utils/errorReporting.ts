/**
 * Point d’extension pour le monitoring (Sentry, LogRocket, backend /logs, etc.).
 * Définir `VITE_SENTRY_DSN` ou brancher `window.__QB_REPORT_ERROR__` en prod.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[QB]", context ?? {}, err);

  const hook = (window as Window & { __QB_REPORT_ERROR__?: (e: Error, c?: Record<string, unknown>) => void })
    .__QB_REPORT_ERROR__;
  if (typeof hook === "function") {
    try {
      hook(err, context);
    } catch {
      /* ignore */
    }
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn && typeof window !== "undefined") {
    // Intégration Sentry optionnelle : npm i @sentry/react puis décommenter
    // import * as Sentry from '@sentry/react'
    // Sentry.captureException(err, { extra: context })
  }
}

export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (ev) => {
    reportError(ev.reason, { type: "unhandledrejection" });
  });

  const prev = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(error ?? new Error(String(message)), {
      type: "window.onerror",
      source,
      lineno,
      colno,
    });
    if (typeof prev === "function") {
      return prev(message, source, lineno, colno, error);
    }
    return false;
  };
}
