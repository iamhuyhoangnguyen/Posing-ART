# POSING ART

Sổ tay tạo dáng và trợ lý nhiếp ảnh. Giao diện dùng React/TypeScript; máy chủ Express cung cấp tài khoản, đồng bộ dữ liệu và các tính năng AI. Ảnh mẫu và dữ liệu thao tác được lưu trên thiết bị để dùng ngoại tuyến.

## Chạy bản phát triển

1. Cài Node.js.
2. Cài thư viện bằng `npm install`.
3. Sao chép `.env.example` thành `.env`, rồi thay các giá trị mẫu bằng khóa Gemini và thông tin quản trị riêng.
4. Chạy `npm run dev` và mở địa chỉ hiện trong cửa sổ lệnh.

Không dùng các giá trị bắt đầu bằng `replace-` cho máy chủ production. Hãy đặt `AUTH_TOKEN_SECRET` ngẫu nhiên tối thiểu 32 ký tự; `ADMIN_PASSWORD` và `ADMIN_PIN` cần tối thiểu 12 ký tự. Giữ `.env` và khóa riêng tư ngoài mã nguồn.

Web cùng máy chủ có thể để `VITE_API_BASE_URL` trống. Khi build bản Tauri hoặc Capacitor, đặt biến này thành địa chỉ gốc HTTPS của máy chủ POSING trước khi chạy lệnh build, để mọi thiết bị dùng chung tài khoản và dữ liệu. Nếu host giao diện web riêng, thêm đúng domain đó vào `CORS_ORIGINS` trên máy chủ.

Chỉ điền `WINDOWS_DOWNLOAD_URL` và `ANDROID_DOWNLOAD_URL` trên máy chủ sau khi đã tạo và tải lên bộ cài thật. Khi để trống, giao diện sẽ báo bản cài chưa phát hành và máy chủ không tạo liên kết tải giả.

Máy chủ lưu tài khoản và dữ liệu đám mây trong `cloud_drive_store.json`. Trên Render, filesystem mặc định là tạm thời; gói Free không hỗ trợ Persistent Disk nên dữ liệu cục bộ có thể mất khi restart/redeploy. Để giữ dữ liệu, nâng backend lên gói hỗ trợ disk, mở service trong Render Dashboard → **Disks** → **Add Disk**, đặt mount path `/data`, rồi thêm biến môi trường `DATA_DIR=/data`. Chỉ dữ liệu nằm dưới mount path được giữ lại. Sau khi lưu cấu hình, chờ Render deploy lại và kiểm tra log cảnh báo `[Storage]` để xác nhận `DATA_DIR` đang trỏ đúng `/data`. Không chạy nhiều instance với file store cục bộ; chúng không dùng chung dữ liệu và có thể ghi đè lên nhau. Cần triển khai máy chủ này với tên miền HTTPS trước khi build ứng dụng native. Script build sẽ dừng sớm nếu chưa có `VITE_API_BASE_URL` hợp lệ.

Có thể triển khai backend bằng Dockerfile trong repo. Cấu hình trên dịch vụ host các biến `AUTH_TOKEN_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_PIN`, `GEMINI_API_KEY`, và `CORS_ORIGINS` khi cần; gắn ổ đĩa bền vững vào `/data`, chỉ chạy một instance, rồi dùng `/api/health` làm health check. Không đưa `.env` hoặc `data/cloud_drive_store.json` vào image.

## Lưu ý về tài khoản và dữ liệu

- Đăng ký, đăng nhập, tải ảnh lên máy chủ và đồng bộ cần kết nối máy chủ.
- Ảnh và ghi chú đã lưu trên thiết bị vẫn dùng được ngoại tuyến; phiên đăng nhập giả lập cũ không còn được chấp nhận.
- Đăng nhập Google/Facebook sẽ được bật lại sau khi tích hợp OAuth xác thực thật.
- Dữ liệu tài khoản cũ trong `data/cloud_drive_store.json` được nâng cấp mật khẩu sang dạng băm khi máy chủ khởi động. Tệp dữ liệu không nên đưa vào kho mã nguồn.

## Bản Windows và Android

Mã nguồn có cấu hình Tauri cho Windows và Capacitor cho Android. Cài Node.js 20.19 trở lên (hoặc 22.12 trở lên). Build Windows cần Rust MSVC, Microsoft C++ Build Tools và WebView2; build Android cần Android Studio, Android SDK và JDK 17 trở lên. Sau khi cài thư viện (`npm install`), tạo dự án Android một lần bằng `npm run android:init`. Đặt `VITE_API_BASE_URL` trong `.env` thành URL gốc HTTPS của máy chủ trước khi build để ứng dụng trên các thiết bị kết nối cùng tài khoản.

- Windows: `npm run build:tauri` tạo bộ cài NSIS/MSI trong `src-tauri/target/release/bundle/`.
- Android: `npm run build:android` tạo APK debug tại `android/app/build/outputs/apk/debug/app-debug.apk`. APK này dùng cài thử; phát hành cập nhật cho người dùng cần APK release ký bằng keystore ổn định.
- Tauri tự tạo icon từ `src-tauri/app-icon.svg` khi build. Cập nhật ứng dụng trong giao diện hiện dùng URL phát hành đã cấu hình trên máy chủ; updater riêng của Tauri đã được gỡ do trước đó trỏ tới endpoint và khóa ký không thuộc dự án.

`bun.lock` cần được làm mới bằng `bun install` nếu dùng Bun thay vì npm. Các URL tải trong phiên bản hiện tại để trống cho đến khi có bộ cài phát hành thật.
