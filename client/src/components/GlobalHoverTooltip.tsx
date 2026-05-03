"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SELECTOR =
  'button:not([disabled]), [role="button"]:not([aria-disabled="true"]), input[type="submit"]:not([disabled]), input[type="button"]:not([disabled]), [data-tooltip], summary';

function getTooltipText(el: HTMLElement): string | null {
  if (el.getAttribute("data-no-global-tooltip") !== null) return null;
  if (el.getAttribute("data-slot") === "tooltip-trigger") return null;

  const dt = el.getAttribute("data-tooltip")?.trim();
  if (dt) return dt;
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const title = el.getAttribute("title")?.trim();
  if (title) return title;
  const it = el.innerText?.replace(/\s+/g, " ").trim();
  if (it && it.length > 0 && it.length <= 140) return it.length > 120 ? `${it.slice(0, 117)}…` : it;
  return null;
}

/**
 * Infobulle grise pour les boutons / contrôles cliquables (priorité :
 * data-tooltip → aria-label → title → texte visible court).
 */
export function GlobalHoverTooltip() {
  const [state, setState] = useState<{
    text: string;
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);

  useEffect(() => {
    let currentEl: HTMLElement | null = null;
    let titleBackup: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const restore = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (currentEl && titleBackup !== null) {
        currentEl.setAttribute("title", titleBackup);
      }
      titleBackup = null;
      currentEl = null;
      setState(null);
    };

    const onMouseOver = (e: MouseEvent) => {
      const raw = (e.target as Element | null)?.closest?.(SELECTOR);
      if (!(raw instanceof HTMLElement)) {
        restore();
        return;
      }
      if (raw.disabled === true) {
        restore();
        return;
      }

      if (currentEl === raw) return;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      if (currentEl && currentEl !== raw) {
        restore();
      }

      const text = getTooltipText(raw);
      if (!text) return;

      timer = setTimeout(() => {
        timer = null;
        const textFinal = getTooltipText(raw);
        if (!textFinal) return;
        currentEl = raw;
        if (raw.hasAttribute("title")) {
          titleBackup = raw.getAttribute("title");
          raw.removeAttribute("title");
        } else {
          titleBackup = null;
        }
        const rect = raw.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
        const tooltipHalfWidth = Math.min(160, Math.max(84, (viewportWidth - 24) / 2));
        const placement = rect.top < 48 ? "bottom" : "top";
        setState({
          text: textFinal,
          left: Math.min(
            Math.max(rect.left + rect.width / 2, tooltipHalfWidth + 8),
            viewportWidth - tooltipHalfWidth - 8,
          ),
          top: placement === "top" ? rect.top - 6 : rect.bottom + 6,
          placement,
        });
      }, 280);
    };

    const onMouseOut = (e: MouseEvent) => {
      const from = (e.target as Element | null)?.closest?.(SELECTOR);
      const rel = e.relatedTarget as Node | null;
      if (from instanceof HTMLElement && rel && from.contains(rel)) return;

      const to = (rel as Element | null)?.closest?.(SELECTOR);
      if (from && to && from === to) return;

      restore();
    };

    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    return () => {
      restore();
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseout", onMouseOut, true);
    };
  }, []);

  if (!state) return null;

  return createPortal(
    <div
      role="tooltip"
      className={`pointer-events-none fixed z-[99999] max-w-[min(20rem,calc(100vw-1rem))] -translate-x-1/2 rounded-lg border border-slate-500/80 bg-slate-800 px-2.5 py-1.5 text-left text-xs leading-snug text-slate-100 shadow-xl ${
        state.placement === "top" ? "-translate-y-full" : ""
      }`}
      style={{ left: state.left, top: state.top }}
    >
      {state.text}
    </div>,
    document.body,
  );
}
