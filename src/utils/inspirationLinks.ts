// Utilities for Pinterest and Rednote (Xiaohongshu / 小红书) integration
import {
  translateToChinesePhotography,
  getRednoteChineseSearchUrl,
} from "./rednoteTranslator";

export interface InspirationSource {
  name: string;
  chineseTerm: string;
  vietnameseTerm: string;
  englishTerm: string;
  recommendedTags: string[];
}

export const CONCEPT_INSPIRATION_MAP: Record<string, InspirationSource> = {
  "kyyeu-nu": {
    name: "Kỷ Yếu Đơn Nữ",
    vietnameseTerm: "chụp ảnh kỷ yếu nữ dáng đẹp",
    chineseTerm: "女生毕业照 拍照姿势 青春感",
    englishTerm: "graduation girl portrait pose",
    recommendedTags: [
      "Kỷ yếu nữ sinh",
      "Góc nghiêng ôm hoa",
      "Nụ cười thanh xuân",
      "Bậc thang sân trường",
      "Hành lang lớp học",
    ],
  },
  "kyyeu-don-nu": {
    name: "Kỷ Yếu Đơn Nữ",
    vietnameseTerm: "chụp ảnh kỷ yếu nữ dáng đẹp",
    chineseTerm: "女生毕业照 拍照姿势 青春感",
    englishTerm: "graduation girl portrait pose",
    recommendedTags: [
      "Kỷ yếu nữ sinh",
      "Góc nghiêng ôm hoa",
      "Nụ cười thanh xuân",
      "Bậc thang sân trường",
      "Hành lang lớp học",
    ],
  },
  "kyyeu-doi": {
    name: "Đôi Bạn Thân Nữ",
    vietnameseTerm: "tạo dáng kỷ yếu đôi bạn thân nữ",
    chineseTerm: "闺蜜毕业照 拍照姿势 双人合影",
    englishTerm: "best friends graduation photoshoot",
    recommendedTags: [
      "Đôi bạn thân nữ",
      "Khoác tay tựa vai",
      "Nắm tay chạy sân trường",
      "Gương mặt cười đôi",
    ],
  },
  "kyyeu-aodai": {
    name: "Áo Dài Truyền Thống",
    vietnameseTerm: "tạo dáng chụp ảnh áo dài kỷ yếu dáng đẹp",
    chineseTerm: "越南奥黛写真 旗袍拍照姿势 东方美人",
    englishTerm: "vietnamese ao dai photography pose",
    recommendedTags: [
      "Áo dài trắng nữ sinh",
      "Cầm nón lá / hoa sen",
      "Tà áo dài bay trong gió",
      "Dáng đứng nghiêng e ấp",
      "Áo dài ngồi bậc thềm",
    ],
  },
  "kyyeu-cunhan": {
    name: "Áo Cử Nhân",
    vietnameseTerm: "tạo dáng chụp ảnh áo cử nhân nữ đẹp",
    chineseTerm: "学士服毕业照 女生拍照姿势 扔学士帽",
    englishTerm: "bachelor gown graduation poses female",
    recommendedTags: [
      "Áo cử nhân tung mũ",
      "Cầm bằng tốt nghiệp",
      "Nữ sinh mặc đồ cử nhân",
      "Tựa vai góc lớp",
    ],
  },
  "kyyeu-dongphuc": {
    name: "Đồng Phục Học Sinh",
    vietnameseTerm: "chụp ảnh đồng phục học sinh nữ thanh xuân",
    chineseTerm: "JK制服摄影 青春校园拍照姿势",
    englishTerm: "high school uniform photoshoot girl",
    recommendedTags: [
      "Đồng phục thanh xuân",
      "Cầm sách vở che mặt",
      "Bàn học ngập nắng",
      "Sân cỏ bóng râm",
    ],
  },
  "kyyeu-hauthruong": {
    name: "Hậu Trường & Tự Nhiên",
    vietnameseTerm: "chụp ảnh kỷ yếu candid tự nhiên nữ",
    chineseTerm: "毕业照花絮 抓拍自然拍照姿势",
    englishTerm: "behind the scenes graduation photography candid",
    recommendedTags: [
      "Cười đùa tự nhiên",
      "Chỉnh tóc khoảnh khắc",
      "Uống trà sữa sân trường",
      "Cười tít mắt candid",
    ],
  },
  "canhan-nangtho": {
    name: "Nàng Thơ (Muse / Vintage)",
    vietnameseTerm: "chụp ảnh nàng thơ nữ vintage hoa",
    chineseTerm: "法式复古少女写真 梦幻草地拍照姿势",
    englishTerm: "dreamy muse vintage portrait girl",
    recommendedTags: [
      "Nàng thơ váy trắng",
      "Nàng thơ bên hoa cúc",
      "Ánh nắng qua kẽ lá",
      "Nhắm mắt đón gió",
      "Nằm bãi cỏ mơ màng",
    ],
  },
  "canhan-camxuc": {
    name: "Chân Dung Cảm Xúc",
    vietnameseTerm: "chụp ảnh chân dung cảm xúc nữ film",
    chineseTerm: "情绪人像写真 胶片感拍照姿势",
    englishTerm: "emotional portrait photography female film",
    recommendedTags: [
      "Góc nghiêng tâm trạng",
      "Bóng đổ qua rèm cửa",
      "Ánh mắt biết nói",
      "Cận cảnh giọt sương",
    ],
  },
  "canhan-dantoc": {
    name: "Dân Tộc & Cổ Trang",
    vietnameseTerm: "chụp ảnh cổ phục việt nam nữ dân tộc",
    chineseTerm: "新中式写真 汉服民族风古风姿势",
    englishTerm: "traditional vietnamese costume photoshoot",
    recommendedTags: [
      "Cổ phục Việt phục Nhật Bình",
      "Trang phục H'mông váy xòe",
      "Cầm quạt gấm e lệ",
      "Chân đèo mây bay",
    ],
  },
  "canhan-couple": {
    name: "Bạn Thân & Đôi Bạn Nữ",
    vietnameseTerm: "chụp ảnh đôi bạn thân nữ nghệ thuật",
    chineseTerm: "双人闺蜜写真 拍照灵感 氛围感",
    englishTerm: "two girls besties photoshoot creative",
    recommendedTags: [
      "Tone sur tone bạn thân",
      "Concept tạp chí thời trang",
      "Hai góc mặt đối xứng",
      "Dã ngoại picnic cuối tuần",
    ],
  },
  "canhan-streetwear": {
    name: "Streetwear & Cá Tính",
    vietnameseTerm: "tạo dáng chụp ảnh streetwear nữ cá tính ngầu",
    chineseTerm: "甜酷街头风拍照姿势 辣妹夜拍",
    englishTerm: "streetwear girl aesthetic pose cool",
    recommendedTags: [
      "Góc máy thấp góc rộng",
      "Flash đêm đường phố",
      "Ngồi xổm ngầu cá tính",
      "Kính râm bước đi",
    ],
  },
};

/**
 * Returns clean Pinterest Search URL
 */
export function getPinterestSearchUrl(categoryKey: string, categoryLabel: string, poseTitle?: string): string {
  const info = CONCEPT_INSPIRATION_MAP[categoryKey];
  let query = "";

  if (poseTitle) {
    query = `${poseTitle} chụp ảnh nữ pose`;
  } else if (info) {
    query = info.vietnameseTerm;
  } else {
    query = `chụp ảnh ${categoryLabel} nữ tạo dáng đẹp`;
  }

  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

/**
 * Returns Rednote (Xiaohongshu / 小红书) Search URL
 * Automatically translates ALL ideas, titles, and concepts into authentic Chinese photography search queries!
 */
export function getRednoteSearchUrl(categoryKey: string, categoryLabel: string, poseTitle?: string): string {
  if (poseTitle) {
    return getRednoteChineseSearchUrl(poseTitle, categoryKey);
  }
  const info = CONCEPT_INSPIRATION_MAP[categoryKey];
  if (info?.chineseTerm) {
    return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(info.chineseTerm)}`;
  }
  return getRednoteChineseSearchUrl(categoryLabel, categoryKey);
}

/**
 * Get tailored search query text for direct copy (to paste into mobile apps)
 * Provides automatic Chinese translation for Rednote!
 */
export function getInspirationSearchQuery(categoryKey: string, categoryLabel: string, poseTitle?: string): {
  pinterestQuery: string;
  rednoteQuery: string;
  chineseMeaning: string;
} {
  const info = CONCEPT_INSPIRATION_MAP[categoryKey];

  if (poseTitle) {
    const chinese = translateToChinesePhotography(poseTitle, categoryKey);
    return {
      pinterestQuery: `${poseTitle} tạo dáng chụp ảnh nữ đẹp`,
      rednoteQuery: chinese,
      chineseMeaning: `Quy đổi tiếng Trung: ${chinese}`,
    };
  }

  const chinese = info?.chineseTerm || translateToChinesePhotography(categoryLabel, categoryKey);

  return {
    pinterestQuery: info?.vietnameseTerm || `chụp ảnh ${categoryLabel} nữ`,
    rednoteQuery: chinese,
    chineseMeaning: `Quy đổi tiếng Trung: ${chinese}`,
  };
}

