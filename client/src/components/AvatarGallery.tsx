import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AVATAR_PRESETS } from "@/utils/avatars";

const INITIAL_VISIBLE = 6;

interface AvatarGalleryProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export function AvatarGallery({ selectedAvatar, onSelect }: AvatarGalleryProps) {
  const { t } = useTranslation();
  const selectedPresetIndex = AVATAR_PRESETS.indexOf(selectedAvatar);
  const [expanded, setExpanded] = useState(() => selectedPresetIndex >= INITIAL_VISIBLE);

  useEffect(() => {
    if (selectedPresetIndex >= INITIAL_VISIBLE) {
      setExpanded(true);
    }
  }, [selectedPresetIndex, selectedAvatar]);

  const total = AVATAR_PRESETS.length;
  const hasMore = total > INITIAL_VISIBLE;
  const visible = expanded ? AVATAR_PRESETS : AVATAR_PRESETS.slice(0, INITIAL_VISIBLE);
  /** Réduire seulement si la sélection est dans les 6 premiers (ou pas un preset). */
  const canCollapse =
    selectedPresetIndex === -1 || selectedPresetIndex < INITIAL_VISIBLE;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-4"
        role="list"
        aria-label={t("editProfile.avatarGalleryLabel")}
      >
        {visible.map((avatar) => {
          const isSelected = selectedAvatar === avatar;
          const index = AVATAR_PRESETS.indexOf(avatar);

          return (
            <button
              key={avatar}
              type="button"
              role="listitem"
              aria-label={t("editProfile.avatarOption", { index: index + 1, total })}
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(avatar)}
              className={`p-2 rounded-2xl border-2 transition-all duration-200 flex items-center justify-center
              ${
                isSelected
                  ? "border-green-500 bg-green-500/10 scale-105"
                  : "border-slate-600 bg-slate-800 hover:border-slate-400 hover:scale-105"
              }
            `}
            >
              <img
                src={avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/60 hover:bg-slate-700 hover:text-white"
              aria-expanded={false}
            >
              <ChevronDown className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {t("editProfile.showMoreAvatars", { count: total - INITIAL_VISIBLE })}
            </button>
          ) : (
            canCollapse && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
                aria-expanded
              >
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {t("editProfile.showLessAvatars")}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
