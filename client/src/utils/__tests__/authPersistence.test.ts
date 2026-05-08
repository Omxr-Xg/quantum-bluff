import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  migrateLegacyAuthOnStartup,
  scheduleMigrateLegacyAuthOnStartup,
} from "../authStorage";
import {
  hasCapacitorBridgeObject,
  isCapacitorNative,
  isElectron,
  shouldPersistAuth,
} from "../platform";

describe("platform / auth persistence", () => {
  const originalCapacitor = (globalThis as Window & { Capacitor?: unknown }).Capacitor;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "vitest-jsdom",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCapacitor !== undefined) {
      (window as Window & { Capacitor?: unknown }).Capacitor = originalCapacitor as never;
    } else {
      delete (window as Window & { Capacitor?: unknown }).Capacitor;
    }
  });

  it("web: shouldPersistAuth false (jsdom) et migration copie token local → session puis vide local", () => {
    expect(shouldPersistAuth()).toBe(false);
    localStorage.setItem("token", "web-legacy-token");
    migrateLegacyAuthOnStartup();
    expect(sessionStorage.getItem("token")).toBe("web-legacy-token");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("indice natif: objet Capacitor présent → pas de purge local même si shouldPersistAuth encore false", () => {
    (window as Window & { Capacitor?: Record<string, never> }).Capacitor = {};
    expect(hasCapacitorBridgeObject()).toBe(true);
    localStorage.setItem("token", "native-token");
    migrateLegacyAuthOnStartup();
    expect(localStorage.getItem("token")).toBe("native-token");
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("Capacitor: isNativePlatform true → shouldPersistAuth et pas de migration destructive", () => {
    (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true,
    };
    expect(isCapacitorNative()).toBe(true);
    expect(shouldPersistAuth()).toBe(true);
    localStorage.setItem("token", "cap-token");
    migrateLegacyAuthOnStartup();
    expect(localStorage.getItem("token")).toBe("cap-token");
  });

  it("Capacitor: getPlatform android → natif", () => {
    (window as Window & { Capacitor?: { getPlatform: () => string } }).Capacitor = {
      getPlatform: () => "android",
    };
    expect(isCapacitorNative()).toBe(true);
    expect(shouldPersistAuth()).toBe(true);
  });

  it("Capacitor: isNative true (bridge legacy) → natif", () => {
    (window as Window & { Capacitor?: { isNative: boolean } }).Capacitor = {
      isNative: true,
    };
    expect(isCapacitorNative()).toBe(true);
  });

  it("scheduleMigrateLegacyAuthOnStartup exécute la migration après un microtask (web)", async () => {
    localStorage.setItem("token", "scheduled");
    scheduleMigrateLegacyAuthOnStartup();
    expect(sessionStorage.getItem("token")).toBeNull();
    await Promise.resolve();
    expect(sessionStorage.getItem("token")).toBe("scheduled");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("scheduleMigrateLegacyAuthOnStartup ne purge pas si bridge Capacitor apparaît avant le microtask", async () => {
    localStorage.setItem("token", "late-bridge");
    scheduleMigrateLegacyAuthOnStartup();
    (window as Window & { Capacitor?: Record<string, never> }).Capacitor = {};
    await Promise.resolve();
    expect(localStorage.getItem("token")).toBe("late-bridge");
  });
});

describe("isElectron", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { electron?: unknown }).electron;
  });

  it("détecte window.electron.isElectron", () => {
    (window as Window & { electron?: { isElectron: boolean } }).electron = { isElectron: true };
    expect(isElectron()).toBe(true);
  });
});
