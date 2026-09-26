import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  Download,
  Smartphone,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HardDrive,
  Info,
} from "lucide-react";
import { APP_VERSION, APP_NAME, CURRENT_RELEASE_NOTES } from "../version";
import { getAppPlatform, isPWA } from "../services/platformService";
import { checkAppUpdate, compareSemver } from "../services/versionService";

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ isOpen, onClose }) => {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    androidDownloadUrl?: string;
    releaseNotes?: string[];
    platform: string;
    fileSize?: string;
  }>({
    updateAvailable: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    platform: getAppPlatform(),
  });

  const [hasChecked, setHasChecked] = useState(false);

  const platform = getAppPlatform();

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const info = await checkAppUpdate();
      setUpdateInfo(info);
      setHasChecked(true);
    } catch (err) {
      console.error("Check update error:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleCheckUpdate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 ${checking ? "animate-spin" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Cập Nhật Ứng Dụng
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-extrabold text-zinc-600 dark:text-zinc-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hệ thống cập nhật phiên bản đa nền tảng đồng bộ
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

        {/* Current Platform Card */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {platform === "android" ? (
              <Smartphone className="w-5 h-5 text-emerald-500" />
            ) : (
              <Globe className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Nền tảng hiện tại:{" "}
                <span className="text-amber-600 dark:text-amber-400 uppercase">
                  {platform === "android"
                    ? "Android App (.apk)"
                    : isPWA()
                    ? "Web PWA (Đã cài đặt)"
                    : "Trình duyệt Web"}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Codebase thống nhất — Dữ liệu đám mây chung
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            <span>{checking ? "Đang kiểm tra..." : "Kiểm tra"}</span>
          </button>
        </div>

        {/* Update Status Result */}
        {updateInfo.updateAvailable ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider">
                Có phiên bản mới!
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                v{updateInfo.latestVersion}
              </span>
            </div>

            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              POSING ART đã có phiên bản nâng cấp với các tính năng tạo dáng và đồng bộ mới nhất.
            </p>

            {/* Platform specific action */}
            {platform === "android" && (
              <div className="space-y-2 pt-1">
                <a
                  href={updateInfo.downloadUrl}
                  download="POSING_ART.apk"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>TẢI FILE CÀI ĐẶT ANDROID (.APK) — {updateInfo.fileSize || "12 MB"}</span>
                </a>
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    Hướng dẫn cài file APK trên Android:
                  </div>
                  <div>1. Mở file APK vừa tải trong mục "Tệp đã tải xuống".</div>
                  <div>2. Nếu Android hỏi quyền, chọn <strong>"Cài đặt từ nguồn này"</strong>.</div>
                  <div>3. Chọn "Cập nhật" để ghi đè phiên bản mới mà không mất dữ liệu.</div>
                </div>
              </div>
            )}

            {platform === "web" && (
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>TẢI LẠI TRANG ĐỂ ÁP DỤNG NGAY</span>
              </button>
            )}
          </div>
        ) : hasChecked ? (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${compareSemver(updateInfo.latestVersion, APP_VERSION) > 0 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"}`}>
            {compareSemver(updateInfo.latestVersion, APP_VERSION) > 0 ? <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" /> : <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {compareSemver(updateInfo.latestVersion, APP_VERSION) > 0 ? `Có phiên bản ${updateInfo.latestVersion}, nhưng bộ cài chưa được phát hành.` : "Bạn đang sử dụng phiên bản mới nhất!"}
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {compareSemver(updateInfo.latestVersion, APP_VERSION) > 0 ? "Vui lòng quay lại sau khi có liên kết tải chính thức." : `Phiên bản v${APP_VERSION} đang hoạt động và đồng bộ với máy chủ.`}
              </div>
            </div>
          </div>
        ) : null}

        {/* Release Notes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Tính năng trong phiên bản v{APP_VERSION}
          </h3>
          <ul className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            {(updateInfo.releaseNotes || CURRENT_RELEASE_NOTES).map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download POSING ART for Android */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Tải POSING ART cho Android
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {/* Android APK */}
            {updateInfo.androidDownloadUrl ? <a
              href={updateInfo.androidDownloadUrl}
              download="POSING_ART.apk"
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-900/60 flex items-center gap-3 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Android (.apk)
                </div>
                <div className="text-[10px] text-zinc-500">Capacitor APK • 12 MB</div>
              </div>
              <Download className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500" />
            </a> : <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">Android (.apk) — chưa phát hành</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mã hóa an toàn • Đám mây hợp nhất</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
