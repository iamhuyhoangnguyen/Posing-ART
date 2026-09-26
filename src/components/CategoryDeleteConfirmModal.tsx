import React from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import type { CategoryDeletionPreview } from "../services/categoryAdminService";

interface CategoryDeleteConfirmModalProps {
  categoryName: string;
  preview: CategoryDeletionPreview;
  localPhotoCount: number;
  isDeleting: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const CategoryDeleteConfirmModal: React.FC<CategoryDeleteConfirmModalProps> = ({
  categoryName,
  preview,
  localPhotoCount,
  isDeleting,
  error,
  onConfirm,
  onClose,
}) => (
  <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !isDeleting && onClose()}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="delete-topic-title" className="w-full max-w-md rounded-t-3xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-zinc-900 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"><AlertTriangle className="h-5 w-5" /></span>
          <div>
            <h2 id="delete-topic-title" className="text-base font-extrabold">Xóa chủ đề này?</h2>
            <p className="mt-1 break-words text-sm font-semibold text-zinc-600 dark:text-zinc-300">{categoryName}</p>
          </div>
        </div>
        <button type="button" disabled={isDeleting} onClick={onClose} aria-label="Đóng" className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
      </header>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
        <p className="font-bold">Thao tác này không thể hoàn tác.</p>
        <p className="mt-1">{preview.photoCount} ảnh trên Cloud Drive, {preview.customPoseCount} tư thế tùy chỉnh và {preview.relatedRecordCount} bản ghi liên quan sẽ bị xóa khỏi máy chủ.</p>
        <p className="mt-1">{localPhotoCount} ảnh tham khảo lưu cục bộ trên thiết bị này cùng chủ đề cũng sẽ bị xóa.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={isDeleting} onClick={onClose} className="rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200">Giữ lại</button>
        <button type="button" disabled={isDeleting} onClick={onConfirm} className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">
          {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isDeleting ? "Đang xóa…" : "Xóa vĩnh viễn"}
        </button>
      </div>
    </section>
  </div>
);
