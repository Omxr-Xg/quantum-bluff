import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  persistPendingReferralCode,
} from "../referralStorage";

describe("referralStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("persiste et relit un code de parrainage", () => {
    persistPendingReferralCode(" abcd1234 ");
    expect(getPendingReferralCode()).toBe("abcd1234");
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
