import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

type CustomScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

type ScrollState = {
  visible: boolean;
  thumbTop: number;
  thumbHeight: number;
};

const MIN_THUMB_HEIGHT = 24;

export function CustomScrollArea({ children, className = "", contentClassName = "" }: CustomScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    visible: false,
    thumbTop: 0,
    thumbHeight: 0,
  });

  const updateScrollbar = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      setScrollState((previous) =>
        previous.visible ? { visible: false, thumbTop: 0, thumbHeight: 0 } : previous,
      );
      return;
    }

    const { clientHeight, scrollHeight, scrollTop } = element;
    const visible = scrollHeight > clientHeight + 1;

    if (!visible) {
      setScrollState((previous) =>
        previous.visible ? { visible: false, thumbTop: 0, thumbHeight: 0 } : previous,
      );
      return;
    }

    const thumbHeight = Math.max(MIN_THUMB_HEIGHT, Math.round((clientHeight / scrollHeight) * clientHeight));
    const maxThumbTop = Math.max(0, clientHeight - thumbHeight);
    const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
    const thumbTop = Math.round((scrollTop / maxScrollTop) * maxThumbTop);
    const next = { visible: true, thumbTop, thumbHeight };

    setScrollState((previous) =>
      previous.visible === next.visible &&
      previous.thumbTop === next.thumbTop &&
      previous.thumbHeight === next.thumbHeight
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollbar);
    const element = scrollRef.current;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollbar) : null;
    const mutationObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(updateScrollbar) : null;

    if (element) {
      observer?.observe(element);
      Array.from(element.children).forEach((child) => {
        if (child instanceof HTMLElement) observer?.observe(child);
      });
      mutationObserver?.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    window.addEventListener("resize", updateScrollbar);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [children, updateScrollbar]);

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={scrollRef}
        data-custom-scrollbar-managed="true"
        onScroll={updateScrollbar}
        className={`scrollbar-none h-full overflow-y-auto ${contentClassName}`}
      >
        {children}
      </div>
      {scrollState.visible && (
        <div
          data-custom-scrollbar-track="true"
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-px rounded-full bg-white/[0.04]"
          aria-hidden
        >
          <div
            data-custom-scrollbar-thumb="true"
            className="absolute right-0 w-[2px] rounded-full bg-gradient-to-b from-[#fff0bc] via-[#e4c15a] to-[#b88922] shadow-[0_0_10px_rgba(246,213,132,0.52)] transition-[height,transform] duration-150 ease-out"
            style={{
              height: `${scrollState.thumbHeight}px`,
              transform: `translateY(${scrollState.thumbTop}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
