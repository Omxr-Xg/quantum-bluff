import { useEffect, useRef, useState } from "react";

type ScrollbarOverlay = {
  id: string;
  top: number;
  left: number;
  height: number;
  thumbTop: number;
  thumbHeight: number;
};

const ROOT_SCROLLBAR_ID = "viewport";
const BAR_WIDTH = 2;
const EDGE_GAP = 10;
const MIN_THUMB_HEIGHT = 24;
const OVERLAY_Z_INDEX = 2147483647;

let scrollbarId = 0;

function hasOverflowY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const className = typeof element.className === "string" ? element.className : "";
  const hasOverflowClass =
    className.includes("overflow-y-auto") ||
    className.includes("overflow-auto") ||
    className.includes("overflow-y-scroll");

  return (
    (hasOverflowClass ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflowY === "overlay") &&
    element.scrollHeight > element.clientHeight + 1 &&
    element.clientHeight > MIN_THUMB_HEIGHT
  );
}

function getDocumentContentHeight() {
  const documentElement = document.documentElement;
  const body = document.body;
  let contentBottom = 0;

  document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
    if (element.dataset.customScrollbarOverlay === "true") return;
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0) return;
    contentBottom = Math.max(contentBottom, rect.bottom + window.scrollY);
  });

  return Math.max(
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    contentBottom,
  );
}

function getElementId(element: HTMLElement) {
  const existing = element.dataset.customScrollbarId;
  if (existing) return existing;
  scrollbarId += 1;
  const id = `scroll-${scrollbarId}`;
  element.dataset.customScrollbarId = id;
  return id;
}

function sameOverlays(previous: ScrollbarOverlay[], next: ScrollbarOverlay[]) {
  if (previous.length !== next.length) return false;
  return previous.every((item, index) => {
    const other = next[index];
    return (
      item.id === other.id &&
      item.top === other.top &&
      item.left === other.left &&
      item.height === other.height &&
      item.thumbTop === other.thumbTop &&
      item.thumbHeight === other.thumbHeight
    );
  });
}

function makeOverlay(
  id: string,
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  top: number,
  left: number,
  height: number,
): ScrollbarOverlay | null {
  if (height < MIN_THUMB_HEIGHT || scrollHeight <= clientHeight + 1) return null;

  const thumbHeight = Math.max(MIN_THUMB_HEIGHT, Math.round((clientHeight / scrollHeight) * height));
  const maxThumbTop = Math.max(0, height - thumbHeight);
  const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
  const thumbTop = Math.round((scrollTop / maxScrollTop) * maxThumbTop);

  return {
    id,
    top: Math.round(top),
    left: Math.round(left),
    height: Math.round(height),
    thumbTop,
    thumbHeight,
  };
}

export function GlobalCustomScrollbars() {
  const [overlays, setOverlays] = useState<ScrollbarOverlay[]>([]);
  const managedElementsRef = useRef<Set<HTMLElement>>(new Set());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cleanupManagedElements = (nextManaged: Set<HTMLElement>) => {
      managedElementsRef.current.forEach((element) => {
        if (!nextManaged.has(element)) {
          element.classList.remove("scrollbar-none");
        }
      });
      managedElementsRef.current = nextManaged;
    };

    const update = () => {
      rafRef.current = null;

      const nextManaged = new Set<HTMLElement>();
      const nextOverlays: ScrollbarOverlay[] = [];
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const documentElement = document.documentElement;
      const body = document.body;
      const scrollingElement = document.scrollingElement as HTMLElement | null;
      const rootScrollHeight = Math.max(scrollingElement?.scrollHeight ?? 0, getDocumentContentHeight());
      const rootClientHeight = Math.max(
        viewportHeight,
        scrollingElement?.clientHeight ?? 0,
        documentElement.clientHeight,
      );
      const rootScrollTop =
        window.scrollY ||
        scrollingElement?.scrollTop ||
        documentElement.scrollTop ||
        body?.scrollTop ||
        0;

      if (rootScrollHeight > rootClientHeight + 1) {
        documentElement.classList.add("scrollbar-none");
        body?.classList.add("scrollbar-none");
        scrollingElement?.classList.add("scrollbar-none");

        const rootOverlay = makeOverlay(
          ROOT_SCROLLBAR_ID,
          rootScrollTop,
          rootScrollHeight,
          rootClientHeight,
          8,
          viewportWidth - EDGE_GAP,
          Math.max(40, rootClientHeight - 16),
        );

        if (rootOverlay) nextOverlays.push(rootOverlay);
      } else {
        documentElement.classList.remove("scrollbar-none");
        body?.classList.remove("scrollbar-none");
        scrollingElement?.classList.remove("scrollbar-none");
      }

      document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
        if (
          element.dataset.customScrollbarOverlay === "true" ||
          element.dataset.customScrollbarManaged === "true" ||
          element.closest("[data-custom-scrollbar-managed='true']") ||
          element.dataset.nativeScrollbar === "true" ||
          element.closest("[data-native-scrollbar='true']") ||
          element.matches("textarea, select")
        ) {
          return;
        }

        if (!hasOverflowY(element)) return;

        const rect = element.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= viewportHeight || rect.right <= 0 || rect.left >= viewportWidth) {
          return;
        }

        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewportHeight, rect.bottom);
        const visibleHeight = visibleBottom - visibleTop;
        const left = Math.min(viewportWidth - EDGE_GAP, Math.max(0, rect.right - EDGE_GAP));
        const overlay = makeOverlay(
          getElementId(element),
          element.scrollTop,
          element.scrollHeight,
          element.clientHeight,
          visibleTop,
          left,
          visibleHeight,
        );

        if (!overlay) return;

        element.classList.add("scrollbar-none");
        nextManaged.add(element);
        nextOverlays.push(overlay);
      });

      cleanupManagedElements(nextManaged);
      setOverlays((previous) => (sameOverlays(previous, nextOverlays) ? previous : nextOverlays));
    };

    const scheduleUpdate = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(update);
    };

    const mutationObserver = new MutationObserver(scheduleUpdate);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-native-scrollbar"],
    });
    resizeObserver?.observe(document.documentElement);
    resizeObserver?.observe(document.body);

    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    const interval = window.setInterval(scheduleUpdate, 350);
    scheduleUpdate();

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      window.clearInterval(interval);
      cleanupManagedElements(new Set());
      document.documentElement.classList.remove("scrollbar-none");
      document.body?.classList.remove("scrollbar-none");
    };
  }, []);

  return (
    <>
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          data-custom-scrollbar-overlay="true"
          style={{
            position: "fixed",
            top: `${overlay.top}px`,
            left: `${overlay.left}px`,
            height: `${overlay.height}px`,
            width: "1px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.08)",
            pointerEvents: "none",
            zIndex: OVERLAY_Z_INDEX,
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: `${BAR_WIDTH}px`,
              height: `${overlay.thumbHeight}px`,
              borderRadius: "999px",
              background: "linear-gradient(180deg, #fff8d8 0%, #e4c15a 48%, #b88922 100%)",
              boxShadow: "0 0 10px rgba(246, 213, 132, 0.52)",
              transform: `translateY(${overlay.thumbTop}px)`,
              transition: "height 150ms ease-out, transform 150ms ease-out",
            }}
          />
        </div>
      ))}
    </>
  );
}
