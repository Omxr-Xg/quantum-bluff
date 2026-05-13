/**
 * Validation IBAN cote client (format + clef de controle mod-97).
 *
 * Norme ISO 13616 :
 *   - 2 lettres = code pays
 *   - 2 chiffres = clef de controle
 *   - suite = BBAN alphanumerique propre au pays
 *
 * Verification :
 *   1. Longueur conforme au pays (table ci-dessous, sinon 15-34 par defaut).
 *   2. Caracteres autorises ([A-Z0-9]).
 *   3. Mod-97 == 1 : on deplace les 4 premiers caracteres a la fin,
 *      on remplace chaque lettre par 10 + (lettre - 'A'), puis on calcule
 *      l'entier resultant modulo 97. Doit valoir 1.
 *
 * Cette validation est volontairement strictement structurelle : elle ne
 * verifie pas l'existence reelle du compte (impossible sans appel SEPA).
 */

/** Longueurs canoniques par pays IBAN (ISO 13616 registry, sous-ensemble usuel). */
const IBAN_COUNTRY_LENGTH: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
};

export type IbanCheckCode =
  | "ok"
  | "empty"
  | "tooShort"
  | "tooLong"
  | "wrongLength"
  | "invalidChars"
  | "invalidChecksum"
  | "unknownCountry";

export interface IbanCheckResult {
  ok: boolean;
  code: IbanCheckCode;
  /** Code pays a 2 lettres si extractable. */
  country: string | null;
  /** IBAN normalise (uppercase, sans espaces) ; vide si vide en entree. */
  normalized: string;
}

/** Retire toutes les espaces / tirets et met en majuscules. */
export function normalizeIban(raw: string): string {
  return (raw || "").replace(/[\s-]+/g, "").toUpperCase();
}

/** Formatte un IBAN par groupes de 4 (separes par une espace) pour affichage. */
export function formatIban(raw: string): string {
  const n = normalizeIban(raw);
  if (!n) return "";
  return n.match(/.{1,4}/g)!.join(" ");
}

/**
 * Algorithme mod-97 (ISO 13616).
 *
 * On calcule modulo 97 par morceaux (9 chiffres a la fois) pour eviter de
 * faire un BigInt sur la chaine entiere ; ca tient dans un Number 64-bit
 * sans perte de precision (chaque iteration : ancien_mod (<=96) concatene
 * a 9 chiffres = au plus 96 * 10^9 + 999_999_999 = ~10^11, largement sous 2^53).
 */
function mod97(numericString: string): number {
  let remainder = 0;
  let i = 0;
  const N = numericString.length;
  while (i < N) {
    const chunk = numericString.slice(i, i + 9);
    i += 9;
    const value = Number(String(remainder) + chunk);
    remainder = value % 97;
  }
  return remainder;
}

/**
 * Valide un IBAN. Retourne un objet decrivant l'echec eventuel pour que
 * l'UI puisse afficher un message localise et precis.
 */
export function validateIban(raw: string): IbanCheckResult {
  const normalized = normalizeIban(raw);
  if (normalized.length === 0) {
    return { ok: false, code: "empty", country: null, normalized };
  }
  if (normalized.length < 15) {
    return { ok: false, code: "tooShort", country: null, normalized };
  }
  if (normalized.length > 34) {
    return { ok: false, code: "tooLong", country: null, normalized };
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { ok: false, code: "invalidChars", country: null, normalized };
  }
  const country = normalized.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(country)) {
    return { ok: false, code: "invalidChars", country: null, normalized };
  }
  const expectedLength = IBAN_COUNTRY_LENGTH[country];
  if (expectedLength == null) {
    /* On accepte les pays inconnus du registre tant que la structure
     * generale est ok et que le mod-97 passe (cas marginaux). */
    return mod97(toNumeric(normalized)) === 1
      ? { ok: true, code: "ok", country, normalized }
      : { ok: false, code: "unknownCountry", country, normalized };
  }
  if (normalized.length !== expectedLength) {
    return { ok: false, code: "wrongLength", country, normalized };
  }
  if (mod97(toNumeric(normalized)) !== 1) {
    return { ok: false, code: "invalidChecksum", country, normalized };
  }
  return { ok: true, code: "ok", country, normalized };
}

/**
 * Convertit un IBAN normalise en sa forme numerique mod-97 :
 *   - rotation : on met les 4 premiers caracteres a la fin
 *   - chaque lettre A..Z -> 10..35
 */
function toNumeric(normalized: string): string {
  const rotated = normalized.slice(4) + normalized.slice(0, 4);
  let out = "";
  for (let i = 0; i < rotated.length; i++) {
    const code = rotated.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      out += rotated[i];
    } else {
      out += String(10 + code - 65);
    }
  }
  return out;
}
