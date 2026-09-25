import React, { useState } from "react";
import {
  X,
  Plus,
  MapPin,
  Sparkles,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { VisualIdeaLocation, VisualIdeaItem } from "../types";

interface AddVisualIdeaModalProps {
  locations: VisualIdeaLocation[];
  activeLocationId?: string;
  onClose: () => void;
  onAddLocation: (newLoc: VisualIdeaLocation) => void;
  onAddIdea: (newIdea: VisualIdeaItem) => void;
}

export const AddVisualIdeaModal: React.FC<AddVisualIdeaModalProps> = ({
  locations,
  activeLocationId,
  onClose,
  onAddLocation,
  onAddIdea,
}) => {
  const [activeTab, setActiveTab] = useState<"idea" | "location">("idea");

  // Idea Form State
  const [selectedLocId, setSelectedLocId] = useState<string>(
    activeLocationId || locations[0]?.id || "loc-garden"
  );
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaTagline, setIdeaTagline] = useState("");
  const [ideaCover, setIdeaCover] = useState("");
  const [ideaMood, setIdeaMood] = useState("Thơ mộng");
  const [outfit, setOutfit] = useState("");
  const [props, setProps] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("Nắng sớm 7h00 - 9h00");
  const [keyPosesInput, setKeyPosesInput] = useState("");

  // Location Form State
  const [locName, setLocName] = useState("");
  const [locShortName, setLocShortName] = useState("");
  const [locCover, setLocCover] = useState("");
  const [locDesc, setLocDesc] = useState("");
  const [locTags, setLocTags] = useState("");

  // Image upload handler
  const handleUploadImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;

    const poses = keyPosesInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newIdea: VisualIdeaItem = {
      id: `custom-idea-${Date.now()}`,
      locationId: selectedLocId,
      title: ideaTitle.trim(),
      tagline: ideaTagline.trim() || "Concept độc đáo được thiết kế riêng",
      coverImage:
        ideaCover.trim() ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      mood: ideaMood,
      outfitSuggestion: outfit.trim() || "Trang phục phù hợp với tone màu bối cảnh",
      propsSuggestion: props.trim() || "Đạo cụ tự nhiên hoặc phụ kiện nhẹ nhàng",
      timeOfDaySuggestion: timeOfDay.trim() || "Ánh sáng tự nhiên thuận lợi",
      keyPoses:
        poses.length > 0
          ? poses
          : [
              "Dáng đứng nghiêng góc 45 độ, một tay thả lỏng",
              "Dáng ngồi thoải mái tự nhiên, mắt nhìn xa",
              "Ngoảnh lại qua vai mỉm cười với ống kính",
            ],
      isCustom: true,
      createdAt: Date.now(),
    };

    onAddIdea(newIdea);
    onClose();
  };

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;

    const tagsArray = locTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newLoc: VisualIdeaLocation = {
      id: `custom-loc-${Date.now()}`,
      name: locName.trim(),
      shortName: locShortName.trim() || locName.trim().slice(0, 12),
      coverImage:
        locCover.trim() ||
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      description: locDesc.trim() || "Bối cảnh chụp ảnh nghệ thuật thực tế",
      tags: tagsArray.length > 0 ? tagsArray : ["Bối cảnh mới", "Cá nhân"],
      totalIdeas: 0,
      isCustom: true,
    };

    onAddLocation(newLoc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Mở Rộng Thư Viện Ý Tưởng
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Thêm Concept & Bối Cảnh Thực Tế Vào Sổ Tay
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Idea vs Location */}
        <div className="px-5 pt-3 border-b border-zinc-100 dark:border-zinc-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("idea")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === "idea"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            + Thêm Concept Mới
            {activeTab === "idea" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === "location"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            + Thêm Bối Cảnh / Địa Điểm
            {activeTab === "location" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === "idea" ? (
            <form onSubmit={handleSubmitIdea} className="space-y-4">
              {/* Select Location */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Bối Cảnh / Địa Điểm:
                </label>
                <select
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Tagline */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Tên Concept Ý Tưởng: *
                </label>
                <input
                  type="text"
                  required
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="VD: Nàng Thơ Vườn Cúc Tươi Nắng Sớm"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Khẩu hiệu / Cảm hứng ngắn:
                </label>
                <input
                  type="text"
                  value={ideaTagline}
                  onChange={(e) => setIdeaTagline(e.target.value)}
                  placeholder="VD: Vẻ đẹp thuần khiết, trong trẻo như giọt sương"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              {/* Mood & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Phong Cách / Mood:
                  </label>
                  <select
                    value={ideaMood}
                    onChange={(e) => setIdeaMood(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium outline-none"
                  >
                    <option value="Thơ mộng">Thơ mộng</option>
                    <option value="Thanh xuân">Thanh xuân</option>
                    <option value="Cá tính">Cá tính</option>
                    <option value="Cổ điển">Cổ điển</option>
                    <option value="Điện ảnh">Điện ảnh</option>
                    <option value="Năng động">Năng động</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Thời Điểm Chụp Đẹp:
                  </label>
                  <input
                    type="text"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    placeholder="VD: Nắng vàng 16h30"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>
              </div>

              {/* Outfits & Props */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Gợi Ý Trang Phục:
                  </label>
                  <input
                    type="text"
                    value={outfit}
                    onChange={(e) => setOutfit(e.target.value)}
                    placeholder="VD: Váy trắng voan, nón cói"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Gợi Ý Đạo Cụ:
                  </label>
                  <input
                    type="text"
                    value={props}
                    onChange={(e) => setProps(e.target.value)}
                    placeholder="VD: Bó hoa cúc, giỏ mây"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center justify-between">
                  <span>Ảnh Bìa Concept (URL hoặc Tải lên):</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ideaCover}
                    onChange={(e) => setIdeaCover(e.target.value)}
                    placeholder="Dán link ảnh online (https://...)"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                  <label className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, setIdeaCover)}
                    />
                  </label>
                </div>
                {ideaCover && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={ideaCover}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Key recommended poses */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Các Tư Thế Đề Xuất (Mỗi dòng một dáng):
                </label>
                <textarea
                  rows={3}
                  value={keyPosesInput}
                  onChange={(e) => setKeyPosesInput(e.target.value)}
                  placeholder="Đứng nghiêng 45 độ đón nắng, một tay chạm nhẹ tóc&#10;Ngồi trên bậc thềm ôm bó hoa mỉm cười&#10;Bước đi tự nhiên, ngoảnh lại nhìn máy ảnh"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Lưu Concept Vào Thư Viện
                </button>
              </div>
            </form>
          ) : (
            /* Location Form */
            <form onSubmit={handleSubmitLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Tên Bối Cảnh / Địa Điểm: *
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="VD: Cánh Đồng Hoa Cải & Đồi Chè"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Tên Ngắn Gọn (Hiển thị trên tab):
                </label>
                <input
                  type="text"
                  value={locShortName}
                  onChange={(e) => setLocShortName(e.target.value)}
                  placeholder="VD: Đồi Chè"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Mô Tả Không Gian & Cảm Giác:
                </label>
                <input
                  type="text"
                  value={locDesc}
                  onChange={(e) => setLocDesc(e.target.value)}
                  placeholder="VD: Màu xanh bát ngát của đồi chè trong sương sớm, không khí trong lành..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Thẻ Phân Loại (Tags, cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={locTags}
                  onChange={(e) => setLocTags(e.target.value)}
                  placeholder="VD: Xanh mướt, Sương sớm, Mộc mạc"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Ảnh Bìa Bối Cảnh:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locCover}
                    onChange={(e) => setLocCover(e.target.value)}
                    placeholder="Dán link ảnh online (https://...)"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                  <label className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, setLocCover)}
                    />
                  </label>
                </div>
                {locCover && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={locCover}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Lưu Bối Cảnh Vào Danh Sách
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
