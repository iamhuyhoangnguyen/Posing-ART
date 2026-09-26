import { UserAccount } from "../types";
import { serverUrl } from "../services/apiUrl";

const CURRENT_USER_KEY = "posing_art_current_user";
const SAVED_SESSION_KEY = "posing_art_saved_session";
const REGISTERED_USERS_KEY = "posing_art_local_registered_users";

// Older releases kept locally-created passwords in plain text; those fake accounts cannot authenticate to the server.
if (typeof localStorage !== "undefined") localStorage.removeItem(REGISTERED_USERS_KEY);
export function getSavedSessionSetting(): boolean {
  const val = localStorage.getItem(SAVED_SESSION_KEY);
  return val === null ? true : val === "true"; // default true so user doesn't have to log in repeatedly
}

export function setSavedSessionSetting(save: boolean): void {
  localStorage.setItem(SAVED_SESSION_KEY, String(save));
}

export function getCurrentUser(): UserAccount | null {
  try {
    const userStr = localStorage.getItem(CURRENT_USER_KEY) || sessionStorage.getItem(CURRENT_USER_KEY);
    if (!userStr) return null;
    const user = JSON.parse(userStr) as UserAccount;
    if (!user.token?.includes(".")) {
      localStorage.removeItem(CURRENT_USER_KEY);
      sessionStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem("posing_art_admin_token");
      sessionStorage.removeItem("posing_art_admin_token");
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function isUserLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function isCurrentUserAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === "admin";
}

export function canUserDeletePhotos(): boolean {
  return isCurrentUserAdmin();
}

export function saveUserSession(user: UserAccount, remember: boolean = true): void {
  const json = JSON.stringify(user);
  localStorage.removeItem("posing_art_admin_token");
  sessionStorage.removeItem("posing_art_admin_token");
  if (remember) {
    localStorage.setItem(CURRENT_USER_KEY, json);
    localStorage.setItem(SAVED_SESSION_KEY, "true");
    // Also set admin storage key for backward compatibility
    if (user.role === "admin") {
      if (user.token) localStorage.setItem("posing_art_admin_token", user.token);
    }
  } else {
    sessionStorage.setItem(CURRENT_USER_KEY, json);
    localStorage.removeItem(CURRENT_USER_KEY);
    if (user.role === "admin") {
      if (user.token) sessionStorage.setItem("posing_art_admin_token", user.token);
    }
  }
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem("posing_art_admin_token");
  sessionStorage.removeItem("posing_art_admin_token");
  // Notify window of auth change
  window.dispatchEvent(new Event("auth_state_changed"));
}

/**
 * Login with username and password
 * Credentials are verified by the server; a failed connection never fabricates a server session.
 */
export async function loginWithCredentials(
  username: string,
  password: string,
  remember: boolean = true
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  // Try server first for sync across devices
  try {
    const res = await fetch(serverUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        saveUserSession(data.user, remember);
        window.dispatchEvent(new Event("auth_state_changed"));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || "Máy chủ không trả về tài khoản hợp lệ." };
    } else {
      const err = await res.json();
      if (res.status === 401) {
        return { success: false, error: err.error || "Tên tài khoản hoặc mật khẩu không chính xác" };
      }
    }
  } catch {
    // Keep local data available, but never create a server-authenticated session offline.
  }

  return {
    success: false,
    error: "Không thể xác thực với máy chủ. Hãy kết nối mạng và thử lại.",
  };
}

/**
 * Register a sub-account without requiring Gmail or external accounts
 */
export async function registerSubAccount(
  username: string,
  password: string,
  name: string,
  remember: boolean = true
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUser = username.trim();
  const cleanPass = password.trim();
  const cleanName = name.trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: "Tên đăng nhập phải từ 3 ký tự trở lên" };
  }
  if (!cleanPass || cleanPass.length < 10) {
    return { success: false, error: "Mật khẩu phải từ 10 ký tự trở lên" };
  }

  // Try server register
  try {
    const res = await fetch(serverUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
        name: cleanName || cleanUser,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        saveUserSession(data.user, remember);
        window.dispatchEvent(new Event("auth_state_changed"));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || "Máy chủ không trả về tài khoản hợp lệ." };
    } else {
      const err = await res.json();
      return { success: false, error: err.error || "Không thể đăng ký tài khoản lúc này" };
    }
  } catch {
    return { success: false, error: "Cần kết nối máy chủ để tạo tài khoản. Dữ liệu ngoại tuyến trên thiết bị vẫn được giữ lại." };
  }
}

/**
 * Social login (Google / Facebook)
 */
export async function loginWithSocial(
  provider: "google" | "facebook",
  _remember: boolean = true
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  return { success: false, error: `Đăng nhập ${provider === "google" ? "Google" : "Facebook"} chưa được cấu hình.` };
}
