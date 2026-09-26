/**
 * POSING ART — Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh
 * Centralized Application Version Management
 * Single source of truth for Web and Android (.apk)
 */

export const APP_VERSION = "2.2.0";
export const APP_BUILD_NUMBER = 220;
export const APP_NAME = "POSING ART";
export const APP_SUBTITLE = "Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh Thực Tế";
export const APP_MINIMUM_SUPPORTED_VERSION = "1.0.0";
export const APP_RELEASE_DATE = "2026-09-26";

export interface PlatformUpdateInfo {
  updateAvailable: boolean;
  version: string;
  downloadUrl: string;
  fileSize?: string;
  instructions?: string;
}

export interface VersionInfoResponse {
  currentVersion: string;
  minimumVersion: string;
  releaseDate: string;
  releaseNotes: string[];
  android: PlatformUpdateInfo;
  web: {
    updateAvailable: boolean;
    version: string;
  };
}

export const CURRENT_RELEASE_NOTES = [
  "Phiên bản 2.2: tập trung Web/PWA và Android (.apk).",
  "Hệ thống Đồng Bộ Đám Mây 2 chiều (Cloud Database Sync) liên thông tài khoản, mục yêu thích, dáng đã lưu và ý tưởng.",
  "Cơ chế giải quyết xung đột Last-Write-Wins dựa trên timestamp chuẩn xác.",
  "Hỗ trợ Cache ngoại tuyến & Offline Queue tự động đẩy dữ liệu khi có mạng.",
  "Picker Android hỗ trợ chọn nhiều ảnh; ảnh có menu tải xuống/chia sẻ và chọn hàng loạt.",
  "Cập nhật luồng AI, giao diện concept và hỗ trợ tải bản Android.",
];
