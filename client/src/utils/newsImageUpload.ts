/** Compresse une image avant envoi admin (évite le rejet serveur + accélère l’upload). */
export async function prepareNewsImageDataUrl(file: File): Promise<string> {
  if (file.type === "image/gif") {
    return readFileAsDataUrl(file);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("unsupported");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const maxDim = 1920;
    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height, 1));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readFileAsDataUrl(file);
    ctx.drawImage(img, 0, 0, width, height);
    const hasAlpha = file.type === "image/png" || file.type === "image/webp";
    if (hasAlpha) {
      const webp = canvas.toDataURL("image/webp", 0.88);
      if (webp.startsWith("data:image/webp")) return webp;
    }
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return readFileAsDataUrl(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
