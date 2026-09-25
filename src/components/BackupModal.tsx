import React, { useState } from "react";
import {
  X,
  Download,
  Upload,
  FileCode,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  HardDrive,
} from "lucide-react";
import { CategoryItem } from "../types";
import { exportAllData, importBackupData, exportSingleFileHtml } from "../utils/exportImport";
import { clearAllPhotos } from "../utils/db";

interface BackupModalProps {
  kyyeuData: CategoryItem[];
  canhanData: CategoryItem[];
  onDataRestored: (newKyyeu: CategoryItem[], newCanhan: CategoryItem[]) => void;
  onResetSession: () => void;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  kyyeuData,
  canhanData,
  onDataRestored,
  onResetSession,
  onClose,
}) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      setStatusMessage("Đang đóng gói dữ liệu và ảnh tham khảo...");
      await exportAllData(kyyeuData, canhanData);
      setStatusMessage("Đã xuất file sao lưu thành công!");
    } catch (e: any) {
      console.error(e);
      setError("Lỗi khi xuất file sao lưu: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setError("");
      setStatusMessage("Đang nạp dữ liệu và khôi phục ảnh...");
      const result = await importBackupData(file);
      onDataRestored(result.kyyeuData, result.canhanData);
      setStatusMessage(`Khôi phục thành công! Đã nạp lại ${result.photoCount} ảnh tham khảo.`);
    } catch (err: any) {
      console.error(err);
      setError("Lỗi khi khôi phục: " + err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleDownloadSingleFile = () => {
    try {
      exportSingleFileHtml(kyyeuData, canhanData);
      setStatusMessage("Đã tạo file HTML chạy Offline! Bạn có thể gửi file qua Zalo/Snapdrop mở trực tiếp trên điện thoại.");
    } catch (e: any) {
      setError("Lỗi tạo file HTML: " + e.message);
    }
  };

  const handleClearAllStorage = async () => {
    if (
      window.confirm(
        "CẢNH BÁO: Thao tác này sẽ xóa toàn bộ ảnh tham khảo trong máy và đặt lại tiến độ chụp. Bạn có chắc chắn muốn xóa không?"
      )
    ) {
      await clearAllPhotos();
      onResetSession();
      setStatusMessage("Đã làm sạch toàn bộ dữ liệu tạm và tiến độ.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FolderArchive className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Sao Lưu & Quản Lý Dữ Liệu
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Bảo vệ ảnh tham khảo và chuẩn bị offline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Status notification */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Option 1: Export single-file HTML */}
          <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Xuất File HTML Chạy Offline
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Tải về 1 file <code>.html</code> duy nhất không cần mạng, gửi qua Zalo / Snapdrop mở trực tiếp trên Safari hoặc Chrome điện thoại khi đi chụp ở nơi không có 4G!
            </p>
            <button
              onClick={handleDownloadSingleFile}
              className="w-full mt-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              Tải file HTML Offline (.html)
            </button>
          </div>

          {/* Option 2: JSON Backup & Restore */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Sao Lưu & Khôi Phục (JSON)
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Lưu giữ toàn bộ ảnh tham khảo, dáng chụp đã lưu, trạng thái hoàn thành để phòng trường hợp xóa lịch sử trình duyệt hoặc đổi sang máy mới.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Đang xuất..." : "Sao lưu JSON"}
              </button>

              <label className="cursor-pointer py-2.5 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center">
                <Upload className="w-3.5 h-3.5" />
                {importing ? "Đang nạp..." : "Khôi phục"}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>
            </div>
          </div>

          {/* Option 3: Reset Session */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                if (window.confirm("Đặt lại tất cả các dáng về trạng thái 'Chưa chụp' cho buổi chụp mới?")) {
                  onResetSession();
                  setStatusMessage("Đã đặt lại tiến độ toàn bộ buổi chụp.");
                }
              }}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset tiến độ ca chụp mới
            </button>

            <button
              onClick={handleClearAllStorage}
              className="text-rose-500 hover:text-rose-600 font-semibold hover:underline"
            >
              Xóa sạch ảnh trong máy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
