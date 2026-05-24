import { apiUrl } from "./apiBase";
import { getAuthItem } from "./authStorage";

export type AdminGiftCodeRow = {
  id: string;
  code: string;
  amount: number;
  usageType: string;
  type: string;
  description: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  createdAt: string;
};

export type AdminGiftCodeCreatePayload = {
  code: string;
  amount: number;
  usageType: string;
  type: string;
  description: string | null;
  expiresAt: string | null;
  maxUses: number;
};

function adminAuthHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Essaie plusieurs chemins API (VM peut n’avoir qu’un sous-ensemble des routes). */
async function fetchAdminGiftCodesApi(
  method: "GET" | "POST",
  paths: string[],
  body?: AdminGiftCodeCreatePayload,
): Promise<Response> {
  let last: Response | null = null;
  for (const path of paths) {
    const res = await fetch(apiUrl(path), {
      method,
      headers: adminAuthHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status !== 404) return res;
    last = res;
  }
  return last ?? new Response(null, { status: 404 });
}

const LIST_PATHS = [
  "/api/auth/admin/gift-codes?limit=50",
  "/api/admin/console/gift-codes?limit=50",
  "/api/gift-codes/admin/list?limit=50",
];

const CREATE_PATHS = [
  "/api/auth/admin/gift-codes",
  "/api/admin/console/gift-codes",
  "/api/gift-codes/admin/create",
];

export async function listAdminGiftCodes(): Promise<Response> {
  return fetchAdminGiftCodesApi("GET", LIST_PATHS);
}

export async function createAdminGiftCode(body: AdminGiftCodeCreatePayload): Promise<Response> {
  return fetchAdminGiftCodesApi("POST", CREATE_PATHS, body);
}

export function parseAdminGiftCodesList(data: unknown): AdminGiftCodeRow[] {
  return (data as { codes?: AdminGiftCodeRow[] }).codes ?? [];
}
