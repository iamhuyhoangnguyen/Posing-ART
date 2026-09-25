import dotenv from "dotenv";

dotenv.config();

export function assertNativeApiUrl() {
  const rawUrl = (process.env.VITE_API_BASE_URL || "").trim();
  if (!rawUrl) {
    throw new Error(
      "Thiếu VITE_API_BASE_URL. Hãy đặt URL HTTPS của máy chủ POSING trong .env trước khi build ứng dụng native để đăng nhập và đồng bộ hoạt động."
    );
  }

  let apiUrl;
  try {
    apiUrl = new URL(rawUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL không phải URL hợp lệ.");
  }

  if (apiUrl.protocol !== "https:" || apiUrl.pathname !== "/" || apiUrl.search || apiUrl.hash) {
    throw new Error("VITE_API_BASE_URL phải là URL gốc HTTPS, ví dụ https://api.ten-mien-cua-ban.vn.");
  }
}
