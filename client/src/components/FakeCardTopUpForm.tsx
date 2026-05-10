import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";

export type PromoDiscountInfo = {
  discountType: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT";
  discountValue: number;
} | null;

/** Montant TTC simulé (100 jetons ≈ 1 €).
 *  Applique une réduction selon le type: fixe en € ou pourcentage. */
export function simulatedEurFromChips(
  chips: number,
  discount: PromoDiscountInfo,
): number {
  const baseEur = Math.round((chips / 100) * 100) / 100;

  if (!discount) return baseEur;

  if (discount.discountType === "FIXED_DISCOUNT") {
    // Réduction fixe en € (e.g., 10€ de réduction)
    return Math.max(0, baseEur - discount.discountValue);
  } else if (discount.discountType === "PERCENTAGE_DISCOUNT") {
    // Réduction en % (e.g., 20% de réduction)
    const discountAmount = (baseEur * discount.discountValue) / 100;
    return Math.max(0, baseEur - discountAmount);
  }

  return baseEur;
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

/** Luhn (mod 10) sur le PAN — même logique que les terminaux (doublement un chiffre sur deux depuis la droite). */
export function isCardNumberLuhnValid(panDigits: string): boolean {
  const digits = panDigits.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    const fromRight = digits.length - 1 - i;
    if (fromRight % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** MM/AA non expiré (mois courant du `referenceDate` inclus). */
export function isCardExpiryValid(expiryDisplay: string, referenceDate: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiryDisplay.trim());
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = Number(m[2]);
  if (mm < 1 || mm > 12 || yy < 0 || yy > 99) return false;
  const expYear = 2000 + yy;
  const expSlot = expYear * 12 + mm;
  const refSlot = referenceDate.getFullYear() * 12 + (referenceDate.getMonth() + 1);
  return expSlot >= refSlot;
}

/** Amex 15 chiffres (34 / 37) → CVV 4 ; sinon 3. */
export function expectedFakeCardCvvLength(panDigits: string): 3 | 4 {
  const d = panDigits.replace(/\D/g, "");
  if (d.length === 15 && (d.startsWith("34") || d.startsWith("37"))) return 4;
  return 3;
}

export function isFakeCardCvvValid(panDigits: string, cvv: string): boolean {
  const c = cvv.replace(/\D/g, "");
  const need = expectedFakeCardCvvLength(panDigits);
  return c.length === need;
}

/** Titulaire : au moins une lettre, caractères usuels (espaces, tirets, apostrophe). */
export function isFakeCardholderNameValid(name: string): boolean {
  const t = name.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (!/\p{L}/u.test(t)) return false;
  return /^[\p{L}\d\s'.-]+$/u.test(t);
}

export function isFakeCardComplete(
  cardDigits: string,
  expiryDisplay: string,
  cvv: string,
  name: string,
  referenceDate: Date = new Date(),
): boolean {
  const pan = cardDigits.replace(/\D/g, "");
  if (!isCardNumberLuhnValid(pan)) return false;
  if (!isCardExpiryValid(expiryDisplay, referenceDate)) return false;
  if (!isFakeCardCvvValid(pan, cvv)) return false;
  return isFakeCardholderNameValid(name);
}

export type FakePromoCodeFieldProps = {
  promoCode: string;
  setPromoCode: (v: string) => void;
  compact?: boolean;
  isValidating?: boolean;
  hasDiscount?: boolean;
  /** Code serveur validé : paiement fictif offert + crédit des jetons. */
  hasFreeCheckoutPromo?: boolean;
};

/** Zone code promo (à placer en haut du formulaire). */
export function FakePromoCodeField({
  promoCode,
  setPromoCode,
  compact,
  isValidating,
  hasDiscount,
  hasFreeCheckoutPromo,
}: FakePromoCodeFieldProps) {
  const { t } = useTranslation();
  const labelCls = compact ? "text-slate-400 text-xs" : "text-slate-300 text-sm";
  const inputCls = compact
    ? "w-full rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-white placeholder-slate-400 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
    : "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-300/55 focus:ring-1 focus:ring-amber-300/35";

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <label className={`${labelCls} font-semibold`}>{t("lobby.fakePaymentPromoLabel")}</label>
        {isValidating && (
          <span className="text-[10px] text-slate-400">{t("lobby.fakePaymentPromoValidating")}</span>
        )}
        {hasFreeCheckoutPromo && (
          <span className="text-[10px] text-amber-200">✅ {t("lobby.fakePaymentPromoAppliedShort")}</span>
        )}
        {!hasFreeCheckoutPromo && hasDiscount && (
          <span className="text-[10px] text-emerald-400">✅ {t("lobby.fakePaymentDiscountAppliedShort")}</span>
        )}
      </div>
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
  setPromoCode?: (v: string) => void;
  promoDiscount: PromoDiscountInfo;
  /** Code promo serveur : montant fictif 0 € + crédit des jetons (pas de saisie carte). */
  promoFreeCheckout?: boolean;
  isPromoValidating?: boolean;
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
  setPromoCode,
  promoDiscount,
  promoFreeCheckout,
  isPromoValidating,
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
  const isFreePayment =
    !!promoFreeCheckout ||
    (promoDiscount?.discountValue !== undefined &&
      simulatedEurFromChips(addMoneyAmount, promoDiscount) === 0);
  const baseEur = Math.round((addMoneyAmount / 100) * 100) / 100;
  const eur = simulatedEurFromChips(addMoneyAmount, promoDiscount);
  const discountAmount = baseEur - eur;
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

      {/* Section Code Promo en haut */}
      {setPromoCode && (
        <FakePromoCodeField
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          compact={compact}
          isValidating={isPromoValidating}
          hasDiscount={!!promoDiscount}
          hasFreeCheckoutPromo={!!promoFreeCheckout}
        />
      )}

      <div className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2 ${compact ? "text-xs" : "text-sm"}`}>
        <span className="text-slate-400">{t("lobby.fakePaymentChipsLine", { count: addMoneyAmount })}</span>
        <div className="flex flex-col items-end gap-1">
          {discountAmount > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              -{discountAmount.toFixed(2)}€
            </span>
          )}
          <span className="font-bold tabular-nums text-amber-100">
            {t("lobby.fakePaymentTotalSimulated", { amount: eur.toFixed(2) })}
          </span>
        </div>
      </div>

      {!isFreePayment ? (
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
      ) : promoFreeCheckout ? (
        <p className="flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-2.5 py-2 text-xs text-amber-100">
          <Gift className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
          {t("lobby.fakePaymentPromoFreeCheckoutHint")}
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-2 text-xs text-emerald-200">
          <Gift className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
          {t("lobby.fakePaymentPromoZeroTotal")}
        </p>
      )}
    </div>
  );
}
