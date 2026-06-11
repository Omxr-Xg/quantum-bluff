import { useEffect, useState } from "react";

function readViewportWidth(): number {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

/** Taille des cartes en main selon la largeur d’écran et le nombre de cartes. */
export function useBeloteHandCardSize(cardCount: number): "xs" | "sm" | "md" {
  const [width, setWidth] = useState(readViewportWidth);

  useEffect(() => {
    const onResize = () => setWidth(readViewportWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (width < 380) return cardCount >= 6 ? "xs" : "sm";
  if (width < 640) return cardCount >= 8 ? "sm" : width < 480 ? "sm" : "md";
  return "md";
}

/** Cartes au centre de la table (pli, retournée). */
export function useBeloteTableCardSize(): "sm" | "md" {
  const [width, setWidth] = useState(readViewportWidth);

  useEffect(() => {
    const onResize = () => setWidth(readViewportWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width < 768 ? "sm" : "md";
}
