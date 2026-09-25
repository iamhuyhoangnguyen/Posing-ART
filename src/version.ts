/**
 * POSING ART — Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh
 * Centralized Application Version Management
 * Single source of truth for Web, Windows (.exe) and Android (.apk)
 */

export const APP_VERSION = "1.1.0";
export const APP_BUILD_NUMBER = 110;
export const APP_NAME = "POSING ART";
export const APP_SUBTITLE = "Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh Thực Tế";
export const APP_MINIMUM_SUPPORTED_VERSION = "1.0.0";
export const APP_RELEASE_DATE = "2026-09-24";

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
  windows: PlatformUpdateInfo;
  android: PlatformUpdateInfo;
  web: {
    updateAvailable: boolean;
    version: string;
  };
}

export const CURRENT_RELEASE_NOTES = [
  "Kiến trúc Đa Nền Tảng duy nhất: Web/PWA, Windows (.exe) và Android (.apk) dùng chung 1 codebase.",
  "Hệ thống Đồng Bộ Đám Mây 2 chiều (Cloud Database Sync) liên thông tài khoản, mục yêu thích, dáng đã lưu và ý tưởng.",
  "Cơ chế giải quyết xung đột Last-Write-Wins dựa trên timestamp chuẩn xác.",
  "Hỗ trợ Cache ngoại tuyến & Offline Queue tự động đẩy dữ liệu khi có mạng.",
  "Trợ lý AI Cố Vấn & Tạo Biến Thể Dáng trực quan trên cả Desktop và Mobile.",
  "Hỗ trợ kiểm tra và tải cập nhật tự động cho Windows và Android.",
];
