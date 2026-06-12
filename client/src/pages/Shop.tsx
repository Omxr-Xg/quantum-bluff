import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import {
  useGetShopCosmeticsQuery,
  useGetShopLoadoutQuery,
  usePurchaseCosmeticMutation,
  useUpdateShopLoadoutMutation,
  type CosmeticType,
  type ShopCosmetic,
} from "../services/api";
import { trackEvent } from "../utils/analytics";
import { parseBannerStyleJson } from "../utils/bannerStyle";

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";
const profileButton =
  "rounded-full border border-blue-300/15 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:cursor-not-allowed disabled:opacity-50";

const TABS: CosmeticType[] = ["BANNER", "AVATAR_FRAME", "TITLE"];

function parseStyle(styleJson: string): Record<string, string> {
  try {
    return JSON.parse(styleJson) as Record<string, string>;
  } catch {
    return {};
  }
}

function rarityClass(rarity: string): string {
  switch (rarity) {
    case "legendary":
      return "border-amber-300/40 text-amber-200";
    case "epic":
      return "border-purple-300/35 text-purple-200";
    case "rare":
      return "border-blue-300/35 text-blue-200";
    case "uncommon":
      return "border-emerald-300/30 text-emerald-200";
    default:
      return "border-slate-400/30 text-slate-300";
  }
}

function CosmeticPreview({ item }: { item: ShopCosmetic }) {
  const style = parseStyle(item.styleJson);
  if (item.type === "BANNER") {
    const parsed = parseBannerStyleJson(item.styleJson);
    const bg = parsed.background ?? "#334155";
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: bg, backgroundColor: "#334155" }}
        />
        {parsed.isImage ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.28) 100%)",
            }}
            aria-hidden
          />
        ) : null}
      </div>
    );
  }
  if (item.type === "AVATAR_FRAME") {
    const border = style.border ?? "#94a3b8";
    const glow = style.glow;
    if (border.includes("gradient")) {
      return (
        <div className="mx-auto h-16 w-16 rounded-full p-1" style={{ background: border, boxShadow: glow }}>
          <div className="h-full w-full rounded-full bg-slate-800" />
        </div>
      );
    }
    return (
      <div
        className="mx-auto h-16 w-16 rounded-full border-4 bg-slate-800"
        style={{ borderColor: border, boxShadow: glow }}
      />
    );
  }
  return (
    <p className="text-center text-sm font-bold" style={{ color: style.color ?? "#e2e8f0" }}>
      Title
    </p>
  );
}

export function Shop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<CosmeticType>("BANNER");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: cosmeticsData, isLoading } = useGetShopCosmeticsQuery();
  const { data: loadout } = useGetShopLoadoutQuery();
  const [purchase, { isLoading: purchasing }] = usePurchaseCosmeticMutation();
  const [updateLoadout, { isLoading: equipping }] = useUpdateShopLoadoutMutation();

  const items = useMemo(
    () => (cosmeticsData?.items ?? []).filter((i) => i.type === tab),
    [cosmeticsData, tab],
  );

  const equippedId =
    tab === "BANNER" ? loadout?.bannerId : tab === "AVATAR_FRAME" ? loadout?.frameId : loadout?.titleId;

  const handlePurchase = async (id: string) => {
    setActionError(null);
    const cosmetic = cosmeticsData?.items.find((item) => item.id === id);
    try {
      await purchase(id).unwrap();
      trackEvent("cosmetic_purchased", { item: cosmetic?.nameKey ?? id });
    } catch {
      setActionError(t("shop.purchaseError"));
    }
  };

  const handleEquip = async (id: string) => {
    setActionError(null);
    const patch =
      tab === "BANNER"
        ? { bannerId: id }
        : tab === "AVATAR_FRAME"
          ? { frameId: id }
          : { titleId: id };
    try {
      await updateLoadout(patch).unwrap();
    } catch {
      setActionError(t("shop.equipError"));
    }
  };

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`flex w-fit items-center gap-2 px-3 py-2 text-sm sm:px-4 ${profileMutedButton}`}
            >
              <Home className="h-4 w-4" />
              {t("shop.backToProfile")}
            </button>
            <h1 className="flex items-center gap-2 bg-gradient-to-r from-slate-100 via-purple-200 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              <ShoppingBag className="h-8 w-8 text-purple-300" />
              {t("shop.title")}
            </h1>
            <p className="text-sm text-slate-400">{t("shop.subtitle")}</p>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTab(type)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === type
                  ? "border border-purple-300/40 bg-purple-950/50 text-purple-100"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {t(`shop.tab.${type}`)}
            </button>
          ))}
        </div>

        {actionError ? <p className="mb-4 text-sm text-rose-300">{actionError}</p> : null}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isEquipped = equippedId === item.id;
              return (
                <div key={item.id} className={`p-4 ${profileGlassCard}`}>
                  <CosmeticPreview item={item} />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{t(item.nameKey)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${rarityClass(item.rarity)}`}
                      >
                        {t(`shop.rarity.${item.rarity}`)}
                      </span>
                    </div>
                    {isEquipped ? (
                      <Sparkles className="h-5 w-5 shrink-0 text-cyan-300" aria-label={t("shop.equipped")} />
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.owned ? (
                      <button
                        type="button"
                        disabled={isEquipped || equipping}
                        onClick={() => void handleEquip(item.id)}
                        className={`px-4 py-2 text-xs ${profileButton}`}
                      >
                        {isEquipped ? t("shop.equipped") : t("shop.equip")}
                      </button>
                    ) : item.purchasable ? (
                      <button
                        type="button"
                        disabled={purchasing}
                        onClick={() => void handlePurchase(item.id)}
                        className={`px-4 py-2 text-xs ${profileButton}`}
                      >
                        {t("shop.buy", { price: item.priceChips.toLocaleString() })}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">{t("shop.notPurchasable")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
