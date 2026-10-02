import { getCurrentUser, refreshCurrentUserSession } from "../utils/userAuth";
import { serverUrl } from "./apiUrl";

export async function getOrCreateCategoryShareToken(section: "kyyeu" | "canhan", categoryId: string): Promise<string> {
  let user = getCurrentUser();
  let token = user?.token || "";
  if (!token) throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");

  const send = (activeToken: string) => fetch(serverUrl("/api/share/category-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
    body: JSON.stringify({ section, categoryId }),
  });

  let response = await send(token);
  if (response.status === 401 && user) {
    user = await refreshCurrentUserSession(user);
    token = user?.token || "";
    if (token) response = await send(token);
  }

  const result = await response.json().catch(() => ({})) as { shareToken?: string; error?: string };
  if (!response.ok || typeof result.shareToken !== "string") {
    throw new Error(result.error || `Không thể tạo link chia sẻ (${response.status}).`);
  }
  return result.shareToken;
}