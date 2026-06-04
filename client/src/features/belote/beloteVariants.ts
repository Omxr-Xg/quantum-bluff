export type BeloteGameVariant = "CLASSIQUE" | "COINCHE" | "CONTEE" | "MODERNE";

export const BELOTE_VARIANT_OPTIONS: BeloteGameVariant[] = [
  "CLASSIQUE",
  "COINCHE",
  "CONTEE",
  "MODERNE",
];

export function variantLabelKey(v: BeloteGameVariant): string {
  return `belote.variant.${v}`;
}
