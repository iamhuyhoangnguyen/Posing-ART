import React, { useState, useMemo } from "react";
import {
  MapPin,
  Sparkles,
  Camera,
  Search,
  Plus,
  Compass,
  ArrowRight,
  Heart,
  ChevronRight,
  Layers,
  Wand2,
  ExternalLink,
  BookOpen,
  Filter,
  CheckCircle2,
  Share2,
} from "lucide-react";
import {
  VisualIdeaLocation,
  VisualIdeaItem,
  CategoryItem,
  PoseItem,
} from "../types";
import {
  INITIAL_VISUAL_LOCATIONS,
  INITIAL_VISUAL_IDEAS,
} from "../data/visualIdeaData";
import { AddVisualIdeaModal } from "./AddVisualIdeaModal";
import { getRednoteChineseSearchUrl } from "../utils/rednoteTranslator";

interface VisualIdeaLibrarySectionProps {
  onBackToHome: () => void;
  onOpenPoseGenerator: (
    prompt: string,
    refImage?: string,
    conceptName?: string,
    poseTitle?: string
  ) => void;
  onOpenPoseModal?: (pose: PoseItem, categoryName: string, poseKey: string) => void;
  existingCanhanData?: CategoryItem[];
}

export const VisualIdeaLibrarySection: React.FC<VisualIdeaLibrarySectionProps> = ({
  onBackToHome,
  onOpenPoseGenerator,
  onOpenPoseModal,
  existingCanhanData = [],
}) => {
  // Locations State (persisted in localStorage)
  const [locations, setLocations] = useState<VisualIdeaLocation[]>(() => {
    const saved = localStorage.getItem("visual-idea-locations-v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VISUAL_LOCATIONS;
  });

  // Ideas State (persisted in localStorage)
  const [ideas, setIdeas] = useState<VisualIdeaItem[]>(() => {
    const saved = localStorage.getItem("visual-idea-items-v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VISUAL_IDEAS;
  });

  // Active Location filter (null = All)
  const [activeLocId, setActiveLocId] = useState<string>("loc-garden");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("visual-idea-favorites");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Modal to add new location / idea
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal to view detailed idea
  const [selectedDetailIdea, setSelectedDetailIdea] = useState<VisualIdeaItem | null>(null);

  // Active view mode: "visual-ideas" (new visual library) vs "classic-albums" (existing categories)
  const [viewMode, setViewMode] = useState<"visual-ideas" | "classic-albums">("visual-ideas");

  const saveLocations = (newLocs: VisualIdeaLocation[]) => {
    setLocations(newLocs);
    localStorage.setItem("visual-idea-locations-v1", JSON.stringify(newLocs));
  };

  const saveIdeas = (newIdeas: VisualIdeaItem[]) => {
    setIdeas(newIdeas);
    localStorage.setItem("visual-idea-items-v1", JSON.stringify(newIdeas));
  };

  const handleToggleFavorite = (ideaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(ideaId)) {
      updated = favorites.filter((id) => id !== ideaId);
    } else {
      updated = [...favorites, ideaId];
    }
    setFavorites(updated);
    localStorage.setItem("visual-idea-favorites", JSON.stringify(updated));
  };

  const handleAddLocation = (newLoc: VisualIdeaLocation) => {
    const updated = [newLoc, ...locations];
    saveLocations(updated);
    setActiveLocId(newLoc.id);
  };

  const handleAddIdea = (newIdea: VisualIdeaItem) => {
    const updated = [newIdea, ...ideas];
    saveIdeas(updated);
    // Update location idea count
    const updatedLocs = locations.map((loc) =>
      loc.id === newIdea.locationId
        ? { ...loc, totalIdeas: (loc.totalIdeas || 0) + 1 }
        : loc
    );
    saveLocations(updatedLocs);
  };

  // Filtered Ideas
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      // Location match
      if (activeLocId !== "all" && idea.locationId !== activeLocId) {
        return false;
      }
      // Mood match
      if (selectedMood !== "all" && idea.mood !== selectedMood) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(q);
        const matchTagline = idea.tagline.toLowerCase().includes(q);
        const matchOutfit = idea.outfitSuggestion.toLowerCase().includes(q);
        const matchProps = idea.propsSuggestion.toLowerCase().includes(q);
        const matchMood = idea.mood.toLowerCase().includes(q);
        return matchTitle || matchTagline || matchOutfit || matchProps || matchMood;
      }
      return true;
    });
  }, [ideas, activeLocId, selectedMood, searchQuery]);

  // Current active location object
  const currentLoc = useMemo(() => {
    return locations.find((l) => l.id === activeLocId) || locations[0];
  }, [locations, activeLocId]);

  const moodsList = ["all", "Thơ mộng", "Thanh xuân", "Cá tính", "Cổ điển", "Điện ảnh"];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {/* Top Banner & Header */}
      <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-white pt-6 pb-8 px-4 sm:px-6 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb / Back button */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              ← Trở về Trang Chủ
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-full shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Bối Cảnh / Concept</span>
              </button>
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                  PHẦN 2 • THƯ VIỆN BỐI CẢNH & CONCEPT THỰC CHIẾN
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Visual Idea Library
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                Sổ Tay Ý Tưởng Concept & Bối Cảnh
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Khám phá phong cách, trang phục & góc máy theo từng không gian thực tế.
                Bấm vào bất kỳ concept nào để mở ngay <strong>AI Pose Generator</strong> biến tấu dáng chụp phù hợp!
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-zinc-800/80 p-1 rounded-2xl border border-zinc-700/80 self-start sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("visual-ideas")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "visual-ideas"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Thư Viện Ý Tưởng
              </button>
              <button
                type="button"
                onClick={() => setViewMode("classic-albums")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "classic-albums"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Danh Mục Cá Nhân ({existingCanhanData.length})
              </button>
            </div>
          </div>

          {/* Quick Search & Mood Filter Bar */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh concept, trang phục, đạo cụ (vd: đầm trắng, nón cói, cafe, sương mờ...)"
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-800/90 border border-zinc-700 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  Xóa
                </button>
              )}
            </div>

            <div className="sm:col-span-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {moodsList.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMood(m)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedMood === m
                      ? "bg-emerald-500 text-white font-bold shadow-sm"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/60"
                  }`}
                >
                  {m === "all" ? "Tất cả Mood" : m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {viewMode === "visual-ideas" ? (
          <div className="space-y-6">
            {/* HORIZONTAL SCROLLING LOCATION CARDS (PART F / G STYLE: LARGE, VISUAL, FAST) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>CHỌN BỐI CẢNH / KHÔNG GIAN THỰC TẾ</span>
                  <span className="text-[10px] text-zinc-400 font-normal ml-1">
                    ({locations.length} bối cảnh)
                  </span>
                </div>
                <button
                  onClick={() => setActiveLocId("all")}
                  className={`text-xs font-bold transition-colors ${
                    activeLocId === "all"
                      ? "text-emerald-600 dark:text-emerald-400 underline"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Xem tất cả
                </button>
              </div>

              {/* Horizontal Scroll Track */}
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {locations.map((loc) => {
                  const isSelected = activeLocId === loc.id;
                  const count = ideas.filter((i) => i.locationId === loc.id).length;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setActiveLocId(loc.id)}
                      className={`group relative flex-shrink-0 w-44 sm:w-52 h-28 rounded-2xl overflow-hidden text-left transition-all duration-300 border ${
                        isSelected
                          ? "ring-3 ring-emerald-500 border-emerald-500 shadow-lg scale-[1.02]"
                          : "border-zinc-200 dark:border-zinc-800 opacity-85 hover:opacity-100 hover:shadow-md"
                      }`}
                    >
                      <img
                        src={loc.coverImage}
                        alt={loc.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div
                        className={`absolute inset-0 transition-colors ${
                          isSelected
                            ? "bg-gradient-to-t from-black/90 via-black/40 to-emerald-950/30"
                            : "bg-gradient-to-t from-black/85 via-black/40 to-transparent"
                        }`}
                      />

                      {/* Idea count pill */}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/15">
                        {count} ý tưởng
                      </div>

                      {/* Name & Short description */}
                      <div className="absolute bottom-2 left-2.5 right-2 text-white">
                        <div className="text-xs sm:text-sm font-extrabold leading-tight text-white group-hover:text-emerald-300 transition-colors">
                          {loc.shortName || loc.name}
                        </div>
                        <div className="text-[10px] text-zinc-300 line-clamp-1 mt-0.5">
                          {loc.tags?.slice(0, 2).join(" • ") || loc.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Selected Location Banner */}
            {activeLocId !== "all" && currentLoc && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={currentLoc.coverImage}
                    alt={currentLoc.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50">
                        {currentLoc.name}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {filteredIdeas.length} Concept khả dụng
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {currentLoc.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Rednote Chinese inspiration for this location */}
                  <a
                    href={getRednoteChineseSearchUrl(`${currentLoc.name} Chụp ảnh concept`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Rednote (Tiểu Hồng Thư)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* AI Quick Generator for this location */}
                  <button
                    onClick={() =>
                      onOpenPoseGenerator(
                        `Tạo dáng chụp tại bối cảnh ${currentLoc.name}`,
                        currentLoc.coverImage,
                        currentLoc.name,
                        `Concept ${currentLoc.name}`
                      )
                    }
                    className="flex-1 sm:flex-initial text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Tạo dáng AI bối cảnh này</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONCEPT IDEAS GRID */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>DANH SÁCH CONCEPT Ý TƯỞNG ({filteredIdeas.length})</span>
                </h3>
                {selectedMood !== "all" && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Đang lọc theo: {selectedMood}
                  </span>
                )}
              </div>

              {filteredIdeas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIdeas.map((idea) => {
                    const isFav = favorites.includes(idea.id);

                    return (
                      <div
                        key={idea.id}
                        className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                      >
                        {/* Card Image Banner */}
                        <div className="relative h-48 sm:h-52 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                          <img
                            src={idea.coverImage}
                            alt={idea.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-emerald-300 border border-white/15">
                              {idea.mood}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(idea.id, e)}
                              className={`p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
                                isFav
                                  ? "bg-rose-500 text-white"
                                  : "bg-black/40 text-white hover:bg-black/60"
                              }`}
                              title={isFav ? "Bỏ yêu thích" : "Lưu yêu thích"}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  isFav ? "fill-current" : ""
                                }`}
                              />
                            </button>
                          </div>

                          {/* Title and tagline on image */}
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <h4 className="text-base font-black leading-tight text-white drop-shadow-xs">
                              {idea.title}
                            </h4>
                            <p className="text-[11px] text-zinc-200 mt-0.5 line-clamp-1 opacity-90">
                              {idea.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Card Content & Practical Guide */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            {/* Outfit & Props */}
                            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                              <div className="flex items-start gap-1.5">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 min-w-[70px]">
                                  👗 Trang phục:
                                </span>
                                <span className="line-clamp-1">{idea.outfitSuggestion}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 min-w-[70px]">
                                  👜 Đạo cụ:
                                </span>
                                <span className="line-clamp-1">{idea.propsSuggestion}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 min-w-[70px]">
                                  ⏰ Thời điểm:
                                </span>
                                <span className="line-clamp-1">{idea.timeOfDaySuggestion}</span>
                              </div>
                            </div>

                            {/* Recommended Poses Highlights */}
                            <div className="bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                              <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                                <span>Dáng đề xuất chính:</span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  {idea.keyPoses.length} tư thế
                                </span>
                              </div>
                              <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
                                {idea.keyPoses.slice(0, 2).map((pose, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold">•</span>
                                    <span className="line-clamp-1">{pose}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Action Buttons: Fast AI Pose Generator + Details */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenPoseGenerator(
                                  `Concept: ${idea.title}. Trang phục: ${idea.outfitSuggestion}. Đạo cụ: ${idea.propsSuggestion}. Mood: ${idea.mood}`,
                                  idea.coverImage,
                                  idea.title,
                                  idea.title
                                )
                              }
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                              <span>Tạo dáng AI</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedDetailIdea(idea)}
                              className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <span>Chi tiết</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                  <Compass className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Không tìm thấy concept phù hợp
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    Hãy thử xóa từ khóa tìm kiếm hoặc chọn "Tất cả bối cảnh" để xem toàn bộ ý tưởng.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMood("all");
                      setActiveLocId("all");
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Xem lại toàn bộ
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CLASSIC ALBUMS / CATEGORIES VIEW (PRESERVING EXISTING DATA - PART R) */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  BỘ SƯU TẬP CONCEPT CÁ NHÂN HIỆN CÓ
                </h3>
                <p className="text-xs text-zinc-500">
                  Các danh mục dáng mẫu thực tế đã lưu trong hệ thống
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingCanhanData.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={
                        cat.coverImage ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={cat.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        {cat.poses.length} Tư Thế
                      </span>
                      <h4 className="text-lg font-black text-white">{cat.label}</h4>
                      {cat.description && (
                        <p className="text-xs text-zinc-200 line-clamp-1 mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Tư thế tiêu biểu:{" "}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {cat.poses[0]?.title || "Đứng tự nhiên"}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOpenPoseGenerator(
                            `Concept: ${cat.label}`,
                            cat.coverImage,
                            cat.label,
                            cat.label
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Biến Tấu Dáng AI</span>
                      </button>

                      {onOpenPoseModal && cat.poses[0] && (
                        <button
                          onClick={() =>
                            onOpenPoseModal(
                              cat.poses[0],
                              cat.label,
                              cat.poses[0].id || `${cat.id}-0`
                            )
                          }
                          className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition-colors"
                        >
                          Xem dáng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL FOR SELECTED IDEA */}
      {selectedDetailIdea && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDetailIdea(null);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
            {/* Modal Image Header */}
            <div className="relative h-56 sm:h-64 overflow-hidden">
              <img
                src={selectedDetailIdea.coverImage}
                alt={selectedDetailIdea.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              <button
                onClick={() => setSelectedDetailIdea(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/80 text-[10px] font-bold text-white uppercase tracking-wider">
                  {selectedDetailIdea.mood}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                  {selectedDetailIdea.title}
                </h3>
                <p className="text-xs text-zinc-200 mt-0.5">
                  {selectedDetailIdea.tagline}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Styling recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
                    👗 Gợi Ý Trang Phục:
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {selectedDetailIdea.outfitSuggestion}
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
                    👜 Gợi Ý Đạo Cụ:
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {selectedDetailIdea.propsSuggestion}
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
                    ⏰ Thời Điểm Chụp:
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {selectedDetailIdea.timeOfDaySuggestion}
                  </div>
                </div>

                {selectedDetailIdea.lightingStyle && (
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
                      💡 Ánh Sáng Tự Nhiên:
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-300">
                      {selectedDetailIdea.lightingStyle}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommended Body Poses */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  CÁC TƯ THẾ HÌNH THỂ GỢI Ý (ANATOMY POSES):
                </h4>
                <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                  {selectedDetailIdea.keyPoses.map((pose, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        {pIdx + 1}
                      </span>
                      <span>{pose}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Trigger */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idea = selectedDetailIdea;
                    setSelectedDetailIdea(null);
                    onOpenPoseGenerator(
                      `Concept: ${idea.title}. Trang phục: ${idea.outfitSuggestion}. Đạo cụ: ${idea.propsSuggestion}`,
                      idea.coverImage,
                      idea.title,
                      idea.title
                    );
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Mở AI Pose Generator Cho Concept Này</span>
                </button>

                <a
                  href={getRednoteChineseSearchUrl(`${selectedDetailIdea.title} 摄影`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900 transition-colors"
                >
                  <span>Rednote</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD VISUAL IDEA MODAL */}
      {showAddModal && (
        <AddVisualIdeaModal
          locations={locations}
          activeLocationId={activeLocId !== "all" ? activeLocId : undefined}
          onClose={() => setShowAddModal(false)}
          onAddLocation={handleAddLocation}
          onAddIdea={handleAddIdea}
        />
      )}
    </div>
  );
};
