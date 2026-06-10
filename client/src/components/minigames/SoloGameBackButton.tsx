import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

type SoloGameBackButtonProps = {
  onClick: () => void;
  className?: string;
};

const BASE_CLASS =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md transition hover:border-white/25 hover:bg-black/60";

export function SoloGameBackButton({ onClick, className }: SoloGameBackButtonProps) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className={className ? `${BASE_CLASS} ${className}` : BASE_CLASS}>
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {t("minigames.quickSoloBack")}
    </button>
  );
}
