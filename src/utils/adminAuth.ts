// Admin authentication management for RBAC
// Normal users can upload photos and poses freely.
// Admin authentication is strictly required for DELETING photos or DELETING poses/categories.

import { serverUrl } from "../services/apiUrl";
import { getCurrentUser, getSavedSessionSetting, saveUserSession } from "./userAuth";

const ADMIN_STORAGE_KEY = "posing_art_admin_token";

export function getStoredAdminPin(): string {
  return "";
}

export async function setStoredAdminPin(newPin: string): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await fetch(serverUrl("/api/cloud/admin/change-pin"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newPin: newPin.trim() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(): boolean {
  try {
    const sessionToken = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    const localToken = localStorage.getItem(ADMIN_STORAGE_KEY);
    const token = sessionToken || localToken;
    if (token?.includes(".")) return true;
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

export async function loginAsAdmin(pin: string, remember: boolean = false): Promise<boolean> {
  const trimmed = pin.trim();

  // Try server verification first
  try {
    const res = await fetch(serverUrl("/api/cloud/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token) {
        if (remember) {
          localStorage.setItem(ADMIN_STORAGE_KEY, data.token);
        } else {
          sessionStorage.setItem(ADMIN_STORAGE_KEY, data.token);
        }
        window.dispatchEvent(new Event("auth_state_changed"));
        return true;
      }
    }
  } catch {
    // offline fallback
  }

  return false;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  window.dispatchEvent(new Event("auth_state_changed"));
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
}

export type AdminVerificationResult = "admin" | "denied" | "unavailable";

async function verifyAdminToken(token: string): Promise<AdminVerificationResult> {
  let response: Response;
  try {
    response = await fetch(serverUrl("/api/auth/verify-admin"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return "unavailable";
  }

  if (response.status === 401) {
    let refreshResponse: Response;
    try {
      refreshResponse = await fetch(serverUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      return "unavailable";
    }
    if (refreshResponse.status === 401 || refreshResponse.status === 403) return "denied";
    if (!refreshResponse.ok) return "unavailable";

    let refreshedToken: string;
    try {
      const result = await refreshResponse.json() as { token?: string };
      if (typeof result.token !== "string" || !result.token) return "unavailable";
      refreshedToken = result.token;
    } catch {
      return "unavailable";
    }

    const currentUser = getCurrentUser();
    if (currentUser?.token === token) {
      saveUserSession({ ...currentUser, token: refreshedToken }, getSavedSessionSetting());
    }
    if (localStorage.getItem(ADMIN_STORAGE_KEY)) localStorage.setItem(ADMIN_STORAGE_KEY, refreshedToken);
    else if (sessionStorage.getItem(ADMIN_STORAGE_KEY)) sessionStorage.setItem(ADMIN_STORAGE_KEY, refreshedToken);

    try {
      response = await fetch(serverUrl("/api/auth/verify-admin"), {
        headers: { Authorization: `Bearer ${refreshedToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      return "unavailable";
    }
  }

  if (response.status === 401 || response.status === 403) return "denied";
  if (!response.ok) return "unavailable";
  try {
    const result = await response.json() as { success?: boolean; role?: string };
    if (result.success !== true) return "unavailable";
    return result.role === "admin" ? "admin" : "denied";
  } catch {
    return "unavailable";
  }
}

/** Verifies admin privileges against the server before showing admin-only controls. */
export async function verifyAdminSession(): Promise<AdminVerificationResult> {
  let tokens: string[];
  try {
    tokens = [...new Set([getAdminToken(), getCurrentUser()?.token].filter((token): token is string => Boolean(token)))];
  } catch {
    return "unavailable";
  }

  let sawUnavailable = false;
  for (const token of tokens) {
    try {
      const result = await verifyAdminToken(token);
      if (result === "admin") return result;
      if (result === "unavailable") sawUnavailable = true;
    } catch (error) {
      console.warn("[Admin Auth] Could not verify administrator session:", error instanceof Error ? error.message : error);
      sawUnavailable = true;
    }
  }
  return sawUnavailable ? "unavailable" : "denied";
}
