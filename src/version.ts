/**
 * POSING ART — Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh
 * Centralized Application Version Management
 * Single source of truth for Web and Android (.apk)
 */

export const APP_VERSION = "2.3.1";
export const APP_BUILD_NUMBER = 231;
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
  "Phiên bản 2.3.1: đổi giao diện sáng/tối/theo hệ thống bằng một nút bấm.",
  "Phiên bản 2.3: điều hướng danh mục, chỉnh ảnh bìa và trải nghiệm giao diện được cải thiện.",
  "Danh mục Kỷ Yếu mở màn chi tiết riêng giống Concept, có nút quay lại danh sách.",
  "Modal ảnh bìa hỗ trợ xem trước link Pinterest/RedNote và dán ảnh trực tiếp từ clipboard.",
  "Chế độ sáng/tối có lựa chọn Theo hệ thống và hiệu ứng chuyển mượt.",
  "Thêm chip tìm nhanh cho dáng đứng, dáng ngồi và concept vintage.",
  "Cải thiện thông báo cập nhật Web/PWA và hiển thị phiên bản app trên header.",
];
