import { useTranslation } from "react-i18next";

export const QUANTUM_PROMO_CODE = "QUANTUM";

export function isQuantumPromo(code: string): boolean {
  return code.trim().toUpperCase() === QUANTUM_PROMO_CODE;
}

/** Montant TTC simulé (100 jetons ≈ 1 €). Code promo secret → total 0 €. */
export function simulatedEurFromChips(chips: number, quantum: boolean): number {
  if (quantum) return 0;
  return Math.round((chips / 100) * 100) / 100;
}

export function formatCardDisplayDigits(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiryInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function isFakeCardComplete(
  cardDigits: string,
  expiryDisplay: string,
  cvv: string,
  name: string,
): boolean {
  const expOk = /^\d{2}\/\d{2}$/.test(expiryDisplay);
  const mm = Number(expiryDisplay.slice(0, 2));
  const expMonthOk = mm >= 1 && mm <= 12;
  return (
    cardDigits.replace(/\D/g, "").length >= 16 &&
    expOk &&
    expMonthOk &&
    cvv.replace(/\D/g, "").length >= 3 &&
    name.trim().length >= 2
  );
}

export type FakePromoCodeFieldProps = {
  promoCode: string;
  setPromoCode: (v: string) => void;
  compact?: boolean;
};

/** Zone code promo (à placer en bas du formulaire, au-dessus du bouton payer). */
export function FakePromoCodeField({ promoCode, setPromoCode, compact }: FakePromoCodeFieldProps) {
  const { t } = useTranslation();
  const labelCls = compact ? "text-slate-400 text-xs" : "text-slate-300 text-sm";
  const inputCls = compact
    ? "w-full rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-white placeholder-slate-400 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
    : "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-300/55 focus:ring-1 focus:ring-amber-300/35";

  return (
    <div className={`mt-1 border-t border-white/10 pt-3 flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      <label className={labelCls}>{t("lobby.fakePaymentPromoLabel")}</label>
      <input
        type="text"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value)}
        placeholder={t("lobby.fakePaymentPromoPlaceholder")}
        className={inputCls}
        autoComplete="off"
      />
      <p className="text-[11px] text-slate-500">{t("lobby.fakePaymentPromoHint")}</p>
    </div>
  );
}

export type FakeCardTopUpFieldsProps = {
  addMoneyAmount: number;
  promoCode: string;
  cardName: string;
  setCardName: (v: string) => void;
  cardDigits: string;
  setCardDigits: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  /** Moins d’espacement pour la modale compacte (Game). */
  compact?: boolean;
};

export function FakeCardTopUpFields({
  addMoneyAmount,
  promoCode,
  cardName,
  setCardName,
  cardDigits,
  setCardDigits,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  compact,
}: FakeCardTopUpFieldsProps) {
  const { t } = useTranslation();
  const quantum = isQuantumPromo(promoCode);
  const eur = simulatedEurFromChips(addMoneyAmount, quantum);
  const gap = compact ? "gap-2" : "gap-3";
  const labelCls = compact ? "text-slate-400 text-xs" : "text-slate-300 text-sm";
  const inputCls = compact
    ? "w-full rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-white placeholder-slate-400 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
    : "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-300/55 focus:ring-1 focus:ring-amber-300/35";

  return (
    <div className={`flex flex-col ${gap}`}>
      <p className={`rounded-lg border border-amber-300/20 bg-amber-950/25 px-2.5 py-2 text-xs text-amber-100/85 ${compact ? "" : "text-sm"}`}>
        {t("lobby.fakePaymentDisclaimer")}
      </p>

      <div className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2 ${compact ? "text-xs" : "text-sm"}`}>
        <span className="text-slate-400">{t("lobby.fakePaymentChipsLine", { count: addMoneyAmount })}</span>
        <span className="font-bold tabular-nums text-amber-100">
          {t("lobby.fakePaymentTotalSimulated", { amount: eur.toFixed(2) })}
        </span>
      </div>

      {!quantum ? (
        <>
          <div>
            <label className={`${labelCls} mb-1 block`}>{t("lobby.fakePaymentCardHolder")}</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              autoComplete="off"
              placeholder="J. Doe"
              className={inputCls}
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1 block`}>{t("lobby.fakePaymentCardNumber")}</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatCardDisplayDigits(cardDigits)}
              onChange={(e) => setCardDigits(e.target.value.replace(/\D/g, "").slice(0, 19))}
              placeholder="4242 4242 4242 4242"
              className={inputCls}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`${labelCls} mb-1 block`}>{t("lobby.fakePaymentExpiry")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                placeholder="MM/AA"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div>
              <label className={`${labelCls} mb-1 block`}>{t("lobby.fakePaymentCvv")}</label>
              <input
                type="password"
                inputMode="numeric"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••"
                className={inputCls}
                autoComplete="off"
              />
            </div>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-2 text-xs text-emerald-200">
          {t("lobby.fakePaymentQuantumActive")}
        </p>
      )}
    </div>
  );
}
