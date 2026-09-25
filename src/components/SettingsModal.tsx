import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Moon,
  Sun,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Smartphone,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Lock,
  Unlock,
  ShieldAlert,
  FolderGit2,
} from "lucide-react";
import {
  isAdminAuthenticated,
  logoutAdmin,
  loginAsAdmin,
  setStoredAdminPin,
} from "../utils/adminAuth";
import { performCloudSync, getCloudStatus } from "../utils/cloudSync";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  totalPoses: number;
  doneCount: number;
  totalPhotos: number;
  onResetSession: () => void;
  onRestoreDefaultData: () => void;
  onOpenBackup: () => void;
  onOpenInstallGuide: () => void;
  onDownloadHtmlOffline: () => void;
  onSyncComplete?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  totalPoses,
  doneCount,
  totalPhotos,
  onResetSession,
  onRestoreDefaultData,
  onOpenBackup,
  onOpenInstallGuide,
  onDownloadHtmlOffline,
  onSyncComplete,
}) => {
  const [showConfirmResetSession, setShowConfirmResetSession] = useState(false);
  const [showConfirmRestoreDefault, setShowConfirmRestoreDefault] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<string>("Đang tính...");
  const [cloudStatus, setCloudStatus] = useState<{ connected: boolean; photosCount: number }>({
    connected: true,
    photosCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Admin states
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAdminLoggedIn(isAdminAuthenticated());
      loadCloudInfo();

      if ("storage" in navigator && "estimate" in navigator.storage) {
        navigator.storage
          .estimate()
          .then((estimate) => {
            if (estimate.usage !== undefined) {
              const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
              setStorageEstimate(`${mb} MB đã lưu`);
            } else {
              setStorageEstimate("Khả dụng");
            }
          })
          .catch(() => {
            setStorageEstimate("Khả dụng");
          });
      }
    }
  }, [isOpen]);

  const loadCloudInfo = async () => {
    const st = await getCloudStatus();
    setCloudStatus({ connected: st.connected, photosCount: st.photosCount });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await performCloudSync();
      setSyncFeedback(res.connected
        ? `✓ Đã đồng bộ: gửi ${res.uploaded} ảnh, nhận ${res.downloaded} ảnh (${res.totalCloudPhotos} ảnh chung)`
        : "Chưa kết nối máy chủ. Ảnh vẫn được giữ trên thiết bị và sẽ thử gửi lại khi có mạng.");
      await loadCloudInfo();
      onSyncComplete?.();
    } catch {
      setSyncFeedback("Không thể kết nối Cloud Drive lúc này.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin.trim()) return;
    const ok = await loginAsAdmin(enteredPin, true);
    if (ok) {
      setAdminLoggedIn(true);
      setShowPinInput(false);
      setEnteredPin("");
      setPinError("");
    } else {
      setPinError("Mã PIN không chính xác hoặc máy chủ chưa được cấu hình.");
    }
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminLoggedIn(false);
    setShowPinInput(false);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 12) {
      setPinError("Mã PIN mới phải từ 12 ký tự trở lên");
      return;
    }
    const saved = await setStoredAdminPin(newPin.trim());
    if (!saved) {
      setPinError("Không thể cập nhật PIN trên máy chủ. Hãy đăng nhập lại khi có mạng.");
      return;
    }
    setPinSuccess("Đã đổi mã PIN Admin thành công!");
    setShowChangePin(false);
    setNewPin("");
    setTimeout(() => setPinSuccess(""), 3000);
  };

  if (!isOpen) return null;

  const percent = totalPoses > 0 ? Math.round((doneCount / totalPoses) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Cài Đặt & Quản Lý Dữ Liệu
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Đồng bộ Cloud Drive, cập nhật an toàn & phân quyền Admin
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

        {/* SECTION 1: CLOUD DRIVE & ĐỒNG BỘ ĐA THIẾT BỊ (REQUIREMENT 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              Lưu Trữ Cloud Drive & Đa Thiết Bị
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Dùng máy nào cũng có sẵn
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-50 to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-800/40 border border-amber-200/80 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Hệ thống Cloud Drive Ekip
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {cloudStatus.connected
                    ? `Đang kết nối • ${cloudStatus.photosCount} ảnh chung trên Drive`
                    : "Đang ở chế độ ngoại tuyến (Offline)"}
                </p>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
              </button>
            </div>

            {syncFeedback && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                {syncFeedback}
              </p>
            )}

            <div className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-amber-200/60 dark:border-zinc-700/60 pt-2 space-y-1">
              <p>
                ✓ <strong>Tự động tải về máy:</strong> Bất kỳ máy nào mở app (điện thoại, máy tính) đều tự động nhận đủ ảnh tham khảo mà người khác đã tải lên.
              </p>
              <p>
                ✓ <strong>Tải lên tự do:</strong> Mọi người trong ekip (mẫu, trợ lý, thợ ảnh) đều có thể tải ảnh lên thoải mái không cần đăng nhập.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: QUYỀN ADMIN XÓA DỮ LIỆU (RBAC) */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            Phân Quyền Quản Trị Viên (Admin)
          </h3>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    adminLoggedIn
                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                  }`}
                >
                  {adminLoggedIn ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    {adminLoggedIn
                      ? "✓ Đang ở chế độ Quản trị viên (Admin)"
                      : "Chế độ Thành viên / Cộng tác viên"}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {adminLoggedIn
                      ? "Bạn có toàn quyền xóa ảnh & cấu hình dữ liệu"
                      : "Được xem & tải ảnh lên. Cần quyền Admin để xóa"}
                  </p>
                </div>
              </div>

              {adminLoggedIn ? (
                <button
                  onClick={handleAdminLogout}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95"
                >
                  Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => setShowPinInput(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm active:scale-95"
                >
                  Nhập mã Admin
                </button>
              )}
            </div>

            {/* Admin PIN Login Form */}
            {showPinInput && !adminLoggedIn && (
              <form onSubmit={handleAdminLogin} className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                  Nhập mã PIN Admin để mở khóa quyền xóa:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoFocus
                  placeholder="Nhập mã PIN do quản trị viên cấu hình"
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      if (pinError) setPinError("");
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold active:scale-95"
                  >
                    Xác nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPinInput(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>
                {pinError && <p className="text-xs text-rose-500 font-bold">{pinError}</p>}
              </form>
            )}

            {/* Change PIN option for Admin */}
            {adminLoggedIn && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                {!showChangePin ? (
                  <button
                    onClick={() => setShowChangePin(true)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Đổi mã PIN Admin mới
                  </button>
                ) : (
                  <form onSubmit={handleChangePin} className="space-y-2">
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                      Nhập mã PIN Admin mới (tối thiểu 12 ký tự):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        minLength={12}
                        placeholder="Tạo mã PIN riêng, ít nhất 12 ký tự"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold"
                      >
                        Lưu PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChangePin(false)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-xs font-bold"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
                {pinSuccess && <p className="text-xs text-emerald-600 font-bold">{pinSuccess}</p>}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: BẢO TOÀN DỮ LIỆU KHI CẬP NHẬT ĐÈ (REQUIREMENT 2) */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Cập Nhật Ứng Dụng Đè Lên Bản Cũ (Không Mất Dữ Liệu)
          </h3>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
              <span>✓ Cơ chế Tự Động Bảo Toàn 100% Ảnh & Ghi Chú</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
              Ứng dụng lưu ảnh mẫu vào cơ sở dữ liệu vĩnh viễn <strong>IndexedDB</strong> trên máy và đồng bộ lên <strong>Cloud Drive</strong>. Khi bạn tải bản mới về hoặc làm mới ứng dụng, hệ thống chỉ cập nhật giao diện mà <strong>tuyệt đối không xóa bất kỳ ảnh tham khảo hay dáng nào của bạn</strong>.
            </p>
          </div>
        </div>

        {/* SECTION 4: GIAO DIỆN (THEME) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Giao diện & Hiển thị
          </h3>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {darkMode ? "Chế độ Tối (Dark Mode)" : "Chế độ Sáng (Light Mode)"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {darkMode ? "Dịu mắt khi chụp ban đêm hoặc trong studio" : "Rõ nét khi chụp ngoài trời sáng"}
                </p>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-hidden ${
                darkMode ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  darkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* SECTION 5: QUẢN LÝ TIẾN ĐỘ CA CHỤP */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Quản lý ca chụp
          </h3>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Tiến độ buổi chụp hiện tại</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {doneCount} / {totalPoses} dáng ({percent}%)
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Ảnh tham khảo đã lưu</p>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                {totalPhotos} tấm ({storageEstimate})
              </p>
            </div>
          </div>

          {!showConfirmResetSession ? (
            <button
              onClick={() => setShowConfirmResetSession(true)}
              className="w-full p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 border border-zinc-200/80 dark:border-zinc-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <RotateCcw className="w-4 h-4" />
              Bắt đầu ca chụp mới (Đặt lại trạng thái "Đã chụp")
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Xác nhận bắt đầu ca chụp mới?
              </div>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-200 leading-relaxed">
                Tất cả các dáng đang đánh dấu "Đã chụp" sẽ chuyển về chưa chụp. Toàn bộ ảnh tham khảo & dáng bạn tự thêm vẫn được giữ nguyên 100%!
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    onResetSession();
                    setShowConfirmResetSession(false);
                  }}
                  className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold active:scale-95"
                >
                  Xác nhận đặt lại
                </button>
                <button
                  onClick={() => setShowConfirmResetSession(false)}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6: SAO LƯU & XUẤT FILE */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Xuất file ngoại tuyến & Sao lưu
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={onDownloadHtmlOffline}
              className="p-3 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              Tải file HTML Offline
            </button>

            <button
              onClick={() => {
                onOpenBackup();
                onClose();
              }}
              className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-zinc-700 transition-all active:scale-98"
            >
              <HardDrive className="w-4 h-4 text-amber-500" />
              Sao lưu / Khôi phục JSON
            </button>
          </div>
        </div>

        {/* SECTION 7: KHÔI PHỤC DỮ LIỆU GỐC (REQUIRES ADMIN) */}
        <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {!showConfirmRestoreDefault ? (
            <button
              onClick={() => {
                if (!isAdminAuthenticated()) {
                  setShowPinInput(true);
                } else {
                  setShowConfirmRestoreDefault(true);
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục danh mục chuẩn ban đầu (Chuyên biệt chụp nữ)
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Xác nhận khôi phục toàn bộ danh mục gốc?
              </div>
              <p className="text-[11px] text-rose-900/80 dark:text-rose-200 leading-relaxed">
                Thao tác này sẽ đặt lại cấu trúc danh mục về chuẩn mới nhất cho nữ và kỷ yếu thanh xuân.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    onRestoreDefaultData();
                    setShowConfirmRestoreDefault(false);
                    onClose();
                  }}
                  className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active:scale-95"
                >
                  Đồng ý khôi phục
                </button>
                <button
                  onClick={() => setShowConfirmRestoreDefault(false)}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 text-[11px] text-zinc-400">
          <p className="font-semibold text-zinc-600 dark:text-zinc-400">POSING ART HANDBOOK v3.0 CLOUD</p>
          <p>Sổ tay tra cứu tư thế chụp nữ • Kết nối Pinterest, Rednote & Cloud Drive</p>
        </div>
      </div>
    </div>
  );
};
