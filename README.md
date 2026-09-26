# POSING ART 2.2.0

Sổ tay tạo dáng và trợ lý nhiếp ảnh. Dự án hỗ trợ Web/PWA và Android; tài khoản, ảnh và dữ liệu concept đồng bộ qua backend Express.

## Chạy bản phát triển

1. Cài Node.js 20.19 trở lên (hoặc 22.12 trở lên).
2. Cài thư viện bằng `npm install`.
3. Sao chép `.env.example` thành `.env`, rồi điền thông tin backend và các khóa cần thiết.
4. Chạy `npm run dev`.

Production mặc định kết nối API tại `https://posing-art.onrender.com`. Có thể ghi đè URL bằng `VITE_API_BASE_URL`; bản phát triển để trống biến này sẽ dùng cùng origin. Backend cần `AUTH_TOKEN_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` và `ADMIN_PIN`; mật khẩu quản trị và PIN cần tối thiểu 12 ký tự. Các tính năng gọi Gemini cần `GEMINI_API_KEY` trên backend.

## Dữ liệu backend trên Render

Máy chủ lưu dữ liệu trong `cloud_drive_store.json`. Filesystem Render mặc định là tạm thời; để giữ dữ liệu qua redeploy/restart, dùng service hỗ trợ Persistent Disk, gắn disk tại `/data`, đặt `DATA_DIR=/data`, rồi deploy lại. Chỉ dữ liệu nằm dưới mount path được giữ. Chỉ chạy một instance khi dùng file store cục bộ. Dùng `/api/health` làm health check.

## Web và Android

- Web/PWA: `npm run build` tạo nội dung trong `dist/`. Nếu biến API không được đặt cho production, ứng dụng mặc định gọi backend Render ở trên.
- Android: cài Android Studio, Android SDK và JDK 17 trở lên. Tạo dự án Android lần đầu bằng `npm run android:init`; cấu hình URL HTTPS backend trong `.env`, sau đó chạy `npm run build:android` để tạo APK debug.

## Tính năng ảnh và AI

Ảnh được lưu ngoại tuyến trong IndexedDB. Có thể chọn nhiều ảnh cho một tư thế; Android mở trình chọn ảnh nhiều mục. Từ menu ba chấm trên ảnh có thể tải hoặc chia sẻ; chế độ chọn nhiều cho phép tải hàng loạt.

Backend cung cấp `/api/ai/creative-chat` và `/api/ai/analyze-pose`. Khi triển khai, đặt `GEMINI_API_KEY` trên Render. `/api/health` và `/api/version` cung cấp trạng thái dịch vụ và thông tin phiên bản.

Không đưa `.env`, khóa riêng tư hoặc `data/cloud_drive_store.json` vào kho mã nguồn.
