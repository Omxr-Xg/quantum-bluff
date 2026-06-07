import { hasAnalyticsConsent } from "./analyticsConsent";

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  window.gtag?.("event", eventName, params);
}
