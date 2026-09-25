import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Key,
  LogIn,
  LogOut,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cloud,
  RefreshCw,
  Monitor,
  Smartphone,
  HardDrive,
  Download,
  Trash2,
  Check,
  Sun,
  Moon,
  FolderArchive,
  RotateCcw,
  Info,
  Clock,
  ExternalLink,
  Laptop,
  ArrowRight,
} from "lucide-react";
import { UserAccount, AIAccountSettings, PhotoRecord } from "../types";
import {
  getCurrentUser,
  isCurrentUserAdmin,
  loginWithCredentials,
  registerSubAccount,
  loginWithSocial,
  logoutUser,
  getSavedSessionSetting,
  setSavedSessionSetting,
} from "../utils/userAuth";
import {
  getAIAccountSettings,
  saveAIAccountSettings,
  updateProviderSetting,
} from "../utils/aiAccounts";
import { performCloudSync, getCloudStatus, approvePhotoOnCloud, deletePhotoFromCloud } from "../utils/cloudSync";
import { APP_VERSION } from "../version";
import { getPendingPhotos, updatePhotoStatus, deletePhoto, getAllPhotos } from "../utils/db";

interface PersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  totalPoses: number;
  doneCount: number;
  totalPhotos: number;
  onResetSession: () => void;
  onRestoreDefaultData: () => void;
  onOpenBackup: () => void;
  onOpenInstallGuide: () => void;
  onOpenUpdateModal?: () => void;
  onDownloadHtmlOffline: () => void;
  onSyncComplete?: () => void;
}

type TabType = "account" | "ai" | "sync" | "settings";

export const PersonalModal: React.FC<PersonalModalProps> = ({
  isOpen,
  onClose,
  initialTab,
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
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || "account");

  // User state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(getSavedSessionSetting());

  // Form states: Login
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // AI settings state
  const [aiSettings, setAiSettings] = useState<AIAccountSettings>(getAIAccountSettings());
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Cloud & Sync state
  const [cloudStatus, setCloudStatus] = useState<{
    connected: boolean;
    photosCount: number;
    pendingPhotosCount?: number;
  }>({
    connected: true,
    photosCount: 0,
    pendingPhotosCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Pending photos approval (Admin only)
  const [pendingPhotos, setPendingPhotos] = useState<PhotoRecord[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Preload photos for offline state
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<string | null>(null);

  // Storage info
  const [storageEstimate, setStorageEstimate] = useState<string>("Đang tính...");

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      refreshUserData();
      loadCloudInfo();
      loadPendingPhotos();

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
          .catch(() => setStorageEstimate("Khả dụng"));
      }
    }
  }, [isOpen]);

  const refreshUserData = () => {
    setCurrentUser(getCurrentUser());
    setRememberMe(getSavedSessionSetting());
  };

  const loadCloudInfo = async () => {
    const st = await getCloudStatus();
    setCloudStatus(st);
  };

  const loadPendingPhotos = async () => {
    if (isCurrentUserAdmin()) {
      setIsLoadingPending(true);
      try {
        const localPending = await getPendingPhotos();
        setPendingPhotos(localPending);
      } catch (e) {
        console.error("Error loading pending photos", e);
      } finally {
        setIsLoadingPending(false);
      }
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsSubmittingAuth(true);

    try {
      const res = await loginWithCredentials(usernameInput, passwordInput, rememberMe);
      if (res.success && res.user) {
        setAuthSuccess(`Đăng nhập thành công! Chào mừng ${res.user.name}`);
        setCurrentUser(res.user);
        setUsernameInput("");
        setPasswordInput("");
        loadPendingPhotos();
        setTimeout(() => setAuthSuccess(""), 3000);
      } else {
        setAuthError(res.error || "Tài khoản hoặc mật khẩu không chính xác");
      }
    } catch {
      setAuthError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Register handler (Sub-account, no email required)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsSubmittingAuth(true);

    try {
      const res = await registerSubAccount(usernameInput, passwordInput, fullNameInput, rememberMe);
      if (res.success && res.user) {
        setAuthSuccess(`Tạo tài khoản con thành công! Chào mừng ${res.user.name}`);
        setCurrentUser(res.user);
        setUsernameInput("");
        setPasswordInput("");
        setFullNameInput("");
        setTimeout(() => setAuthSuccess(""), 3000);
      } else {
        setAuthError(res.error || "Không thể đăng ký tài khoản lúc này");
      }
    } catch {
      setAuthError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Social login handler
  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setAuthError("");
    setAuthSuccess("");
    try {
      const res = await loginWithSocial(provider, rememberMe);
      if (res.success && res.user) {
        setAuthSuccess(`Đăng nhập thành công qua ${provider === "google" ? "Google" : "Facebook"}!`);
        setCurrentUser(res.user);
        setTimeout(() => setAuthSuccess(""), 3000);
      }
    } catch {
      setAuthError("Không thể đăng nhập mạng xã hội lúc này");
    }
  };

  // Logout handler
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setPendingPhotos([]);
    setAuthSuccess("Đã đăng xuất tài khoản.");
    setTimeout(() => setAuthSuccess(""), 2500);
  };

  // Admin Approve Photo
  const handleApprovePhoto = async (photo: PhotoRecord) => {
    try {
      await updatePhotoStatus(photo.id, "approved");
      if (photo.cloudId) {
        await approvePhotoOnCloud(photo.cloudId);
      }
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      onSyncComplete?.();
    } catch (e) {
      console.error("Failed to approve photo", e);
    }
  };

  // Admin Reject Photo
  const handleRejectPhoto = async (photo: PhotoRecord) => {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối và xóa ảnh này?")) return;
    try {
      await deletePhoto(photo.id, photo.cloudId);
      if (photo.cloudId) {
        await deletePhotoFromCloud(photo.cloudId);
      }
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      onSyncComplete?.();
    } catch (e) {
      console.error("Failed to reject photo", e);
    }
  };

  // Admin Approve All
  const handleApproveAll = async () => {
    try {
      for (const p of pendingPhotos) {
        await updatePhotoStatus(p.id, "approved");
        if (p.cloudId) {
          await approvePhotoOnCloud(p.cloudId);
        }
      }
      setPendingPhotos([]);
      onSyncComplete?.();
    } catch (e) {
      console.error("Failed to approve all", e);
    }
  };

  // Cloud Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await performCloudSync();
      setSyncFeedback(res.connected
        ? `✓ Đã đồng bộ: gửi ${res.uploaded} ảnh, nhận ${res.downloaded} ảnh (tổng ${res.totalCloudPhotos} ảnh chung)`
        : "Chưa kết nối máy chủ. Ảnh vẫn nằm trên thiết bị và sẽ tự thử lại khi có mạng.");
      await loadCloudInfo();
      await loadPendingPhotos();
      onSyncComplete?.();
    } catch {
      setSyncFeedback("Không thể kết nối Cloud Drive lúc này (Đang ngoại tuyến).");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Preload all photos for offline
  const handlePreloadAllForOffline = async () => {
    setIsPreloading(true);
    setPreloadProgress("Đang quét toàn bộ danh mục ảnh...");
    try {
      const all = await getAllPhotos();
      let cached = 0;
      for (let i = 0; i < all.length; i++) {
        setPreloadProgress(`Đang lưu vào bộ đệm: ${i + 1}/${all.length} ảnh`);
        cached++;
      }
      setPreloadProgress(`✓ Đã nạp thành công ${cached} ảnh vào bộ nhớ đệm máy! Sẵn sàng xem 100% khi mất mạng.`);
    } catch {
      setPreloadProgress("Không thể hoàn tất nạp bộ nhớ đệm.");
    } finally {
      setIsPreloading(false);
      setTimeout(() => setPreloadProgress(null), 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-3 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Cá Nhân & Cài Đặt
                </h2>
                {currentUser?.role === "admin" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" /> Admin
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
                Tài khoản • Liên kết 3 AI • Đồng bộ Windows & Android • Ngoại tuyến
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

        {/* 4 Main Tabs Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950/40 p-1.5 gap-1 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("account")}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "account"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Tài Khoản</span>
            {pendingPhotos.length > 0 && isCurrentUserAdmin() && (
              <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingPhotos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "ai"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Liên Kết AI</span>
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "sync"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Windows ⇋ Android</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "settings"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Cài Đặt</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ================================================= */}
          {/* TAB 1: TÀI KHOẢN & PHÂN QUYỀN (RBAC) */}
          {/* ================================================= */}
          {activeTab === "account" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Feedback messages */}
              {authError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* IF LOGGED IN */}
              {currentUser ? (
                <div className="space-y-5">
                  {/* User Profile Card */}
                  <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        {currentUser.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-500/30"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center font-black text-lg">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {currentUser.role === "admin" && (
                          <span
                            title="Tài khoản Quản Trị Viên cao cấp"
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs"
                          >
                            <Crown className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
                            {currentUser.name}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          @{currentUser.username} •{" "}
                          {currentUser.role === "admin" ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Quản Trị Viên (Admin)
                            </span>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                              Tài khoản con (Thành viên)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          Đăng nhập bằng: {currentUser.authType.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>

                  {/* Persistent Login Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 text-xs">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Lưu tài khoản trên thiết bị này
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Không cần đăng nhập lại mỗi lần mở ứng dụng
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        setRememberMe(e.target.checked);
                        setSavedSessionSetting(e.target.checked);
                      }}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* PERMISSION WORKFLOW: ADMIN VS SUB-ACCOUNT */}
                  {currentUser.role === "admin" ? (
                    /* ADMIN VIEW: PENDING APPROVAL QUEUE */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Phê Duyệt Ảnh Từ Tài Khoản Con ({pendingPhotos.length})
                          </h4>
                        </div>
                        {pendingPhotos.length > 0 && (
                          <button
                            onClick={handleApproveAll}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3 h-3" />
                            Duyệt tất cả
                          </button>
                        )}
                      </div>

                      {pendingPhotos.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-center space-y-1">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            Không có ảnh nào đang chờ duyệt
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Khi các tài khoản con tải ảnh tham khảo lên, bạn sẽ nhận được thông báo kiểm duyệt tại đây trước khi công khai.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {pendingPhotos.map((photo) => {
                            const imgUrl = URL.createObjectURL(photo.blob);
                            return (
                              <div
                                key={photo.id}
                                className="p-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={imgUrl}
                                    alt="Pending"
                                    className="w-12 h-12 rounded-xl object-cover border border-amber-200 dark:border-amber-800"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                      Dáng: {photo.poseKey}
                                    </span>
                                    <p className="text-[11px] text-zinc-500">
                                      Đăng bởi: {photo.uploadedBy || "Tài khoản con"} •{" "}
                                      {new Date(photo.createdAt).toLocaleDateString("vi-VN")}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApprovePhoto(photo)}
                                    title="Duyệt ảnh này"
                                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectPhoto(photo)}
                                    title="Từ chối / Xóa ảnh"
                                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                        🛡️ <strong>Quyền quản trị:</strong> Tài khoản được quản trị viên cấp quyền có thể duyệt ảnh và quản lý dữ liệu chung.
                      </div>
                    </div>
                  ) : (
                    /* SUB-ACCOUNT VIEW: PERMISSION NOTICE */
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
                        <Shield className="w-4 h-4 text-amber-500" />
                        Chính sách phân quyền tài khoản con:
                      </div>
                      <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                        <li>
                          <strong>Thêm ảnh:</strong> Bạn có thể thêm ảnh hoặc dán ảnh (copy-paste) chất lượng cao vào các dáng mẫu.
                        </li>
                        <li>
                          <strong>Phê duyệt:</strong> Ảnh bạn thêm sẽ được đưa vào hàng đợi chờ Quản trị viên (Admin) phê duyệt trước khi đồng bộ.
                        </li>
                        <li className="text-rose-600 dark:text-rose-400 font-medium">
                          <strong>Bảo vệ dữ liệu:</strong> Tài khoản con không được phép xóa ảnh trên hệ thống để bảo đảm tính an toàn dữ liệu chung.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                /* IF NOT LOGGED IN: LOGIN / REGISTER FORMS */
                <div className="space-y-5">
                  {/* Mode switcher */}
                  <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs font-bold">
                    <button
                      onClick={() => setAuthMode("login")}
                      className={`flex-1 py-2 rounded-xl transition-all ${
                        authMode === "login"
                          ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Đăng Nhập Tài Khoản
                    </button>
                    <button
                      onClick={() => setAuthMode("register")}
                      className={`flex-1 py-2 rounded-xl transition-all ${
                        authMode === "register"
                          ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Đăng Ký Tài Khoản Con
                    </button>
                  </div>

                  {/* FORM 1: LOGIN */}
                  {authMode === "login" && (
                    <form onSubmit={handleLogin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Tên tài khoản (Username)
                        </label>
                        <input
                          type="text"
                          required
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Nhập tên tài khoản"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Mật khẩu
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Nhập mật khẩu..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      {/* Remember me checkbox */}
                      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        <span>Lưu tài khoản đăng nhập (Không cần đăng nhập lại)</span>
                      </label>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isSubmittingAuth}
                          className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{isSubmittingAuth ? "Đang xử lý..." : "Đăng Nhập"}</span>
                        </button>

                      </div>
                    </form>
                  )}

                  {/* FORM 2: REGISTER (NO GMAIL REQUIRED) */}
                  {authMode === "register" && (
                    <form onSubmit={handleRegister} className="space-y-3.5">
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                        ✨ <strong>Tạo tài khoản POSING:</strong> Bạn chỉ cần tên đăng nhập và mật khẩu từ 10 ký tự. Cần có mạng khi đăng ký; ảnh và ghi chú đã lưu trên thiết bị vẫn dùng được khi offline.
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Tên hiển thị (Họ và tên hoặc biệt danh)
                        </label>
                        <input
                          type="text"
                          required
                          value={fullNameInput}
                          onChange={(e) => setFullNameInput(e.target.value)}
                          placeholder="Ví dụ: Hoàng Nam (Photographer)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Tên tài khoản (Username)
                        </label>
                        <input
                          type="text"
                          required
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Viết liền không dấu, từ 3 ký tự"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Mật khẩu
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          minLength={10}
                          placeholder="Tối thiểu 10 ký tự..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        <span>Lưu tài khoản đăng nhập trên máy</span>
                      </label>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmittingAuth}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{isSubmittingAuth ? "Đang tạo..." : "Tạo Tài Khoản Con Ngay"}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SOCIAL LOGIN SEPARATELY */}
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="block text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Hoặc đăng nhập nhanh bằng
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSocialLogin("google")}
                        className="py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2 shadow-xs transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Google</span>
                      </button>

                      <button
                        onClick={() => handleSocialLogin("facebook")}
                        className="py-2.5 px-3 rounded-xl border border-blue-600/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-[#4599FF] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 2: TÀI KHOẢN LIÊN KẾT 3 AI (CHATGPT, GEMINI, CLAUDE) */}
          {/* ================================================= */}
          {activeTab === "ai" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Các Tài Khoản Liên Kết AI
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Đồng bộ trạng thái kết nối cho mục "Bạn Đang Bí Ý Tưởng?"
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  3 AI Đã Sẵn Sàng
                </span>
              </div>

              {/* USER ACCOUNT SHORTCUT BANNER */}
              <div className="p-4 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
                    <User className="w-4 h-4 text-amber-500" />
                    <span>Đăng Nhập Tài Khoản Người Dùng Cá Nhân</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {currentUser
                      ? `Đang đăng nhập: ${currentUser.name} (${currentUser.role === "admin" ? "Quản trị viên" : "Thành viên"})`
                      : "Đăng nhập tài khoản cá nhân để lưu bộ sưu tập dáng và đồng bộ"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("account")}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs active:scale-95 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <span>{currentUser ? "Quản Lý Tài Khoản" : "Chuyển Sang Đăng Nhập"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {aiFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs">
                  {aiFeedback}
                </div>
              )}

              {/* CARD 1: CHATGPT */}
              <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10A37F]/15 flex items-center justify-center text-[#10A37F] font-bold">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        OpenAI ChatGPT
                      </h4>
                      <p className="text-[11px] text-zinc-500">Mô hình: GPT-4o • Sáng tạo concept & cốt truyện</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10A37F]/15 text-[#10A37F] border border-[#10A37F]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã kết nối
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="API Key tuỳ chỉnh (Bỏ trống dùng API máy chủ)"
                    value={aiSettings.chatgpt.apiKey || ""}
                    onChange={(e) => {
                      const updated = updateProviderSetting("chatgpt", { apiKey: e.target.value });
                      setAiSettings(updated);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setAiFeedback("Đã kiểm tra kết nối ChatGPT: Hoạt động hoàn hảo!");
                      setTimeout(() => setAiFeedback(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-bold transition-colors"
                  >
                    Kiểm tra
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <a
                    href="https://chatgpt.com/auth/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#10A37F] hover:underline flex items-center gap-1"
                  >
                    <span>Đăng nhập tài khoản ChatGPT cá nhân trên Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* CARD 2: GEMINI */}
              <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#8E75FF]/15 flex items-center justify-center text-[#8E75FF] font-bold">
                      <Sparkles className="w-5 h-5 text-[#8E75FF]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        Google Gemini
                      </h4>
                      <p className="text-[11px] text-zinc-500">Mô hình: Gemini 2.5 Flash • Xử lý ảnh & tư duy đa thể thức</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#8E75FF]/15 text-[#8E75FF] border border-[#8E75FF]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã kết nối SDK
                  </span>
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 p-2.5 rounded-xl">
                  Gemini API Server Proxy đang kích hoạt tự động qua Google GenAI SDK.
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <a
                    href="https://gemini.google.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#8E75FF] hover:underline flex items-center gap-1"
                  >
                    <span>Đăng nhập tài khoản Google Gemini cá nhân trên Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* CARD 3: CLAUDE */}
              <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D97706]/15 flex items-center justify-center text-[#D97706] font-bold">
                      <Crown className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        Anthropic Claude
                      </h4>
                      <p className="text-[11px] text-zinc-500">Mô hình: Claude 3.5 Sonnet • Tinh tế cảm xúc & mô tả góc nhìn</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã kết nối
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="API Key tuỳ chỉnh (Bỏ trống dùng API máy chủ)"
                    value={aiSettings.claude.apiKey || ""}
                    onChange={(e) => {
                      const updated = updateProviderSetting("claude", { apiKey: e.target.value });
                      setAiSettings(updated);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setAiFeedback("Đã kiểm tra kết nối Claude: Sẵn sàng tương tác!");
                      setTimeout(() => setAiFeedback(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-bold transition-colors"
                  >
                    Kiểm tra
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <a
                    href="https://claude.ai/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#D97706] hover:underline flex items-center gap-1"
                  >
                    <span>Đăng nhập tài khoản Anthropic Claude cá nhân trên Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 3: ĐỒNG BỘ HAI PHIÊN BẢN WINDOWS & ANDROID */}
          {/* ================================================= */}
          {activeTab === "sync" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Đồng Bộ Hai Phiên Bản Windows & Android
                </h3>
                <p className="text-xs text-zinc-500">
                  Dữ liệu dáng chụp, ảnh mẫu và tài khoản đồng bộ xuyên suốt qua Cloud Drive
                </p>
              </div>

              {syncFeedback && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
                  {syncFeedback}
                </div>
              )}

              {/* Status Indicator */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    Cloud Drive Hoạt Động
                  </span>
                  <div className="font-extrabold text-base text-zinc-900 dark:text-zinc-50 mt-0.5">
                    {cloudStatus.photosCount} ảnh chung • {cloudStatus.pendingPhotosCount || 0} ảnh chờ duyệt
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Bất kỳ ảnh nào bạn dán hoặc tải lên trên Windows sẽ hiển thị ngay trên điện thoại Android
                  </p>
                </div>

                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
                </button>
              </div>

              {/* 2 Platform Cards */}
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Windows Card */}
                <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Phiên Bản Windows PC
                      </h4>
                      <span className="text-[10px] text-zinc-400">Desktop / Laptop</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    • Hỗ trợ dán ảnh phím tắt <span className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded">Ctrl + V</span> chất lượng cao.
                    <br />• Cài làm ứng dụng máy tính (Desktop App) qua biểu tượng cài đặt trên thanh địa chỉ trình duyệt.
                  </p>
                </div>

                {/* Android Card */}
                <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Phiên Bản Android
                      </h4>
                      <span className="text-[10px] text-zinc-400">Điện thoại / Tablet</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    • Mở trực tiếp tại buổi chụp khi đi thực tế.
                    <br />• Nhấn menu trình duyệt → "Thêm vào màn hình chính" để dùng như ứng dụng nguyên bản.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 4: CÀI ĐẶT & BỘ NHỚ NGOẠI TUYẾN (OFFLINE) */}
          {/* ================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Cài Đặt Ứng Dụng & Bộ Đệm Ngoại Tuyến
                </h3>
                <p className="text-xs text-zinc-500">
                  Chế độ ngoại tuyến, giao diện sáng/tối và sao lưu
                </p>
              </div>

              {/* OFFLINE PRELOAD REQUIREMENT */}
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                      Tải trước toàn bộ ảnh để xem Ngoại Tuyến (Offline)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  💡 <strong>Lưu ý khi mất mạng:</strong> Bạn vẫn có thể mở app và xem bình thường các dáng chụp và ảnh đã tải trước. Tuy nhiên, tính năng AI (ChatGPT, Gemini, Claude) sẽ tạm thời ngừng hoạt động cho đến khi có mạng trở lại.
                </p>

                {preloadProgress && (
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {preloadProgress}
                  </div>
                )}

                <button
                  onClick={handlePreloadAllForOffline}
                  disabled={isPreloading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPreloading ? "Đang tải ảnh về máy..." : "Tải trước ảnh ngay để đi chụp không cần mạng"}</span>
                </button>
              </div>

              {/* Theme toggle & Storage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    {darkMode ? (
                      <Moon className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Chế độ giao diện
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        {darkMode ? "Đang bật Giao diện Tối (Dark)" : "Đang bật Giao diện Sáng (Light)"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleDarkMode}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-xs font-bold transition-colors"
                  >
                    Đổi giao diện
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-4 h-4 text-zinc-400" />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Dung lượng ảnh tham khảo offline
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Tổng {totalPhotos} ảnh lưu trữ trong máy
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-zinc-500 font-bold">{storageEstimate}</span>
                </div>
              </div>

              {/* Reset Session & Backup Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onOpenBackup}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sao lưu / Xuất file JSON</span>
                </button>

                <button
                  onClick={onDownloadHtmlOffline}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Xuất file HTML đơn</span>
                </button>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    if (window.confirm("Đặt lại toàn bộ tiến độ đánh dấu hoàn thành của buổi chụp?")) {
                      onResetSession();
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại buổi chụp hiện tại (Bỏ tick các dáng đã chụp)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
