import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  normalizeReferralInput,
  persistPendingReferralCode,
} from "../referralStorage";

describe("referralStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("normalise le code saisi", () => {
    expect(normalizeReferralInput(" ab12-cd ")).toBe("AB12CD");
  });

  it("persiste et relit un code de parrainage", () => {
    persistPendingReferralCode(" abcd1234 ");
    expect(getPendingReferralCode()).toBe("ABCD1234");
  });

  it("ignore les codes vides", () => {
    persistPendingReferralCode("   ");
    expect(getPendingReferralCode()).toBeUndefined();
  });

  it("efface le code en attente", () => {
    persistPendingReferralCode("REFCODE1");
    clearPendingReferralCode();
    expect(getPendingReferralCode()).toBeUndefined();
  });
});
