import React, { useState, useEffect } from "react";
import {
  Camera,
  Download,
  Moon,
  Sun,
  RotateCcw,
  Sparkles,
  FolderArchive,
  Plus,
  Wifi,
  WifiOff,
  Smartphone,
  User,
} from "lucide-react";
import { FilterStatus } from "../types";
import { APP_VERSION } from "../version";

interface HeaderProps {
  onBackToHome?: () => void;
  showBack?: boolean;
  title: string;
  subtitle?: string;
  showProgressAndFilters?: boolean;
  completedCount: number;
  totalCount: number;
  filterStatus?: FilterStatus;
  onFilterChange?: (status: FilterStatus) => void;
  onOpenBackup: () => void;
  onOpenAddCustom: () => void;
  onOpenAIGenerator: () => void;
  onOpenInstallGuide?: () => void;
  onOpenUpdate?: () => void;
  onOpenSettings?: () => void;
  onOpenPersonal?: () => void;
  onResetSession: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onBackToHome,
  showBack,
  title,
  subtitle,
  showProgressAndFilters = true,
  completedCount,
  totalCount,
  filterStatus = "all",
  onFilterChange,
  onOpenBackup,
  onOpenAddCustom,
  onOpenAIGenerator,
  onOpenInstallGuide,
  onOpenUpdate,
  onOpenSettings,
  onOpenPersonal,
  onResetSession,
  darkMode,
  onToggleDarkMode,
}) => {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const handlePersonalClick = onOpenPersonal || onOpenSettings;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="pt-4 pb-3 px-4 max-w-2xl mx-auto border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showBack && onBackToHome ? (
            <button
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95 transition-all text-zinc-900 dark:text-zinc-100"
            >
              ← Về menu
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base">
              <Camera className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h1>
              {/* Online / Offline status badge */}
              <span
                title={
                  isOnline
                    ? "Đang kết nối: Có thể dùng toàn bộ tính năng AI và tải ảnh trực tuyến"
                    : "Đang ngoại tuyến: Mọi dữ liệu tư thế & ảnh lưu máy hoạt động bình thường"
                }
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {isOnline ? "Online" : "Offline"}
              </span>

              {onOpenUpdate && (
                <button
                  onClick={onOpenUpdate}
                  title="Kiểm tra phiên bản & Cập nhật app"
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-amber-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-amber-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                >
                  v{APP_VERSION}
                </button>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAIGenerator}
            title="AI Studio Tạo Dáng Mẫu"
            className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="hidden sm:inline">AI Studio</span>
          </button>

          {onOpenInstallGuide && (
            <button
              onClick={onOpenInstallGuide}
              title="Tải & Cài đặt app về thiết bị (Hỗ trợ Ngoại tuyến 100%)"
              className="group p-2 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-2xs active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Cài App</span>
            </button>
          )}

          <button
            onClick={onOpenAddCustom}
            title="Thêm dáng / concept riêng"
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenBackup}
            title="Sao lưu / Xuất file Offline"
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            <FolderArchive className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleDarkMode}
            title={darkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {handlePersonalClick && (
            <button
              onClick={handlePersonalClick}
              title="Cá nhân (Tài khoản, Liên kết AI, Đồng bộ & Cài đặt)"
              className="p-2 rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Cá nhân</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Filters if in category view */}
      {showBack && showProgressAndFilters && (
        <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              Tiến độ chụp thực tế:
              <strong className="text-zinc-900 dark:text-zinc-100">
                {completedCount} / {totalCount} dáng ({percent}%)
              </strong>
            </span>

            {completedCount > 0 && (
              <button
                onClick={onResetSession}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 underline underline-offset-2"
              >
                <RotateCcw className="w-3 h-3" />
                Reset ca này
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Status filters */}
          {onFilterChange && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                Lọc:
              </span>
              <button
                onClick={() => onFilterChange("all")}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterStatus === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                onClick={() => onFilterChange("pending")}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterStatus === "pending"
                    ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                Chưa chụp ({totalCount - completedCount})
              </button>
              <button
                onClick={() => onFilterChange("completed")}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterStatus === "completed"
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                Đã xong ({completedCount})
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
