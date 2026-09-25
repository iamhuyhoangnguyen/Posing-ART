import React, { useState } from "react";
import { Lock, ShieldAlert, X, CheckCircle, Eye, EyeOff } from "lucide-react";
import { loginAsAdmin } from "../utils/adminAuth";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionDescription?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = "xóa dữ liệu này",
}) => {
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError("Vui lòng nhập mã PIN Admin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ok = await loginAsAdmin(pin, remember);
      if (ok) {
        onSuccess();
        onClose();
      } else {
        setError("Mã PIN Admin không chính xác hoặc máy chủ chưa được cấu hình.");
      }
    } catch {
      setError("Không thể xác thực. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">
                Quyền Quản Trị Viên (Admin)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Bảo vệ an toàn dữ liệu Cloud Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900/90 dark:text-amber-200 space-y-1.5 leading-relaxed">
          <p className="font-bold">
            🛡️ Tính năng tải ảnh lên là TỰ DO cho mọi người trong ekip.
          </p>
          <p className="text-[11px]">
            Tuy nhiên, thao tác <strong>{actionDescription}</strong> cần xác nhận tài khoản Admin để tránh xóa nhầm ảnh của người khác trên thiết bị này.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mã PIN Admin:
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Nhập mã PIN quản trị"
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 tracking-wider pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error ? (
              <p className="text-xs text-rose-500 font-semibold mt-1.5">{error}</p>
            ) : (
              <p className="text-[11px] text-zinc-400 mt-1">
                Mã PIN được quản trị viên cấu hình riêng trên máy chủ.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded-md border-zinc-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <span>Ghi nhớ quyền Admin trên máy này</span>
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-200 active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? "Đang kiểm tra..." : "Xác nhận xóa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
