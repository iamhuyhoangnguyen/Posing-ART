import React, { useState } from "react";
import { Download, Image as ImageIcon, MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";

interface AdminItemActionsMenuProps {
  label: string;
  onShare: () => void;
  onDownload: () => void;
  onRename: () => void;
  onChangeCover: () => void;
  onDelete: () => void;
}

export const AdminItemActionsMenu: React.FC<AdminItemActionsMenuProps> = ({ label, onShare, onDownload, onRename, onChangeCover, onDelete }) => {
  const [open, setOpen] = useState(false);
  const action = (run: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(false);
    run();
  };
  return (
    <div className="absolute left-2.5 top-2.5 z-20" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={`Tùy chọn ${label}`}
        aria-expanded={open}
        title="Tùy chọn quản trị"
        onContextMenu={(event) => { event.preventDefault(); setOpen(true); }}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-white/40 bg-black/65 p-2 text-white shadow-lg backdrop-blur hover:bg-black/80 active:scale-95"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 min-w-44 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-800 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <button type="button" onClick={action(onShare)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"><Share2 className="h-3.5 w-3.5" />Chia sẻ</button>
          <button type="button" onClick={action(onDownload)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"><Download className="h-3.5 w-3.5" />Tải xuống toàn bộ</button>
          <button type="button" onClick={action(onRename)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"><Pencil className="h-3.5 w-3.5" />Đổi tên</button>
          <button type="button" onClick={action(onChangeCover)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"><ImageIcon className="h-3.5 w-3.5" />Đổi ảnh bìa</button>
          <button type="button" onClick={action(onDelete)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5" />Xóa vĩnh viễn</button>
        </div>
      )}
    </div>
  );
};
