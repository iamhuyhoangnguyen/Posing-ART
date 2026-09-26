import React, { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const PwaUpdatePrompt: React.FC = () => {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!needRefresh) return null;

  const applyUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error("Không thể áp dụng bản cập nhật mới:", error);
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] px-3 pb-[env(safe-area-inset-bottom)]" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-amber-300/70 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-amber-700/60 dark:bg-zinc-900/95">
        <RefreshCw className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
          Có bản cập nhật mới
        </p>
        <button
          type="button"
          onClick={() => void applyUpdate()}
          disabled={isUpdating}
          className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {isUpdating ? "Đang tải lại..." : "Tải lại"}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          disabled={isUpdating}
          aria-label="Để sau"
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
