import React, { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { CategoryItem } from "../types";

interface HomeLibraryToolsProps {
  kyyeuCategories: CategoryItem[];
  canhanCategories: CategoryItem[];
  onOpenCategory: (section: "kyyeu" | "canhan", categoryIndex: number) => void;
}

export const HomeLibraryTools: React.FC<HomeLibraryToolsProps> = ({ kyyeuCategories, canhanCategories, onOpenCategory }) => {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return [];
    return ([
      ...kyyeuCategories.map((category, categoryIndex) => ({ section: "kyyeu" as const, category, categoryIndex })),
      ...canhanCategories.map((category, categoryIndex) => ({ section: "canhan" as const, category, categoryIndex })),
    ]).filter(({ category }) => category.label.toLocaleLowerCase("vi").includes(normalized)).slice(0, 30);
  }, [query, kyyeuCategories, canhanCategories]);

  return (
    <div className="space-y-2">
      <label className="relative block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên chủ đề hoặc danh mục..."
          aria-label="Tìm tên chủ đề hoặc danh mục"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-3 text-xs outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {query.trim() && (
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900" role="listbox" aria-label="Kết quả tìm chủ đề">
          {results.map(({ section, category, categoryIndex }) => (
            <button key={`${section}-${category.id}`} type="button" onClick={() => onOpenCategory(section, categoryIndex)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-zinc-800">
              <span className="min-w-0"><span className="block truncate text-xs font-bold">{category.label}</span><span className="text-[10px] text-zinc-500">{section === "kyyeu" ? "Kỷ Yếu" : "Concept"} · {category.images?.length || 0} ảnh</span></span><ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          ))}
          {results.length === 0 && <p className="px-3 py-4 text-center text-xs text-zinc-500">Không tìm thấy chủ đề hoặc danh mục.</p>}
        </div>
      )}
    </div>
  );
};
