// Admin authentication management for RBAC
// Normal users can upload photos and poses freely.
// Admin authentication is strictly required for DELETING photos or DELETING poses/categories.

import { serverUrl } from "../services/apiUrl";

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
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
}
