import { serverUrl } from "./apiUrl";

export async function getOrCreateCategoryShareToken(section: "kyyeu" | "canhan", categoryId: string): Promise<string> {
  const response = await fetch(serverUrl("/api/share/category-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, categoryId }),
  });
  const result = await response.json().catch(() => ({})) as { shareToken?: string; error?: string };
  if (!response.ok || typeof result.shareToken !== "string") {
    throw new Error(result.error || `Không thể tạo link chia sẻ (${response.status}).`);
  }
  return result.shareToken;
}