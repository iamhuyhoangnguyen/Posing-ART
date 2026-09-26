import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Dices, Search } from "lucide-react";
import type { CategoryItem, PoseItem } from "../types";
import { OfflineImage } from "./OfflineImage";

export interface LibraryPoseEntry {
  pose: PoseItem;
  section: "kyyeu" | "canhan";
  category: CategoryItem;
  categoryIndex: number;
  poseKey: string;
}

interface HomeLibraryToolsProps {
  kyyeuCategories: CategoryItem[];
  canhanCategories: CategoryItem[];
  poses: LibraryPoseEntry[];
  recentPoseKeys: string[];
  onOpenPose: (entry: LibraryPoseEntry) => void;
  onOpenCategory: (section: "kyyeu" | "canhan", categoryIndex: number) => void;
}

export const HomeLibraryTools: React.FC<HomeLibraryToolsProps> = ({
  kyyeuCategories,
  canhanCategories,
  poses,
  recentPoseKeys,
  onOpenPose,
  onOpenCategory,
}) => {
  const [query, setQuery] = useState("");
  const [lastRandomPoseKey, setLastRandomPoseKey] = useState<string | null>(null);
  const [randomPoseEntry, setRandomPoseEntry] = useState<LibraryPoseEntry | null>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return [];
    const matches: Array<
      | { kind: "category"; section: "kyyeu" | "canhan"; category: CategoryItem; categoryIndex: number }
      | { kind: "pose"; entry: LibraryPoseEntry }
    > = [];
    for (const [section, categories] of [["kyyeu", kyyeuCategories], ["canhan", canhanCategories]] as const) {
      categories.forEach((category, categoryIndex) => {
        if (`${category.label} ${category.description || ""}`.toLocaleLowerCase("vi").includes(normalized)) {
          matches.push({ kind: "category", section, category, categoryIndex });
        }
        for (const entry of poses) {
          if (entry.section === section && entry.categoryIndex === categoryIndex && entry.pose.title.toLocaleLowerCase("vi").includes(normalized)) {
            matches.push({ kind: "pose", entry });
          }
        }
      });
    }
    return matches.slice(0, 30);
  }, [query, kyyeuCategories, canhanCategories, poses]);

  const recentPoses = recentPoseKeys
    .map((poseKey) => poses.find((entry) => entry.poseKey === poseKey))
    .filter((entry): entry is LibraryPoseEntry => Boolean(entry))
    .slice(0, 6);

  useEffect(() => {
    setRandomPoseEntry((entry) => entry && poses.some((pose) => pose.poseKey === entry.poseKey) ? entry : null);
  }, [poses]);

  const suggestRandomPose = () => {
    if (!poses.length) return;
    const choices = poses.length > 1 ? poses.filter((entry) => entry.poseKey !== lastRandomPoseKey) : poses;
    const selected = choices[Math.floor(Math.random() * choices.length)];
    setLastRandomPoseKey(selected.poseKey);
    setRandomPoseEntry(selected);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên dáng hoặc chủ đề trong toàn bộ thư viện..."
            aria-label="Tìm dáng và chủ đề trong toàn bộ thư viện"
            className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-3 text-xs outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button type="button" onClick={suggestRandomPose} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-3 text-[11px] font-bold text-zinc-950 active:scale-95" title="Gợi ý ngẫu nhiên một dáng trong toàn bộ thư viện">
          <Dices className="h-4 w-4" /><span className="hidden sm:inline">Gợi ý ngẫu nhiên</span>
        </button>
      </div>

      {query.trim() ? (
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900" role="listbox" aria-label="Kết quả tìm kiếm toàn thư viện">
          {results.map((result) => result.kind === "category" ? (
            <button key={`category-${result.section}-${result.category.id}`} type="button" onClick={() => onOpenCategory(result.section, result.categoryIndex)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-zinc-800">
              <span className="min-w-0"><span className="block truncate text-xs font-bold">{result.category.label}</span><span className="text-[10px] text-zinc-500">Chủ đề · {result.section === "kyyeu" ? "Kỷ Yếu" : "Concept"} · {result.category.poses.length} dáng</span></span><ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          ) : (
            <button key={`pose-${result.entry.poseKey}`} type="button" onClick={() => onOpenPose(result.entry)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-zinc-800">
              <span className="min-w-0"><span className="block truncate text-xs font-bold">{result.entry.pose.title}</span><span className="text-[10px] text-zinc-500">{result.entry.category.label} · {result.entry.section === "kyyeu" ? "Kỷ Yếu" : "Concept"}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          ))}
          {results.length === 0 && <p className="px-3 py-4 text-center text-xs text-zinc-500">Không tìm thấy dáng hoặc chủ đề phù hợp.</p>}
        </div>
      ) : recentPoses.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h2 className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Đã xem gần đây</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {recentPoses.map((entry) => (
              <button key={entry.poseKey} type="button" onClick={() => onOpenPose(entry)} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2 text-left hover:bg-amber-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                <span className="block truncate text-[11px] font-bold">{entry.pose.title}</span><span className="block truncate text-[10px] text-zinc-500">{entry.category.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {randomPoseEntry && (
        <section className="flex items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 p-3 dark:border-amber-900/70 dark:bg-amber-950/30">
          {randomPoseEntry.pose.coverImage && <OfflineImage src={randomPoseEntry.pose.coverImage} alt="" wrapperClassName="h-16 w-16 shrink-0 rounded-xl" className="h-full w-full object-cover" />}
          <div className="min-w-0 flex-1"><span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300">Gợi ý dành cho bạn</span><h2 className="truncate text-sm font-extrabold">{randomPoseEntry.pose.title}</h2><p className="truncate text-[10px] text-zinc-500">{randomPoseEntry.category.label}</p></div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button type="button" onClick={() => onOpenPose(randomPoseEntry)} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold text-zinc-950">Xem dáng</button>
            <button type="button" onClick={suggestRandomPose} className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:text-amber-200">Đổi gợi ý</button>
          </div>
        </section>
      )}
    </div>
  );
};
