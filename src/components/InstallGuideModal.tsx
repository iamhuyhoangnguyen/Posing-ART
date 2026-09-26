import React, { useEffect, useState } from "react";
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  HelpCircle,
  ExternalLink,
  ArrowRight,
  Globe,
  ShieldCheck,
  HardDrive,
  Info,
  Sparkles,
} from "lucide-react";
import { APP_VERSION } from "../version";
import { isPWA } from "../services/platformService";
import { fetchServerVersion } from "../services/versionService";

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
  onDownloadHtmlOffline?: () => void;
  onOpenUpdateModal?: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  onInstallPwa,
  canInstallPwa = false,
  onDownloadHtmlOffline,
  onOpenUpdateModal,
}) => {
  const [activePlatformTab, setActivePlatformTab] = useState<"android" | "pwa">("android");
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchServerVersion().then((version) => {
      if (version) setAndroidDownloadUrl(version.android.downloadUrl || "");
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Cài Đặt POSING ART
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dùng trên Web và Android
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActivePlatformTab("android")}
            className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activePlatformTab === "android"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (.apk)</span>
          </button>

          <button
            onClick={() => setActivePlatformTab("pwa")}
            className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activePlatformTab === "pwa"
                ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web / PWA</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ANDROID (.APK) */}
        {/* ======================================================== */}
        {activePlatformTab === "android" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Direct APK Download Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full">
                  Android Standalone App
                </span>
              <span className="text-xs text-emerald-100 font-bold">Android APK</span>
              </div>
              <h3 className="font-extrabold text-base">Tải File Cài Đặt POSING ART.apk</h3>
              <p className="text-xs text-emerald-50 leading-relaxed">
                Cài trực tiếp trên điện thoại Android, lưu ảnh ngoại tuyến và đồng bộ dữ liệu đám mây với bản Web.
              </p>

              {androidDownloadUrl ? <a
                href={androidDownloadUrl}
                download="POSING_ART.apk"
                className="w-full py-2.5 px-4 bg-white text-zinc-900 font-extrabold text-xs rounded-xl shadow hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>TẢI VỀ POSING ART.apk NGAY</span>
              </a> : <p className="text-xs font-bold text-white/90">Bản APK chưa phát hành. Liên kết tải sẽ xuất hiện tại đây khi có bản cài đặt.</p>}
            </div>

            {/* Android APK Installation Steps */}
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Các bước cài đặt file APK trên Android
                </h4>
              </div>

              <ol className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bước 1:</span>
                  <span>Khi bản APK được phát hành, bấm nút tải ở phía trên để lưu file về điện thoại.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bước 2:</span>
                  <span>
                    Mở thông báo tải xuống (hoặc vào ứng dụng <em>Quản lý tệp / Downloads</em>) và nhấn vào file vừa tải.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bước 3:</span>
                  <span>
                    Nếu điện thoại hỏi bảo mật: Bật mục <strong>"Cho phép cài đặt ứng dụng từ nguồn này"</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bước 4:</span>
                  <span>Nhấn <strong>"Cài đặt"</strong> và mở ứng dụng để trải nghiệm mượt mà!</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: WEB / PWA */}
        {/* ======================================================== */}
        {activePlatformTab === "pwa" && (
          <div className="space-y-4 animate-fadeIn">
            {canInstallPwa && onInstallPwa && (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
                    Khuyên dùng
                  </span>
                  <span className="text-xs text-amber-100">Cài đặt 1-chạm</span>
                </div>
                <h3 className="font-extrabold text-base">Cài đặt PWA vào màn hình chính</h3>
                <p className="text-xs text-amber-50 leading-relaxed">
                  Trình duyệt đã sẵn sàng. Nhấn nút bên dưới để tạo biểu tượng POSING ART trên màn hình như ứng dụng cài từ Store!
                </p>
                <button
                  onClick={() => {
                    onInstallPwa();
                    onClose();
                  }}
                  className="w-full mt-2 py-2.5 px-4 bg-white text-zinc-900 font-extrabold text-xs rounded-xl shadow hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  Cài Đặt Ứng Dụng Ngay
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-3">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Thêm vào màn hình chính trên trình duyệt di động
              </h4>
              <ol className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">Chrome/Edge:</span>
                  <span>Bấm dấu <strong>3 chấm (⋮)</strong> góc trên → Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">Safari (iOS):</span>
                  <span>Bấm nút <strong>Chia sẻ (Share)</strong> hình mũi tên lên → Chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</span>
                </li>
              </ol>
            </div>

            {onDownloadHtmlOffline && (
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Xuất file HTML đơn ngoại tuyến
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    1 file duy nhất chứa đầy đủ dữ liệu, mở offline không cần internet
                  </p>
                </div>
                <button
                  onClick={onDownloadHtmlOffline}
                  className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải HTML</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Đồng bộ tức thì mọi dữ liệu với Cloud</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
