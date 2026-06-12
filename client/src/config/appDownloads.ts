/** Version alignée sur client/package.json — bump lors des releases. */
export const APP_RELEASE_VERSION = "1.0.2";

export type DesktopPlatformId = "windows" | "macDmg" | "macZip";

export type DesktopPlatform = {
  id: DesktopPlatformId;
  fileName: string;
  sizeLabel: string;
  archKey: string;
};

/** Noms sans espaces — requis pour GitHub Releases (URLs stables). */
export const DESKTOP_PLATFORMS: DesktopPlatform[] = [
  {
    id: "windows",
    fileName: `Quantum-Bluff-Setup-${APP_RELEASE_VERSION}.exe`,
    sizeLabel: "~141 Mo",
    archKey: "windowsArch",
  },
  {
    id: "macDmg",
    fileName: `Quantum-Bluff-${APP_RELEASE_VERSION}-arm64.dmg`,
    sizeLabel: "~175 Mo",
    archKey: "macArch",
  },
  {
    id: "macZip",
    fileName: `Quantum-Bluff-${APP_RELEASE_VERSION}-arm64-mac.zip`,
    sizeLabel: "~166 Mo",
    archKey: "macArch",
  },
];

export const ANDROID_APK = {
  fileName: `Quantum-Bluff-Android-${APP_RELEASE_VERSION}.apk`,
  sizeLabel: "~509 Mo",
  archKey: "androidArch",
} as const;

/** Repo GitHub — releases publiques (installateurs > 100 Mo). */
export const GITHUB_RELEASES_BASE =
  "https://github.com/Omxr-Xg/quantum-bluff/releases/download";

/** Tag release aligné sur APP_RELEASE_VERSION (ex. v1.0.2). */
export function githubReleaseTag(version = APP_RELEASE_VERSION): string {
  return version.startsWith("v") ? version : `v${version}`;
}

/** URL de téléchargement page marketing — releases GitHub en prod, /downloads en dev local. */
export function resolveAppDownloadUrl(fileName: string): string {
  const encoded = encodeURIComponent(fileName);
  const envBase = import.meta.env.VITE_DOWNLOADS_BASE_URL?.trim();
  if (envBase) {
    return `${envBase.replace(/\/$/, "")}/${encoded}`;
  }
  if (import.meta.env.DEV) {
    return `/downloads/${encoded}`;
  }
  return `${GITHUB_RELEASES_BASE}/${githubReleaseTag()}/${encoded}`;
}

/** @deprecated Utiliser appDownloads */
export const DESKTOP_APP_VERSION = APP_RELEASE_VERSION;
export const resolveDesktopDownloadUrl = resolveAppDownloadUrl;
