// Comprehensive Vietnamese-to-Chinese Photography Dictionary & Translator
// Specially tailored for Xiaohongshu / Rednote (小红书) photography trends

// Direct mapping for known pose titles & common expressions
const EXACT_PHRASE_MAP: Record<string, string> = {
  // Kỷ yếu đơn nữ
  "đứng thẳng nhìn máy": "站姿看镜头 干净校园风拍照姿势",
  "chống hông nhẹ": "叉腰侧身 S形站姿拍照姿势",
  "ngồi bậc thềm": "楼梯台阶坐姿 青春感拍照姿势",
  "vuốt tóc, nhìn xa": "撩头发望向远方 氛围感侧颜拍照",
  "bước đi tự nhiên": "走路抓拍 抓拍自然动态姿势",
  "ngoảnh lại qua vai": "回眸背影杀 唯美侧颜拍照姿势",
  "nghiêng đầu mỉm cười": "歪头甜笑 治愈系少女拍照姿势",
  "che mặt e ấp": "挡脸显脸小 拿道具遮脸拍照姿势",
  "cầm hoa / đạo cụ": "双手捧花 抱花拍照姿势",
  "dựa tường / cột": "靠墙站姿 慵懒自然拍照姿势",

  // Kỷ yếu đôi bạn thân
  "khoác tay tựa vai": "双人闺蜜合照 挽手臂靠肩膀",
  "cùng nhìn máy cười": "闺蜜对视大笑 甜美校园双人拍照",
  "ôm từ phía sau": "背后拥抱 亲密闺蜜合影姿势",
  "nắm tay bước đi": "手牵手走路 校园抓拍双人姿势",
  "quay lưng giơ tay": "背影举手 青春不散场毕业照",
  "tựa đầu vào nhau": "头靠头特写 情绪感双人写真",
  "chạm trán / bí mật": "讲悄悄话 互动感闺蜜合影",
  "cùng cầm chung hoa": "两人合捧一束花 唯美毕业照",

  // Áo dài truyền thống
  "vuốt tà áo dài": "越南奥黛写真 提裙摆优雅站姿",
  "ôm hoa sen / hoa baby": "穿奥黛抱荷花 仙气古典写真姿势",
  "cầm nón lá e ấp": "手拿斗笠 东方温婉女子拍照姿势",
  "bước đi tà bay": "奥黛随风飘动 动态抓拍姿势",
  "ngồi nghiêng duyên dáng": "旗袍奥黛侧坐 展现身材曲线姿势",
  "đứng tựa lan can": "依靠古风栏杆 温柔端庄拍照",
  "góc nghiêng nụ cười": "侧颜半身特写 温婉微笑写真",
  "quay lưng nhìn lại": "古风背影回眸 柔美长发写真",

  // Áo cử nhân
  "tung mũ cử nhân": "扔学士帽 抛帽抓拍毕业照姿势",
  "cầm bằng tốt nghiệp": "双手拿毕业证书 灿烂笑容合影",
  "ôm hoa bằng tốt nghiệp": "捧花拿毕业证 标准学士服姿势",
  "đội mũ chỉnh nón": "整理学士帽 特写氛围感拍照",
  "ngồi thềm trường": "穿学士服坐大礼堂台阶 拍照姿势",
  "nắm vạt áo tung bay": "扬起学士服 青春肆意毕业照",
  "dáng đứng trang trọng": "端庄学士服站姿 毕业留念照",
  "kéo áo khoác vai": "学士服披肩 酷帅学姐拍照姿势",

  // Đồng phục học sinh
  "ngồi bàn học đọc sách": "教室书桌坐姿 校园JK风拍照姿势",
  "cầm sách che mặt": "拿书本挡脸 搞怪可爱校园写真",
  "chạy trên sân cỏ": "草坪奔跑抓拍 阳光少女拍照姿势",
  "uống nước / sữa hộp": "喝牛奶饮料抓拍 青春日系写真",
  "dựa cửa sổ ngắm nắng": "靠教室窗边 丁达尔光影氛围感拍照",
  "cột tóc đuôi ngựa": "扎马尾发型抓拍 侧颜阳光拍照姿势",
  "ngồi bậc thang trường": "校园操场台阶坐姿 学院风拍照",
  "cười rạng rỡ với bạn": "和同学对视大笑 真实青春抓拍",

  // Nàng thơ
  "nằm trên thảm cỏ": "草坪俯拍躺姿 森林系油画少女写真",
  "ôm hoa che mắt": "鲜花遮眼 梦幻法式复古写真姿势",
  "ngược sáng hoàng hôn": "夕阳逆光 氛围感神明少女拍照姿势",
  "cầm gương ngoài trời": "户外对镜拍 创意草地镜子拍照",
  "váy trắng gió bay": "白裙随风飘 仙女下凡拍照姿势",
  "chạm tay vào hoa": "指尖触碰花朵 细节特写写真",
  "uống trà picnic": "法式野餐 优雅下午茶拍照姿势",
  "nhắm mắt đón gió": "闭眼感受微风 情绪氛围感大片",

  // Cảm xúc & Film
  "nhìn qua khe rèm": "窗帘光影透过 情绪胶片感人像",
  "góc nghiêng trầm tư": "侧颜深思 故事感复古写真姿势",
  "ánh mắt qua gương": "镜中倒影 情绪人像拍照姿势",
  "ôm gối ngồi co ro": "抱膝而坐 破碎感少女写真",
  "bóng đổ nghệ thuật": "唯美光影切割 艺术黑白与彩色肖像",
  "nhìn xa qua cửa kính": "靠玻璃窗望远 雨天氛围感写真",

  // Cổ trang / Việt phục
  "cầm quạt gấm e ấp": "手持团扇 东方古典端庄拍照姿势",
  "ngắm sen bên hồ": "水榭楼阁赏荷 新中式古风写真",
  "nâng vạt cổ phục": "提汉服古装裙摆 步步生莲拍照",
  "quay lưng ngắm đình chùa": "古建筑前背影 唯美古风大片",
  "cầm ô giấy dầu": "撑油纸伞 细雨古风拍照姿势",

  // Streetwear & Cá tính
  "ngồi xổm phong cách": "街头酷女孩蹲姿 辣妹拍照姿势",
  "flash đêm đường phố": "夜景闪光灯胶片感 甜酷辣妹街拍",
  "đeo kính râm bước đi": "戴墨镜大步走 欧美复古街拍",
  "góc máy thấp chụp lên": "低角度广角仰拍 大长腿气场拍照",
  "tựa mui xe / tường graffiti": "靠涂鸦墙 潮流街头穿搭写真",
};

// Vocabulary dictionary for tokenized translation
const VOCAB_MAP: Array<{ pattern: RegExp; chinese: string }> = [
  // Concepts & Themes
  { pattern: /kỷ\s*yếu/gi, chinese: "毕业照" },
  { pattern: /tốt\s*nghiệp/gi, chinese: "毕业写真" },
  { pattern: /cử\s*nhân|học\s*vị/gi, chinese: "学士服" },
  { pattern: /áo\s*dài/gi, chinese: "越南奥黛 旗袍" },
  { pattern: /cổ\s*phục|việt\s*phục|cổ\s*trang/gi, chinese: "新中式古风" },
  { pattern: /nàng\s*thơ|vintage|retro/gi, chinese: "法式复古 氛围感少女" },
  { pattern: /cảm\s*xúc|tâm\s*trạng|deep/gi, chinese: "情绪人像 胶片感" },
  { pattern: /đồng\s*phục|học\s*sinh|thanh\s*xuân/gi, chinese: "青春校园 JK制服" },
  { pattern: /streetwear|cá\s*tính|ngầu|cool|chất/gi, chinese: "甜酷街头 辣妹" },
  { pattern: /hậu\s*trường|candid|tự\s*nhiên/gi, chinese: "自然抓拍 花絮" },
  { pattern: /đôi\s*bạn|bạn\s*thân|nhóm\s*bạn|couple|hai\s*người/gi, chinese: "闺蜜双人合照" },
  { pattern: /chân\s*dung|lookbook|profile/gi, chinese: "个人肖像写真" },

  // Actions
  { pattern: /tung\s*mũ|ném\s*mũ/gi, chinese: "扔学士帽" },
  { pattern: /vuốt\s*tóc|chỉnh\s*tóc|vuốt\s*lọn/gi, chinese: "撩头发" },
  { pattern: /che\s*mặt|giấu\s*mặt|che\s*một\s*bên/gi, chinese: "挡脸显脸小" },
  { pattern: /chống\s*hông|chống\s*tay/gi, chinese: "叉腰" },
  { pattern: /bước\s*đi|đi\s*dạo|chạy/gi, chinese: "走路抓拍" },
  { pattern: /quay\s*lưng|sau\s*lưng/gi, chinese: "背影杀" },
  { pattern: /ngoảnh\s*lại|quay\s*đầu|ngước\s*nhìn/gi, chinese: "回眸" },
  { pattern: /nghiêng\s*đầu|nghiêng\s*mặt/gi, chinese: "歪头" },
  { pattern: /cười|nụ\s*cười|tươi|mỉm/gi, chinese: "甜美微笑" },
  { pattern: /ngồi\s*bệt|ngồi\s*thềm|ngồi\s*ghế|ngồi/gi, chinese: "坐姿" },
  { pattern: /ngồi\s*xổm|ngồi\s*chồm\s*hổm/gi, chinese: "蹲姿拍照" },
  { pattern: /đứng\s*thẳng|đứng\s*nghiêng|đứng/gi, chinese: "站姿" },
  { pattern: /tựa\s*vai|dựa\s*tường|tựa\s*lan\s*can|dựa/gi, chinese: "倚靠" },
  { pattern: /nhìn\s*xa|nhìn\s*máy|nhìn\s*thẳng/gi, chinese: "看镜头 望远" },
  { pattern: /nằm\s*cỏ|nằm\s*thảm|nằm/gi, chinese: "俯拍躺姿" },
  { pattern: /ôm|khoác\s*tay|nắm\s*tay/gi, chinese: "牵手拥抱" },

  // Props & Outfits
  { pattern: /hoa\s*sen/gi, chinese: "荷花" },
  { pattern: /hoa\s*cúc|họa\s*mi/gi, chinese: "小雏菊" },
  { pattern: /hoa\s*baby/gi, chinese: "满天星" },
  { pattern: /bó\s*hoa|ôm\s*hoa|cầm\s*hoa|hoa/gi, chinese: "捧花拍照" },
  { pattern: /nón\s*lá|nón/gi, chinese: "斗笠草帽" },
  { pattern: /mũ\s*cử\s*nhân|mũ/gi, chinese: "学士帽 帽子" },
  { pattern: /sách|vở|cặp/gi, chinese: "拿书本" },
  { pattern: /bằng\s*tốt\s*nghiệp/gi, chinese: "毕业证书" },
  { pattern: /kính\s*râm|mắt\s*kính|kính/gi, chinese: "墨镜眼镜" },
  { pattern: /máy\s*ảnh/gi, chinese: "拿相机拍照" },
  { pattern: /gương/gi, chinese: "对镜自拍" },
  { pattern: /bóng\s*bay|bong\s*bóng/gi, chinese: "气球" },
  { pattern: /váy\s*trắng|váy/gi, chinese: "小白裙写真" },

  // Settings & Lighting
  { pattern: /bậc\s*thềm|cầu\s*thang/gi, chinese: "楼梯台阶" },
  { pattern: /sân\s*trường|lớp\s*học|bàn\s*học/gi, chinese: "校园教室操场" },
  { pattern: /bãi\s*cỏ|sân\s*cỏ|cỏ/gi, chinese: "大草坪" },
  { pattern: /hoàng\s*hôn|ngược\s*sáng|ánh\s*nắng|nắng/gi, chinese: "夕阳逆光 光影" },
  { pattern: /đêm|flash|buổi\s*tối/gi, chinese: "夜景闪光灯" },
  { pattern: /rèm\s*cửa|cửa\s*sổ/gi, chinese: "窗边光影" },
  { pattern: /đường\s*phố|phố/gi, chinese: "街景街拍" },
  { pattern: /cafe|quán/gi, chinese: "咖啡馆拍照" },
  { pattern: /picnic|dã\s*ngoại/gi, chinese: "户外野餐" },
];

// Fallbacks by category identifier
const CATEGORY_CHINESE_FALLBACK: Record<string, string> = {
  "kyyeu-nu": "女生毕业照 拍照姿势 青春感",
  "kyyeu-don-nu": "女生毕业照 拍照姿势 青春感",
  "kyyeu-doi": "闺蜜毕业照 双人合影姿势",
  "kyyeu-aodai": "越南奥黛写真 旗袍拍照姿势 东方美人",
  "kyyeu-cunhan": "学士服毕业照 女生拍照姿势 扔学士帽",
  "kyyeu-dongphuc": "JK制服摄影 青春校园拍照姿势",
  "kyyeu-hauthruong": "毕业照花絮 抓拍自然拍照姿势",
  "canhan-nangtho": "法式复古少女写真 梦幻草地拍照姿势",
  "canhan-camxuc": "情绪人像写真 胶片感拍照姿势",
  "canhan-dantoc": "新中式写真 汉服民族风古风姿势",
  "canhan-couple": "双人闺蜜写真 拍照灵感 氛围感",
  "canhan-streetwear": "甜酷街头风拍照姿势 辣妹夜拍",
};

/**
 * Translates any Vietnamese idea, title, or search term into natural Chinese Xiaohongshu photography keywords.
 */
export function translateToChinesePhotography(rawText?: string, categoryContext?: string): string {
  if (!rawText || rawText.trim().length === 0) {
    if (categoryContext && CATEGORY_CHINESE_FALLBACK[categoryContext]) {
      return CATEGORY_CHINESE_FALLBACK[categoryContext];
    }
    return "女生写真 拍照姿势 摄影灵感";
  }

  const clean = rawText.trim().toLowerCase();

  // 1. Check exact phrase dictionary
  if (EXACT_PHRASE_MAP[clean]) {
    return EXACT_PHRASE_MAP[clean];
  }

  // Check loose matches in exact dictionary
  for (const [key, chVal] of Object.entries(EXACT_PHRASE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return chVal;
    }
  }

  // 2. Tokenize and match vocabulary pieces
  const matchedTokens: string[] = [];

  for (const item of VOCAB_MAP) {
    if (item.pattern.test(clean)) {
      if (!matchedTokens.includes(item.chinese)) {
        matchedTokens.push(item.chinese);
      }
    }
  }

  // Add category context if needed
  if (categoryContext && CATEGORY_CHINESE_FALLBACK[categoryContext] && matchedTokens.length <= 1) {
    const fallbackTerms = CATEGORY_CHINESE_FALLBACK[categoryContext].split(" ");
    for (const term of fallbackTerms) {
      if (!matchedTokens.includes(term)) {
        matchedTokens.unshift(term);
        break;
      }
    }
  }

  if (matchedTokens.length > 0) {
    // Deduplicate and assemble clean query
    const query = matchedTokens.slice(0, 3).join(" ");
    if (!query.includes("拍照姿势") && !query.includes("写真")) {
      return `${query} 拍照姿势`;
    }
    return query;
  }

  // 3. Fallback to category or universal trendy query
  if (categoryContext && CATEGORY_CHINESE_FALLBACK[categoryContext]) {
    return CATEGORY_CHINESE_FALLBACK[categoryContext];
  }

  return "女生个人写真 拍照姿势 摄影灵感";
}

/**
 * Generates an authentic Rednote (小红书 - Xiaohongshu) search URL with 100% Chinese photography query.
 */
export function getRednoteChineseSearchUrl(rawText?: string, categoryContext?: string): string {
  const chineseQuery = translateToChinesePhotography(rawText, categoryContext);
  return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(chineseQuery)}`;
}
