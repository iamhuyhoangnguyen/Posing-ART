import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  Search,
  Sparkles,
  CheckCircle2,
  FolderArchive,
  Plus,
  BookOpen,
  Image as ImageIcon,
  Flame,
  ChevronRight,
  Pencil,
  Smartphone,
  Download,
  Settings,
  Mic,
  Send,
  User,
} from "lucide-react";
import { CategoryItem, FilterStatus, PoseItem, SectionType } from "./types";
import { INITIAL_DATA_KYYEU, INITIAL_DATA_CANHAN } from "./data/posesData";
import { getPhotoCounts } from "./utils/db";
import { Header } from "./components/Header";
import { PoseCard } from "./components/PoseCard";
const PoseModal = lazy(() => import("./components/PoseModal").then((module) => ({ default: module.PoseModal })));
const AIPoseAdvisorModal = lazy(() => import("./components/AIPoseAdvisorModal").then((module) => ({ default: module.AIPoseAdvisorModal })));
const BackupModal = lazy(() => import("./components/BackupModal").then((module) => ({ default: module.BackupModal })));
const AddCustomPoseModal = lazy(() => import("./components/AddCustomPoseModal").then((module) => ({ default: module.AddCustomPoseModal })));
const EditCoverModal = lazy(() => import("./components/EditCoverModal").then((module) => ({ default: module.EditCoverModal })));
const InstallGuideModal = lazy(() => import("./components/InstallGuideModal").then((module) => ({ default: module.InstallGuideModal })));
const PersonalModal = lazy(() => import("./components/PersonalModal").then((module) => ({ default: module.PersonalModal })));
import { AddIdeaCard } from "./components/AddIdeaCard";
import { InspirationBar } from "./components/InspirationBar";
const AIIdeaAssistantSection = lazy(() => import("./components/AIIdeaAssistantSection").then((module) => ({ default: module.AIIdeaAssistantSection })));
import { exportSingleFileHtml } from "./utils/exportImport";
import { getUserRecordsByType, performFullSync, syncRecord, syncSavedPose } from "./services/syncService";
import { motion, type Variants } from "framer-motion";

type CoverSectionKey = "kyyeu" | "canhan";
type CoverImageSyncData =
  | { kind: "section"; sectionKey: CoverSectionKey; imageUrl: string }
  | { kind: "category" | "pose"; sectionKey: CoverSectionKey; targetId: string; imageUrl: string };

const COVER_IMAGE_RECORD_PREFIX = "cover_image:";

function coverImageRecordId(data: CoverImageSyncData): string {
  const target = "targetId" in data ? `:${encodeURIComponent(data.targetId)}` : "";
  return `${COVER_IMAGE_RECORD_PREFIX}${data.kind}:${data.sectionKey}${target}`;
}

async function syncCoverImage(data: CoverImageSyncData): Promise<void> {
  await syncRecord("setting", coverImageRecordId(data), data);
}

const homeCardVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.98 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.58,
      delay: custom * 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function App() {
  // Navigation
  const [currentSection, setCurrentSection] = useState<SectionType>("home");
  const currentSectionRef = useRef(currentSection);
  currentSectionRef.current = currentSection;

  // Section Cover Photos (Home Screen Cards)
  const [kyyeuCover, setKyyeuCover] = useState<string>(() => {
    return (
      localStorage.getItem("cover-section-kyyeu") ||
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80"
    );
  });

  const [canhanCover, setCanhanCover] = useState<string>(() => {
    return (
      localStorage.getItem("cover-section-canhan") ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
    );
  });

  // Category data with localStorage persistence (Filter out male category)
  const [kyyeuData, setKyyeuData] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem("kyyeu-data-v1");
    if (saved) {
      try {
        const parsed: CategoryItem[] = JSON.parse(saved);
        // Exclude any male categories ("Đơn Nam" / "kyyeu-nam")
        const filtered = parsed.filter(
          (c) => c.id !== "kyyeu-nam" && !c.label.toLowerCase().includes("đơn nam")
        );
        return filtered.length > 0 ? filtered : INITIAL_DATA_KYYEU;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_DATA_KYYEU;
  });

  const [canhanData, setCanhanData] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem("canhan-data-v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_DATA_CANHAN;
  });

  // Active category index within section
  const [activeKyyeuCatIdx, setActiveKyyeuCatIdx] = useState(0);
  const [activeCanhanCatIdx, setActiveCanhanCatIdx] = useState(0);
  const [isCanhanDetailOpen, setIsCanhanDetailOpen] = useState(false);

  // Search query & filter status
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Photo counts map from IndexedDB
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  // Modals state
  const [activePoseModal, setActivePoseModal] = useState<{
    pose: PoseItem;
    categoryName: string;
    poseKey: string;
  } | null>(null);

  const [activeAdvisorModal, setActiveAdvisorModal] = useState<{
    pose: PoseItem | null;
    categoryName: string;
    poseKey?: string;
    initialPhotoUrl?: string;
  } | null>(null);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalModalTab, setPersonalModalTab] = useState<"account" | "ai" | "sync" | "settings">("account");
  const [customModalConfig, setCustomModalConfig] = useState<{
    isOpen: boolean;
    categoryId?: string;
    mode?: "pose" | "category";
  }>({ isOpen: false });
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setCanInstallPwa(false);
      }
    }
  };

  // Edit Cover Modal state
  const [activeEditCover, setActiveEditCover] = useState<{
    type: "section" | "category" | "pose";
    sectionKey?: "kyyeu" | "canhan";
    categoryId?: string;
    poseKey?: string;
    title: string;
    subtitle?: string;
    currentImage?: string;
  } | null>(null);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Done tracker trigger for re-rendering
  const [doneVersion, setDoneVersion] = useState(0);

  // Apply dark class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Persist categories
  useEffect(() => {
    localStorage.setItem("kyyeu-data-v1", JSON.stringify(kyyeuData));
  }, [kyyeuData]);

  useEffect(() => {
    localStorage.setItem("canhan-data-v1", JSON.stringify(canhanData));
  }, [canhanData]);

  const applySyncedCoverImages = () => {
    const records = getUserRecordsByType<CoverImageSyncData>("setting")
      .filter((record) => record.id.startsWith(COVER_IMAGE_RECORD_PREFIX));
    console.info("[Cover Sync] Applying synced cover records:", { count: records.length });
    for (const record of records) {
      if (record.isDeleted) continue;
      const cover = record.data;
      if (!cover || typeof cover.imageUrl !== "string") continue;

      if (cover.kind === "section" && (cover.sectionKey === "kyyeu" || cover.sectionKey === "canhan")) {
        localStorage.setItem(`cover-section-${cover.sectionKey}`, cover.imageUrl);
        if (cover.sectionKey === "kyyeu") setKyyeuCover(cover.imageUrl);
        else setCanhanCover(cover.imageUrl);
        continue;
      }

      if ((cover.kind !== "category" && cover.kind !== "pose") ||
        (cover.sectionKey !== "kyyeu" && cover.sectionKey !== "canhan") ||
        typeof cover.targetId !== "string") continue;

      const updateCategories = (categories: CategoryItem[]) => categories.map((category, categoryIndex) => {
        if (cover.kind === "category") {
          return category.id === cover.targetId ? { ...category, coverImage: cover.imageUrl } : category;
        }
        return {
          ...category,
          poses: category.poses.map((pose, poseIndex) => {
            const poseKey = pose.id || `${cover.sectionKey}-${categoryIndex}-${poseIndex}`;
            return poseKey === cover.targetId ? { ...pose, coverImage: cover.imageUrl } : pose;
          }),
        };
      });

      if (cover.sectionKey === "kyyeu") setKyyeuData(updateCategories);
      else setCanhanData(updateCategories);
    }
  };

  // Mirror app screens in browser history so Android back gestures can pop them.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const historyState = event.state as { posingArtSection?: SectionType } | null;
      setCurrentSection(historyState?.posingArtSection || "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (currentSection === "home") return;
    const historyState = window.history.state as { posingArtSection?: SectionType } | null;
    if (historyState?.posingArtSection === currentSection) return;
    window.history.pushState({ posingArtSection: currentSection }, "", window.location.href);
  }, [currentSection]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    let isMounted = true;
    let removeListener: (() => void) | undefined;
    void CapacitorApp.addListener("backButton", () => {
      if (currentSectionRef.current === "home") {
        void CapacitorApp.exitApp();
        return;
      }
      window.history.back();
    }).then((listener) => {
      if (isMounted) {
        removeListener = () => { void listener.remove(); };
      } else {
        void listener.remove();
      }
    }).catch((error) => {
      console.warn("Unable to register Android back button handler:", error);
    });

    return () => {
      isMounted = false;
      removeListener?.();
    };
  }, []);

  // Refresh photo counts from IndexedDB
  const refreshPhotoCounts = async () => {
    try {
      const counts = await getPhotoCounts();
      setPhotoCounts(counts);
    } catch (e) {
      console.error("Error refreshing photo counts:", e);
    }
  };

  useEffect(() => {
    refreshPhotoCounts();
    // Auto-sync with Cloud Drive:
    // Ensures any device that opens the app gets all photos uploaded by collaborators!
    import("./utils/cloudSync").then(({ performCloudSync }) => performCloudSync()).then(() => {
      refreshPhotoCounts();
    });
    void performFullSync();

    const refreshSyncedProgress = () => {
      applySyncedCoverImages();
      setDoneVersion((version) => version + 1);
    };
    window.addEventListener("cloud_records_synced", refreshSyncedProgress);
    return () => window.removeEventListener("cloud_records_synced", refreshSyncedProgress);
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    let kyyeuTotal = 0;
    let kyyeuCompleted = 0;
    kyyeuData.forEach((cat, cIdx) => {
      cat.poses.forEach((pose, pIdx) => {
        kyyeuTotal++;
        const key = pose.id || `kyyeu-${cIdx}-${pIdx}`;
        if (localStorage.getItem(`done-${key}`) === "true") {
          kyyeuCompleted++;
        }
      });
    });

    let canhanTotal = 0;
    let canhanCompleted = 0;
    canhanData.forEach((cat, cIdx) => {
      cat.poses.forEach((pose, pIdx) => {
        canhanTotal++;
        const key = pose.id || `canhan-${cIdx}-${pIdx}`;
        if (localStorage.getItem(`done-${key}`) === "true") {
          canhanCompleted++;
        }
      });
    });

    const totalPhotos = Object.values(photoCounts).reduce((a, b) => a + b, 0);

    return {
      kyyeuTotal,
      kyyeuCompleted,
      canhanTotal,
      canhanCompleted,
      totalPoses: kyyeuTotal + canhanTotal,
      totalCompleted: kyyeuCompleted + canhanCompleted,
      totalPhotos,
    };
  }, [kyyeuData, canhanData, doneVersion, photoCounts]);

  // Current active categories and poses
  const currentCategories = currentSection === "kyyeu" ? kyyeuData : canhanData;
  const currentCatIdx = currentSection === "kyyeu" ? activeKyyeuCatIdx : activeCanhanCatIdx;
  const currentCategory = currentCategories[currentCatIdx] || currentCategories[0];

  // Filtered poses
  const displayedPoses = useMemo(() => {
    if (!currentCategory) return [];

    let list = currentCategory.poses;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.desc?.toLowerCase().includes(q) ||
          p.angle?.toLowerCase().includes(q) ||
          p.tips?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      list = list.filter((p, idx) => {
        const key = p.id || `${currentSection}-${currentCatIdx}-${idx}`;
        const isDone = localStorage.getItem(`done-${key}`) === "true";
        return filterStatus === "completed" ? isDone : !isDone;
      });
    }

    return list;
  }, [currentCategory, searchQuery, filterStatus, currentSection, currentCatIdx, doneVersion]);

  // Actions
  const handleToggleDone = (poseKey: string) => {
    const isDone = localStorage.getItem(`done-${poseKey}`) === "true";
    localStorage.setItem(`done-${poseKey}`, String(!isDone));
    void syncSavedPose(poseKey, { isCompleted: !isDone }, !isDone);
    setDoneVersion((v) => v + 1);
  };

  const handleResetSession = () => {
    const prefix = currentSection === "home" ? "done-" : `done-${currentSection}-`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      const poseKey = k.slice("done-".length);
      void syncSavedPose(poseKey, { isCompleted: false }, false);
    });
    setDoneVersion((v) => v + 1);
  };

  const handleAddPose = (section: "kyyeu" | "canhan", catId: string, newPose: PoseItem) => {
    const updater = section === "kyyeu" ? setKyyeuData : setCanhanData;
    updater((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return { ...c, poses: [newPose, ...c.poses] };
        }
        return c;
      })
    );
  };

  const handleAddCategory = (section: "kyyeu" | "canhan", newCat: CategoryItem) => {
    const updater = section === "kyyeu" ? setKyyeuData : setCanhanData;
    updater((prev) => [...prev, newCat]);
  };

  const handleDataRestored = (newKyyeu: CategoryItem[], newCanhan: CategoryItem[]) => {
    setKyyeuData(newKyyeu);
    setCanhanData(newCanhan);
    const kCover = localStorage.getItem("cover-section-kyyeu");
    if (kCover) setKyyeuCover(kCover);
    const cCover = localStorage.getItem("cover-section-canhan");
    if (cCover) setCanhanCover(cCover);
    refreshPhotoCounts();
    setDoneVersion((v) => v + 1);
  };

  const handleRestoreDefaultData = () => {
    setKyyeuData(INITIAL_DATA_KYYEU);
    setCanhanData(INITIAL_DATA_CANHAN);
    localStorage.setItem("kyyeu-data-v1", JSON.stringify(INITIAL_DATA_KYYEU));
    localStorage.setItem("canhan-data-v1", JSON.stringify(INITIAL_DATA_CANHAN));
  };

  // Save Cover Image Handler
  const handleSaveCoverImage = async (imageUrl: string) => {
    if (!activeEditCover) return;

    let syncData: CoverImageSyncData | null = null;

    if (activeEditCover.type === "section") {
      if (activeEditCover.sectionKey === "kyyeu") {
        setKyyeuCover(imageUrl);
        localStorage.setItem("cover-section-kyyeu", imageUrl);
        syncData = { kind: "section", sectionKey: "kyyeu", imageUrl };
      } else if (activeEditCover.sectionKey === "canhan") {
        setCanhanCover(imageUrl);
        localStorage.setItem("cover-section-canhan", imageUrl);
        syncData = { kind: "section", sectionKey: "canhan", imageUrl };
      }
    } else if (activeEditCover.type === "category" && activeEditCover.categoryId) {
      const sectionKey = currentSection === "kyyeu" ? "kyyeu" : "canhan";
      const updater = currentSection === "kyyeu" ? setKyyeuData : setCanhanData;
      updater((prev) =>
        prev.map((cat) => {
          if (cat.id === activeEditCover.categoryId) {
            return { ...cat, coverImage: imageUrl };
          }
          return cat;
        })
      );
      syncData = { kind: "category", sectionKey, targetId: activeEditCover.categoryId, imageUrl };
    } else if (activeEditCover.type === "pose" && activeEditCover.poseKey) {
      const targetKey = activeEditCover.poseKey;
      const sectionKey = currentSection === "kyyeu" ? "kyyeu" : "canhan";
      const updateList = (cats: CategoryItem[]) =>
        cats.map((cat, cIdx) => ({
          ...cat,
          poses: cat.poses.map((p, pIdx) => {
            const key = p.id || `${currentSection}-${cIdx}-${pIdx}`;
            if (key === targetKey || p.id === targetKey) {
              return { ...p, coverImage: imageUrl };
            }
            return p;
          }),
        }));

      if (currentSection === "kyyeu") {
        setKyyeuData((prev) => updateList(prev));
      } else {
        setCanhanData((prev) => updateList(prev));
      }
      syncData = { kind: "pose", sectionKey, targetId: targetKey, imageUrl };

      // If active modal is open, also update its pose cover
      if (activePoseModal && activePoseModal.poseKey === targetKey) {
        setActivePoseModal((prev) =>
          prev ? { ...prev, pose: { ...prev.pose, coverImage: imageUrl } } : null
        );
      }
    }

    if (syncData) await syncCoverImage(syncData);
    setActiveEditCover(null);
  };

  const returnToHome = () => {
    if (currentSectionRef.current !== "home") {
      const historyState = window.history.state as { posingArtSection?: SectionType } | null;
      if (historyState?.posingArtSection) {
        window.history.back();
      } else {
        setCurrentSection("home");
      }
    }
    setIsCanhanDetailOpen(false);
    setSearchQuery("");
    setFilterStatus("all");
  };

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-[#fcfbfa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header with Online/Offline indicator */}
      <Header
        title={
          currentSection === "home"
            ? "POSING ART"
            : currentSection === "kyyeu"
            ? "KỶ YẾU"
            : currentSection === "canhan"
            ? "CONCEPT & BỐI CẢNH"
            : "BÍ Ý TƯỞNG?"
        }
        subtitle={
          currentSection === "home"
            ? "Sổ Tay Tạo Dáng & Nhiếp Ảnh Thực Tế"
            : currentSection === "kyyeu"
            ? "Yearbook Photography Lookbook"
            : currentSection === "canhan"
            ? "Visual Idea Library & Thư Viện Ý Tưởng Concept Thực Chiến"
            : "Trợ Lý Sáng Tạo 3 Siêu AI: ChatGPT • Gemini • Claude"
        }
        showBack={currentSection !== "home"}
        showProgressAndFilters={currentSection !== "canhan" && currentSection !== "kyyeu"}
        onBackToHome={returnToHome}
        completedCount={
          currentSection === "kyyeu"
            ? stats.kyyeuCompleted
            : currentSection === "canhan"
            ? stats.canhanCompleted
            : stats.totalCompleted
        }
        totalCount={
          currentSection === "kyyeu"
            ? stats.kyyeuTotal
            : currentSection === "canhan"
            ? stats.canhanTotal
            : stats.totalPoses
        }
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenAddCustom={() => setCustomModalConfig({ isOpen: true, mode: "pose" })}
        onOpenInstallGuide={() => setShowInstallModal(true)}
        onOpenSettings={() => setShowPersonalModal(true)}
        onOpenPersonal={() => setShowPersonalModal(true)}
        onResetSession={handleResetSession}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5 pb-24">
        {/* VIEW 1: HOME */}
        {currentSection === "home" && (
          <div className="space-y-4 sm:space-y-5">
            {/* Elegant Subheader */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between px-1 pt-1"
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Khám Phá Dáng Chụp
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Bộ sưu tập tư thế tạo dáng chuẩn & trợ lý AI hỗ trợ buổi chụp
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveAdvisorModal({ pose: null, categoryName: "Tất cả" })}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                  title="Mở AI Cố Vấn Tạo Dáng"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">AI Cố Vấn</span>
                </button>
              </div>
            </motion.div>

            {/* 2 Main Big Cards with PENCIL ICON BUTTONS */}
            <div className="grid gap-4 sm:gap-5">
              {/* Card 1: KỶ YẾU */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
                custom={0}
                variants={homeCardVariants}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setCurrentSection("kyyeu");
                  window.scrollTo(0, 0);
                }}
                className="group relative h-60 sm:h-72 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl border border-zinc-200/80 dark:border-zinc-800 card-hover-glow"
              >
                <img
                  src={kyyeuCover}
                  alt="Kỷ yếu"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* EDIT COVER PENCIL BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEditCover({
                      type: "section",
                      sectionKey: "kyyeu",
                      title: "Ảnh Đại Diện: KỶ YẾU",
                      subtitle: "Thay đổi ảnh bìa hiển thị ngoài trang chủ",
                      currentImage: kyyeuCover,
                    });
                  }}
                  title="Chỉnh sửa ảnh đại diện Kỷ Yếu"
                  className="absolute top-4 left-4 px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-amber-500 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-md active:scale-90"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đổi ảnh bìa</span>
                </button>

                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  {stats.kyyeuCompleted} / {stats.kyyeuTotal} dáng
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 text-white flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 opacity-90">
                      PHẦN 1 • {kyyeuData.length} DANH MỤC
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
                      KỶ YẾU
                    </h2>
                    <p className="text-xs text-white/80 mt-1 line-clamp-1">
                      Đơn Nữ, Đôi Bạn Thân, Áo Dài, Áo Cử Nhân, Đồng Phục, Hậu Trường
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>

              {/* Card 2: CONCEPT CÁ NHÂN */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
                custom={1}
                variants={homeCardVariants}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setCurrentSection("canhan");
                  setIsCanhanDetailOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="group relative h-60 sm:h-72 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl border border-zinc-200/80 dark:border-zinc-800 card-hover-glow"
              >
                <img
                  src={canhanCover}
                  alt="Cá nhân"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* EDIT COVER PENCIL BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEditCover({
                      type: "section",
                      sectionKey: "canhan",
                      title: "Ảnh Đại Diện: CONCEPT CÁ NHÂN",
                      subtitle: "Thay đổi ảnh bìa hiển thị ngoài trang chủ",
                      currentImage: canhanCover,
                    });
                  }}
                  title="Chỉnh sửa ảnh đại diện Concept Cá Nhân"
                  className="absolute top-4 left-4 px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-amber-500 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-md active:scale-90"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đổi ảnh bìa</span>
                </button>

                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  {stats.canhanCompleted} / {stats.canhanTotal} dáng
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 text-white flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 opacity-90">
                      PHẦN 2 • THƯ VIỆN BỐI CẢNH & CONCEPT
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
                      CONCEPT & BỐI CẢNH
                    </h2>
                    <p className="text-xs text-white/80 mt-1 line-clamp-1">
                      Sân Vườn, Đường Phố, Quán Cafe, Sân Thượng, Rừng Thông, Studio, Bờ Biển
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>

              {/* Card 3: PHẦN 3 • BẠN ĐANG BÍ Ý TƯỞNG? */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
                custom={2}
                variants={homeCardVariants}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setCurrentSection("idea-ai");
                  window.scrollTo(0, 0);
                }}
                className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-5 sm:p-6 card-hover-glow"
              >
                {/* Subtle soft backdrop glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#10A37F]/15 via-[#8E75FF]/15 to-[#D97706]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                  {/* Top Row: Part label & 3 AI Logos */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 opacity-90">
                        PHẦN 3 • TRỢ LÝ SÁNG TẠO 3 SIÊU AI
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                        BẠN ĐANG BÍ Ý TƯỞNG?
                      </h2>
                      <p className="text-xs text-zinc-300 mt-1 max-w-sm">
                        Kết nối trực tiếp 3 mô hình ChatGPT, Gemini & Claude • Nhập Chat, Giọng Nói & Gửi Ảnh Mẫu.
                      </p>
                    </div>

                    {/* 3 Model Icons in pill */}
                    <div className="flex items-center -space-x-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex-shrink-0 shadow-sm">
                      {/* ChatGPT Logo */}
                      <div
                        className="w-8 h-8 rounded-xl bg-[#10A37F] text-white flex items-center justify-center shadow-xs"
                        title="ChatGPT (OpenAI)"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.6862zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.907 9.2298V6.8974a.0662.0662 0 0 1 .0331-.0615L13.9161 4.05a4.4992 4.4992 0 0 1 6.5347 4.6773zM10.8703 14.814l-2.9142-1.6843 2.9142-1.6843 2.9142 1.6843z" />
                        </svg>
                      </div>
                      {/* Gemini Logo */}
                      <div
                        className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1B72E8] via-[#8E75FF] to-[#D96570] text-white flex items-center justify-center shadow-xs"
                        title="Gemini (Google)"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                        </svg>
                      </div>
                      {/* Claude Logo */}
                      <div
                        className="w-8 h-8 rounded-xl bg-[#D97706] text-white flex items-center justify-center shadow-xs"
                        title="Claude (Anthropic)"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l1.6 5.8 5.8-1.6-3 5.2 4.9 3.5-5.9 1.1.8 6-5.2-3-3.5 4.9-1.1-5.9-6 .8 3-5.2-4.9-3.5 5.9-1.1-.8-6 5.2 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Feature pills & CTA */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/10 text-white/90 backdrop-blur-xs flex items-center gap-1">
                        <Send className="w-3 h-3 text-emerald-400" />
                        Nhập chat
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/10 text-white/90 backdrop-blur-xs flex items-center gap-1">
                        <Mic className="w-3 h-3 text-rose-400" />
                        Giọng nói
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/10 text-white/90 backdrop-blur-xs flex items-center gap-1">
                        <Camera className="w-3 h-3 text-blue-400" />
                        Gửi ảnh mẫu
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-300 group-hover:translate-x-1 transition-transform">
                      <span>Bắt đầu sáng tạo</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Thêm Ý Tưởng Concept Mới */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
                custom={3}
                variants={homeCardVariants}
                whileHover={{ y: -3, transition: { duration: 0.25, ease: "easeOut" } }}
                whileTap={{ scale: 0.99 }}
              >
                <AddIdeaCard
                  isHomeSection
                  title="Thêm Ý Tưởng Concept Mới"
                  subtitle="Bấm để tạo thêm danh mục hoặc dáng chụp riêng theo phong cách của bạn"
                  badgeText="+ Thêm concept mới"
                  onClick={() => {
                    setCustomModalConfig({
                      isOpen: true,
                      mode: "category",
                    });
                  }}
                />
              </motion.div>
            </div>

            {/* Quick feature highlights */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15, margin: "0px 0px -30px 0px" }}
              custom={4}
              variants={homeCardVariants}
              className="grid grid-cols-2 gap-2.5 pt-2"
            >
              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveAdvisorModal({ pose: null, categoryName: "Tổng quan" })}
                className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left hover:border-violet-400 transition-colors shadow-2xs cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold">AI Phân Tích</div>
                <p className="text-[10px] text-zinc-500">Sửa dáng hiện trường</p>
              </motion.button>

              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowBackupModal(true)}
                className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left hover:border-emerald-400 transition-colors shadow-2xs cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold">Dùng Offline</div>
                <p className="text-[10px] text-zinc-500">100% không cần mạng</p>
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* VIEW 2: PHẦN 3 • BẠN ĐANG BÍ Ý TƯỞNG? */}
        {currentSection === "idea-ai" && (
          <AIIdeaAssistantSection
            onBackToHome={returnToHome}
            onOpenAIAccountLogin={() => {
              setPersonalModalTab("ai");
              setShowPersonalModal(true);
            }}
          />
        )}

        {/* VIEW 3 & 4: PHẦN 1 • KỶ YẾU & PHẦN 2 • CONCEPT CÁ NHÂN */}
        {(currentSection === "kyyeu" || currentSection === "canhan") && (
          <div className="space-y-4 animate-fadeIn">
            {/* Current section and completion summary */}
            {(currentSection === "kyyeu" || !isCanhanDetailOpen) && <div className="flex justify-end">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {currentSection === "kyyeu" ? "Phần 1 • Kỷ Yếu" : "Phần 2 • Concept Cá Nhân"}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {currentSection === "kyyeu"
                    ? `${stats.kyyeuCompleted}/${stats.kyyeuTotal} dáng`
                    : `${stats.canhanCompleted}/${stats.canhanTotal} dáng`}
                </span>
              </div>
            </div>}

            {/* PHẦN 2 (CÁ NHÂN): CÁC MỤC CHỌN NHƯ NÀNG THƠ, CẢM XÚC, ... THEO DẠNG NGANG DỄ BẤM */}
            {currentSection === "canhan" && !isCanhanDetailOpen ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>CHỌN CONCEPT:</span>
                  </div>
                  <button
                    onClick={() => setCustomModalConfig({ isOpen: true, mode: "category" })}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm concept</span>
                  </button>
                </div>

                {/* Vertical Concept Cards */}
                <div className="flex flex-col gap-2.5 pb-2 pt-0.5">
                  {canhanData.map((cat, idx) => {
                    const isActive = idx === activeCanhanCatIdx;
                    const catCompleted = cat.poses.filter((p, pIdx) => {
                      const key = p.id || `canhan-${idx}-${pIdx}`;
                      return localStorage.getItem(`done-${key}`) === "true";
                    }).length;

                    return (
                      <button
                        key={cat.id || idx}
                        type="button"
                        onClick={() => {
                          setActiveCanhanCatIdx(idx);
                          setIsCanhanDetailOpen(true);
                          setSearchQuery("");
                          setFilterStatus("all");
                        }}
                        className={`group relative w-full h-28 rounded-2xl overflow-hidden text-left transition-all duration-200 border cursor-pointer ${
                          isActive
                            ? "border-2 border-amber-500 ring-2 ring-amber-500/30 shadow-md scale-[1.02]"
                            : "border-zinc-200 dark:border-zinc-800 opacity-80 hover:opacity-100 hover:shadow-xs"
                        }`}
                      >
                        <img
                          src={
                            cat.coverImage ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                          }
                          alt={cat.label}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div
                          className={`absolute inset-0 transition-colors ${
                            isActive
                              ? "bg-gradient-to-t from-black/95 via-black/45 to-amber-950/20"
                              : "bg-gradient-to-t from-black/90 via-black/50 to-transparent"
                          }`}
                        />

                        {/* Completed count badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/15">
                          {catCompleted}/{cat.poses.length} dáng
                        </div>

                        {/* Active checkmark */}
                        {isActive && (
                          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Concept Name & Description */}
                        <div className="absolute bottom-2 left-2.5 right-2 text-white">
                          <div
                            className={`text-xs sm:text-sm font-extrabold leading-tight ${
                              isActive ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {cat.label}
                          </div>
                          {cat.description && (
                            <div className="text-[10px] text-zinc-300 line-clamp-1 mt-0.5 opacity-90">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Add New Concept Card */}
                  <button
                    type="button"
                    onClick={() => setCustomModalConfig({ isOpen: true, mode: "category" })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white/50 dark:bg-zinc-900/50 p-3 transition-all text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-xs font-bold leading-tight">+ Thêm Concept</span>
                  </button>
                </div>
              </div>
            ) : currentSection === "kyyeu" ? (
              /* PHẦN 1 (KỶ YẾU): CATEGORY TABS */
              <div className="flex flex-col gap-2 pb-1 py-1">
                {kyyeuData.map((cat, idx) => {
                  const isActive = idx === activeKyyeuCatIdx;
                  const catCompleted = cat.poses.filter((p, pIdx) => {
                    const key = p.id || `kyyeu-${idx}-${pIdx}`;
                    return localStorage.getItem(`done-${key}`) === "true";
                  }).length;

                  return (
                    <button
                      key={cat.id || idx}
                      onClick={() => {
                        setActiveKyyeuCatIdx(idx);
                        setFilterStatus("all");
                      }}
                      className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                          : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive
                            ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {catCompleted}/{cat.poses.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {currentSection === "canhan" && isCanhanDetailOpen && currentCategory && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCanhanDetailOpen(false);
                    setSearchQuery("");
                  }}
                  className="shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200"
                >
                  ← Chủ đề
                </button>
                <h2 className="min-w-0 truncate text-base font-black text-zinc-900 dark:text-zinc-100">
                  {currentCategory.label}
                </h2>
              </div>
            )}

            {/* RỒI MỚI SANG MỤC ẢNH */}
            {/* Real-time search box */}
            {(currentSection === "kyyeu" || !isCanhanDetailOpen) && <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Tìm kiếm tên dáng, góc máy hoặc mẹo ${
                  currentSection === "kyyeu" ? "kỷ yếu..." : "concept cá nhân..."
                }`}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-amber-500 shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Xóa
                </button>
              )}
            </div>}

            {/* Category Banner with Photo Cover & Pencil Edit Button */}
            {currentSection === "kyyeu" && currentCategory && !searchQuery && (
              <div className="relative rounded-3xl overflow-hidden h-36 sm:h-44 border border-zinc-200 dark:border-zinc-800 shadow-sm group">
                <img
                  src={
                    currentCategory.coverImage ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={currentCategory.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* EDIT CATEGORY COVER PENCIL BUTTON */}
                <button
                  onClick={() => {
                    setActiveEditCover({
                      type: "category",
                      categoryId: currentCategory.id,
                      title: `Ảnh Đại Diện: ${currentCategory.label}`,
                      subtitle: "Chỉnh sửa ảnh đại diện cho toàn bộ danh mục này",
                      currentImage: currentCategory.coverImage,
                    });
                  }}
                  title="Chỉnh sửa ảnh đại diện danh mục"
                  className="absolute top-3 right-3 px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-amber-500 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-md active:scale-90"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đổi ảnh đại diện</span>
                </button>

                <div className="absolute bottom-3.5 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {currentSection === "kyyeu" ? "KỶ YẾU" : "CONCEPT CÁ NHÂN"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {currentCategory.label}
                  </h2>
                  {currentCategory.description && (
                    <p className="text-xs text-white/85 line-clamp-1 mt-0.5">
                      {currentCategory.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pinterest & Rednote Exploration Bar for Current Category */}
            {currentCategory && (currentSection === "kyyeu" || isCanhanDetailOpen) && (
              <InspirationBar
                categoryId={currentCategory.id}
                categoryLabel={currentCategory.label}
              />
            )}

            {/* Grid of Poses with Realistic Photo Covers & Pencil Buttons */}
            {(currentSection === "kyyeu" || isCanhanDetailOpen) && displayedPoses.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {displayedPoses.map((pose, pIdx) => {
                  const poseKey = pose.id || `${currentSection}-${currentCatIdx}-${pIdx}`;
                  const isDone = localStorage.getItem(`done-${poseKey}`) === "true";
                  const count = photoCounts[poseKey] || 0;

                  return (
                    <PoseCard
                      key={poseKey}
                      pose={pose}
                      poseKey={poseKey}
                      isDone={isDone}
                      photoCount={count}
                      onClick={() =>
                        setActivePoseModal({
                          pose,
                          categoryName: currentCategory.label,
                          poseKey,
                        })
                      }
                      onToggleDoneQuick={(e) => {
                        e.stopPropagation();
                        handleToggleDone(poseKey);
                      }}
                      onEditCover={(e) => {
                        e.stopPropagation();
                        setActiveEditCover({
                          type: "pose",
                          poseKey,
                          title: `Ảnh Đại Diện: ${pose.title}`,
                          subtitle: currentCategory.label,
                          currentImage: pose.coverImage,
                        });
                      }}
                    />
                  );
                })}

                {/* Add Idea Card at the end of the category grid */}
                {currentSection === "kyyeu" && <AddIdeaCard
                  title="Thêm ý tưởng"
                  subtitle="Bấm dấu + để thêm tư thế mới vào mục này"
                  badgeText="+ Thêm dáng"
                  onClick={() => {
                    setCustomModalConfig({ isOpen: true, categoryId: currentCategory?.id, mode: "pose" });
                  }}
                />}
              </div>
            ) : (currentSection === "kyyeu" || isCanhanDetailOpen) ? (
              <div className="space-y-3">
                <div className="text-center py-14 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <Search className="w-8 h-8 text-zinc-400 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Không tìm thấy tư thế phù hợp
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Hãy thử tìm kiếm với từ khóa khác hoặc bấm bên dưới để thêm ý tưởng mới.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                    }}
                    className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 underline"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>

                {currentSection === "kyyeu" && <div className="grid grid-cols-2 gap-3">
                  <AddIdeaCard
                    title="Thêm ý tưởng"
                    subtitle="Bấm dấu + để thêm tư thế mới vào mục này"
                    badgeText="+ Thêm dáng"
                    onClick={() => {
                      setCustomModalConfig({
                        isOpen: true,
                        categoryId: currentCategory?.id,
                        mode: "pose",
                      });
                    }}
                  />
                </div>}
              </div>
            ) : null}

            {currentSection === "canhan" && isCanhanDetailOpen && currentCategory && (
              <section className="rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/70 dark:bg-violet-950/30 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-violet-900 dark:text-violet-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" /> Trợ lý AI cho {currentCategory.label}
                  </h3>
                  <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-300/80">
                    Nhận gợi ý góc chụp, cách tạo dáng và đạo cụ phù hợp với chủ đề.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveAdvisorModal({ pose: null, categoryName: currentCategory.label })}
                    className="w-full rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Hỏi trợ lý AI
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (AI Assistant) */}
      <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-2">
        <button
          onClick={() => setActiveAdvisorModal({ pose: null, categoryName: "Tự do" })}
          title="AI Cố Vấn Dáng (Gemini 3.1 Pro)"
          className="w-12 h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>
      </div>

      {/* MODAL 1: POSE DETAIL */}
      {activePoseModal && (
        <PoseModal
          pose={activePoseModal.pose}
          categoryName={activePoseModal.categoryName}
          poseKey={activePoseModal.poseKey}
          onClose={() => setActivePoseModal(null)}
          onOpenAdvisor={(pose, cat, initialPhoto) =>
            setActiveAdvisorModal({
              pose,
              categoryName: cat,
              poseKey: activePoseModal.poseKey,
              initialPhotoUrl: initialPhoto,
            })
          }
          onPhotosUpdated={refreshPhotoCounts}
          onSetAsCover={(photoUrl) => {
            handleSaveCoverImage(photoUrl);
          }}
        />
      )}

      {/* MODAL 2: EDIT COVER MODAL (With Pencil Icon branding) */}
      {activeEditCover && (
        <EditCoverModal
          isOpen={Boolean(activeEditCover)}
          title={activeEditCover.title}
          subtitle={activeEditCover.subtitle}
          currentImage={activeEditCover.currentImage}
          poseKey={activeEditCover.poseKey}
          onSave={handleSaveCoverImage}
          onClose={() => setActiveEditCover(null)}
        />
      )}

      {/* MODAL 3: AI POSE ADVISOR (Gemini 3.1 Pro) */}
      {activeAdvisorModal && (
        <AIPoseAdvisorModal
          pose={activeAdvisorModal.pose}
          categoryName={activeAdvisorModal.categoryName}
          poseKey={activeAdvisorModal.poseKey}
          initialPhotoUrl={activeAdvisorModal.initialPhotoUrl}
          onClose={() => setActiveAdvisorModal(null)}
          onPhotoSavedToPose={refreshPhotoCounts}
        />
      )}

      {/* MODAL 5: BACKUP & OFFLINE EXPORT */}
      {showBackupModal && (
        <BackupModal
          kyyeuData={kyyeuData}
          canhanData={canhanData}
          onDataRestored={handleDataRestored}
          onResetSession={handleResetSession}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* MODAL 6: ADD CUSTOM POSE OR CATEGORY */}
      {customModalConfig.isOpen && (
        <AddCustomPoseModal
          kyyeuCategories={kyyeuData}
          canhanCategories={canhanData}
          currentSection={currentSection}
          initialCategoryId={customModalConfig.categoryId}
          initialMode={customModalConfig.mode}
          onAddPose={handleAddPose}
          onAddCategory={handleAddCategory}
          onClose={() => setCustomModalConfig({ isOpen: false })}
        />
      )}

      {/* MODAL 7: ANDROID INSTALL & OFFLINE GUIDE */}
      {showInstallModal && (
        <InstallGuideModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          canInstallPwa={canInstallPwa}
          onInstallPwa={handleInstallPwa}
          onDownloadHtmlOffline={() => {
            exportSingleFileHtml(kyyeuData, canhanData);
          }}
        />
      )}

      {/* MODAL 8: CÁ NHÂN & CÀI ĐẶT */}
      {(showPersonalModal || showSettingsModal) && <PersonalModal
        isOpen={showPersonalModal || showSettingsModal}
        initialTab={personalModalTab}
        onClose={() => {
          setShowPersonalModal(false);
          setShowSettingsModal(false);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        totalPoses={stats.totalPoses}
        doneCount={stats.totalCompleted}
        totalPhotos={stats.totalPhotos}
        onResetSession={handleResetSession}
        onRestoreDefaultData={handleRestoreDefaultData}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenInstallGuide={() => setShowInstallModal(true)}
        onDownloadHtmlOffline={() => exportSingleFileHtml(kyyeuData, canhanData)}
        onSyncComplete={refreshPhotoCounts}
      />}
    </div>
    </Suspense>
  );
}
