import React, { useState } from "react";
import { MoreVertical, Pencil, Type } from "lucide-react";

interface SectionCoverActionsMenuProps {
  sectionLabel: string;
  onChangeCover: () => void;
  onRename?: () => void;
}

export const SectionCoverActionsMenu: React.FC<SectionCoverActionsMenuProps> = ({ sectionLabel, onChangeCover, onRename }) => {
  const [open, setOpen] = useState(false);
  const run = (action: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(false);
    action();
  };

  return (
    <div className="absolute left-4 top-4 z-20" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={`Tùy chọn ${sectionLabel}`}
        aria-expanded={open}
        title={`Tùy chọn ${sectionLabel}`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-white/40 bg-black/65 p-2 text-white shadow-lg backdrop-blur hover:bg-black/80 active:scale-95"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 min-w-44 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-800 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <button type="button" onClick={run(onChangeCover)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Pencil className="h-3.5 w-3.5" />Đổi ảnh bìa
          </button>
          {onRename && (
            <button type="button" onClick={run(onRename)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Type className="h-3.5 w-3.5" />Đổi tên
            </button>
          )}
        </div>
      )}
    </div>
  );
};
