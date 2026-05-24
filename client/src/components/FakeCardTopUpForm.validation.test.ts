import { describe, expect, it } from "vitest";
import {
  expectedFakeCardCvvLength,
  isCardExpiryValid,
  isCardNumberLuhnValid,
  isFakeCardComplete,
  isFakeCardCvvValid,
  simulatedEurFromChips,
} from "./FakeCardTopUpForm";

describe("isCardNumberLuhnValid", () => {
  it("accepte un PAN 16 chiffres valide (Luhn)", () => {
    expect(isCardNumberLuhnValid("4242424242424242")).toBe(true);
    expect(isCardNumberLuhnValid("4242 4242 4242 4242")).toBe(true);
  });

  it("refuse un PAN dont le dernier chiffre casse le Luhn", () => {
    expect(isCardNumberLuhnValid("4242424242424243")).toBe(false);
  });

  it("refuse longueur hors 13–19", () => {
    expect(isCardNumberLuhnValid("424242424242")).toBe(false); // 12 chiffres
    expect(isCardNumberLuhnValid("4".repeat(20))).toBe(false);
  });
});

describe("simulatedEurFromChips", () => {
  it("convertit l'achat au taux 1 euro pour 10 jetons", () => {
    expect(simulatedEurFromChips(10, null)).toBe(1);
    expect(simulatedEurFromChips(100, null)).toBe(10);
  });
});

describe("isCardExpiryValid", () => {
  it("accepte le mois courant", () => {
    const ref = new Date(2026, 4, 8); // May 2026
    expect(isCardExpiryValid("05/26", ref)).toBe(true);
  });

  it("refuse un mois passé", () => {
    const ref = new Date(2026, 4, 8);
    expect(isCardExpiryValid("04/26", ref)).toBe(false);
  });

  it("refuse MM invalide", () => {
    expect(isCardExpiryValid("00/26", new Date())).toBe(false);
    expect(isCardExpiryValid("13/26", new Date())).toBe(false);
  });
});

describe("CVV Amex vs standard", () => {
  it("Amex 15 → 4 chiffres", () => {
    const pan = "378282246310005"; // sample Amex test (Luhn valid)
    expect(expectedFakeCardCvvLength(pan)).toBe(4);
    expect(isFakeCardCvvValid(pan, "1234")).toBe(true);
    expect(isFakeCardCvvValid(pan, "123")).toBe(false);
  });

  it("Visa 16 → 3 chiffres", () => {
    const pan = "4242424242424242";
    expect(expectedFakeCardCvvLength(pan)).toBe(3);
    expect(isFakeCardCvvValid(pan, "123")).toBe(true);
    expect(isFakeCardCvvValid(pan, "1234")).toBe(false);
  });
});

describe("isFakeCardComplete", () => {
  const ref = new Date(2026, 4, 8);

  it("valide une carte cohérente", () => {
    expect(
      isFakeCardComplete("4242424242424242", "12/30", "123", "Jean Dupont", ref),
    ).toBe(true);
  });

  it("refuse nom trop court ou sans lettre", () => {
    expect(isFakeCardComplete("4242424242424242", "12/30", "123", "AB", ref)).toBe(false);
    expect(isFakeCardComplete("4242424242424242", "12/30", "123", "12345", ref)).toBe(false);
  });
});
