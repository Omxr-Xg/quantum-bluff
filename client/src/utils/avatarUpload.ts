/**
 * Redimensionne et compresse une image pour l’avatar profil (data URL JPEG),
 * afin de rester sous les limites API et base de données.
 */
export async function fileToAvatarDataUrl(
  file: File,
  maxEdge = 512,
  quality = 0.88
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponible");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l’image"));
    img.src = src;
  });
}

/**
 * Convertit un avatar **bundlé par Vite** (preset PNG dans `assets/avatars/…`,
 * résolu en URL relative type `/assets/FA1-abc123.png`) en data URL JPEG, afin
 * que le serveur puisse l'ingérer via `ingestAvatarToBuffer` (qui n'accepte
 * que `data:image/…`, `http(s)://`, ou le chemin canonique stocké).
 *
 * Si l'URL fournie est **déjà** un data URL ou une URL absolue/canonique, on
 * la retourne telle quelle — pas de conversion superflue.
 *
 * Rejette si l'image ne peut pas être chargée (CSP/CORS, build cassé, …) — le
 * caller doit gérer ce cas en gardant la sélection précédente.
 */
export async function presetAvatarToDataUrl(
  bundledUrl: string,
  maxEdge = 512,
  quality = 0.92
): Promise<string> {
  const s = bundledUrl.trim();
  if (
    s.startsWith("data:image/") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("/api/auth/avatars/")
  ) {
    return s;
  }
  const img = await loadImage(bundledUrl);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
