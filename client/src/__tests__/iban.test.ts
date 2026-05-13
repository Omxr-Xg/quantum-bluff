import { describe, it, expect } from "vitest";
import { validateIban, formatIban, normalizeIban } from "../utils/iban";

describe("validateIban", () => {
  /* Echantillons d'IBAN reels (sources : registres officiels ISO 13616). */
  const VALID = [
    "FR1420041010050500013M02606",
    "DE89370400440532013000",
    "GB82WEST12345698765432",
    "ES9121000418450200051332",
    "IT60X0542811101000000123456",
    "BE68539007547034",
    "CH9300762011623852957",
    "NL91ABNA0417164300",
    "PT50000201231234567890154",
  ];

  it.each(VALID)("accepte un IBAN reel : %s", (raw) => {
    const r = validateIban(raw);
    expect(r.ok).toBe(true);
    expect(r.code).toBe("ok");
    expect(r.country).toBe(raw.slice(0, 2));
  });

  it.each(VALID)("tolere les espaces de saisie : %s", (raw) => {
    const r = validateIban(raw.match(/.{1,4}/g)!.join(" "));
    expect(r.ok).toBe(true);
  });

  it("rejette une chaine vide", () => {
    expect(validateIban("").code).toBe("empty");
  });

  it("rejette un IBAN trop court", () => {
    expect(validateIban("FR123").code).toBe("tooShort");
  });

  it("rejette un IBAN avec longueur incorrecte pour le pays", () => {
    /* Bon checksum potentiel mais mauvaise longueur pour FR (27) */
    const r = validateIban("FR1420041010050500013M02606123");
    expect(r.ok).toBe(false);
    expect(["tooLong", "wrongLength"]).toContain(r.code);
  });

  it("rejette un checksum mod-97 incorrect", () => {
    /* On flip une chiffre du checksum (FR14 -> FR15) */
    const r = validateIban("FR1520041010050500013M02606");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("invalidChecksum");
  });

  it("rejette des caracteres non alphanumeriques", () => {
    const r = validateIban("FR14-2004*1010_0505 0001 3M02 606");
    /* L'espace/tiret sont strippes par normalizeIban, le * reste => invalidChars */
    expect(r.ok).toBe(false);
    expect(r.code).toBe("invalidChars");
  });
});

describe("formatIban / normalizeIban", () => {
  it("normalise (uppercase + supprime espaces/tirets)", () => {
    expect(normalizeIban(" fr14 2004-1010 0505 0001 3m02 606 ")).toBe(
      "FR1420041010050500013M02606",
    );
  });

  it("formate par groupes de 4", () => {
    expect(formatIban("FR1420041010050500013M02606")).toBe(
      "FR14 2004 1010 0505 0001 3M02 606",
    );
  });

  it("retourne une chaine vide si entree vide", () => {
    expect(formatIban("")).toBe("");
    expect(normalizeIban("")).toBe("");
  });
});
