import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PublicPlayerCosmetics } from "../utils/publicCosmetics";
import { bannerOverlayAlpha } from "../utils/bannerStyle";

type CosmeticAvatarProps = {
  cosmetics?: PublicPlayerCosmetics | null;
  sizeClass?: string;
  children: ReactNode;
  className?: string;
};

export function CosmeticAvatar({
  cosmetics,
  sizeClass = "h-10 w-10",
  children,
  className = "",
}: CosmeticAvatarProps) {
  const frame = cosmetics?.frame;
  return (
    <div
      className={`overflow-hidden rounded-full bg-blue-950/60 ${sizeClass} ${className}`}
      style={
        frame
          ? {
              borderWidth: frame.borderWidth ?? 2,
              borderStyle: "solid",
              borderColor: frame.border,
              boxShadow: frame.glow,
              ...(frame.imageUrl
                ? {
                    backgroundImage: `url("${frame.imageUrl}")`,
                    backgroundSize: "cover",
                  }
                : {}),
            }
          : { borderWidth: 2, borderStyle: "solid", borderColor: "rgba(191,219,254,0.25)" }
      }
    >
      {children}
    </div>
  );
}

type CosmeticTitleProps = {
  cosmetics?: PublicPlayerCosmetics | null;
  className?: string;
};

export function CosmeticTitle({ cosmetics, className = "text-xs font-semibold" }: CosmeticTitleProps) {
  const { t } = useTranslation();
  const title = cosmetics?.title;
  if (!title) return null;
  return (
    <p
      className={`truncate ${className}`}
      style={{
        color: title.color,
        textShadow: title.textShadow,
        fontWeight: title.fontWeight,
        letterSpacing: title.letterSpacing,
      }}
    >
      {t(title.nameKey, { defaultValue: title.nameKey })}
    </p>
  );
}

type CosmeticBannerCardProps = {
  cosmetics?: PublicPlayerCosmetics | null;
  children: ReactNode;
  className?: string;
  bannerHeightClass?: string;
};

function isBannerImageBackground(bg: string | undefined): boolean {
  return Boolean(bg?.includes("url("));
}

/** Carte avec bannière cosmétique en fond (amis lobby, waiting room, etc.). */
export function CosmeticBannerCard({
  cosmetics,
  children,
  className = "",
  bannerHeightClass = "min-h-[4.5rem]",
}: CosmeticBannerCardProps) {
  const banner = cosmetics?.banner;
  const bg = banner?.gradient;
  const isImage = isBannerImageBackground(bg);
  const overlayAlpha = bannerOverlayAlpha(isImage, banner?.overlayOpacity);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 ${bannerHeightClass} ${className}`}
    >
      {banner && bg ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: bg,
              ...(isImage ? { backgroundPosition: "center 35%" } : {}),
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={
              isImage
                ? {
                    background: `linear-gradient(180deg, rgba(2,6,23,${overlayAlpha * 0.45}) 0%, rgba(2,6,23,${overlayAlpha}) 55%, rgba(2,6,23,${Math.min(overlayAlpha + 0.12, 0.55)}) 100%)`,
                  }
                : { backgroundColor: `rgba(2,6,23,${overlayAlpha})` }
            }
            aria-hidden
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-white/[0.045]" aria-hidden />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
