/** Version alignée sur client/package.json — bump lors des releases. */
export const APP_RELEASE_VERSION = "1.0.2";

export type DesktopPlatformId = "windows" | "macDmg" | "macZip";

export type DesktopPlatform = {
  id: DesktopPlatformId;
  fileName: string;
  sizeLabel: string;
  archKey: string;
};

export const DESKTOP_PLATFORMS: DesktopPlatform[] = [
  {
    id: "windows",
    fileName: `Quantum Bluff Setup ${APP_RELEASE_VERSION}.exe`,
    sizeLabel: "~141 Mo",
    archKey: "windowsArch",
  },
  {
    id: "macDmg",
    fileName: `Quantum Bluff-${APP_RELEASE_VERSION}-arm64.dmg`,
    sizeLabel: "~175 Mo",
    archKey: "macArch",
  },
  {
    id: "macZip",
    fileName: `Quantum Bluff-${APP_RELEASE_VERSION}-arm64-mac.zip`,
    sizeLabel: "~166 Mo",
    archKey: "macArch",
  },
];

export const ANDROID_APK = {
  fileName: `Quantum-Bluff-Android-${APP_RELEASE_VERSION}.apk`,
  sizeLabel: "~509 Mo",
  archKey: "androidArch",
} as const;

/** URL de téléchargement — priorité API /updates, sinon /downloads statique. */
export function resolveAppDownloadUrl(fileName: string): string {
  const api = import.meta.env.VITE_API_URL?.trim();
  const encoded = encodeURIComponent(fileName);
  if (api) {
    return `${api.replace(/\/$/, "")}/updates/${encoded}`;
  }
  const staticBase = import.meta.env.VITE_DOWNLOADS_BASE_URL?.trim() || "/downloads";
  return `${staticBase.replace(/\/$/, "")}/${encoded}`;
}

/** @deprecated Utiliser appDownloads */
export const DESKTOP_APP_VERSION = APP_RELEASE_VERSION;
export const resolveDesktopDownloadUrl = resolveAppDownloadUrl;
