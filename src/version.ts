/**
 * POSING ART — Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh
 * Centralized Application Version Management
 * Single source of truth for Web and Android (.apk)
 */

export const APP_VERSION = "3.1.1";
export const APP_BUILD_NUMBER = 311;
export const APP_NAME = "POSING ART";
export const APP_SUBTITLE = "Sổ Tay Tạo Dáng & Trợ Lý Nhiếp Ảnh Thực Tế";
export const APP_MINIMUM_SUPPORTED_VERSION = "1.0.0";
export const APP_RELEASE_DATE = "2026-10-02";

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
  "Phiên bản 3.1.1: tạo link QR công khai lâu dài để xem gallery danh mục không cần đăng nhập.",
  "Phiên bản 3.1.0: bỏ ảnh mặc định khỏi danh mục, thêm quay ảnh ngẫu nhiên, chia sẻ QR và chế độ Cue card toàn màn hình.",
  "Phiên bản 3.0.3: thêm tìm ảnh tương tự khi xem ảnh lớn và bảo đảm mỗi slide chỉ hiển thị một ảnh.",
  "Phiên bản 3.0.2: phân biệt ảnh tải lên với ảnh mặc định, chuyển ảnh mượt hơn và gộp thao tác ảnh bìa/đổi tên vào menu.",
  "Phiên bản 3.0.1: sửa thao tác xóa và lướt ảnh trong thư viện, căn lại nút chỉnh sửa ảnh bìa.",
  "Phiên bản 3.0.0: thư viện ảnh phẳng theo danh mục, tối đa 100 ảnh và tìm ảnh tương tự bằng Google Lens.",
  "Phiên bản 2.9.0: kéo thả ảnh/link Pinterest-RedNote, đổi tên và quản lý danh mục/dáng bằng menu Admin.",
  "Phiên bản 2.8.3: lưu bộ gợi ý nhanh AI theo từng concept trên thiết bị trong 7 ngày; lỗi quota tự dùng tag tĩnh.",
  "Phiên bản 2.8.2: tự thử lại tối đa hai lần khi Gemini trả 503/UNAVAILABLE.",
  "Phiên bản 2.8.1: hiển thị trợ lý AI ngay đầu chi tiết chủ đề và gợi ý vuốt xuống khi mở app lần đầu.",
  "Phiên bản 2.8.0: AI tạo gợi ý tìm kiếm Pinterest/Rednote theo từng concept và pose có sẵn.",
  "Phiên bản 2.7.0: kéo thả nhiều ảnh vào chủ đề trên Web và tự ẩn lịch sử đã xem sau 24 giờ.",
  "Phiên bản 2.6.3: mở tìm kiếm RedNote trực tiếp trong app trên Android, tự dự phòng sang web nếu chưa cài.",
  "Phiên bản 2.6.2: công tắc giao diện Sáng/Tối gọn hơn và link tìm kiếm mở app trên điện thoại khi có thể.",
  "Phiên bản 2.6.1: sửa khung hiển thị ảnh bìa và tải ảnh trực tuyến ổn định hơn.",
  "Phiên bản 2.6.0: xóa chủ đề dành cho Admin, tìm kiếm toàn thư viện, xem gần đây và gợi ý dáng ngẫu nhiên.",
  "Phiên bản 2.5.0: xem lại ảnh đã tải offline, tạo tờ tham khảo từ nhiều dáng và chuyển ảnh mượt hơn.",
  "Phiên bản 2.4.1: giới hạn 30 ảnh cho mỗi chủ đề và dọn nút tạo dáng AI không còn được sử dụng.",
  "Phiên bản 2.4: căn chỉnh vùng ảnh bìa trước khi lưu, lướt ảnh tham khảo bằng thao tác vuốt và cải thiện tải ảnh RedNote.",
  "Phiên bản 2.3.2: ảnh bìa từ Pinterest/RedNote được tải và lưu trong app thay vì hotlink.",
  "Phiên bản 2.3.1: đổi giao diện sáng/tối/theo hệ thống bằng một nút bấm.",
  "Phiên bản 2.3: điều hướng danh mục, chỉnh ảnh bìa và trải nghiệm giao diện được cải thiện.",
  "Danh mục Kỷ Yếu mở màn chi tiết riêng giống Concept, có nút quay lại danh sách.",
  "Modal ảnh bìa hỗ trợ xem trước link Pinterest/RedNote và dán ảnh trực tiếp từ clipboard.",
  "Chế độ sáng/tối có lựa chọn Theo hệ thống và hiệu ứng chuyển mượt.",
  "Thêm chip tìm nhanh cho dáng đứng, dáng ngồi và concept vintage.",
  "Cải thiện thông báo cập nhật Web/PWA và hiển thị phiên bản app trên header.",
];
