import type {
  VariationLevel,
  PoseReferenceData,
  PoseAnatomyBreakdown,
  PoseFieldExecution,
  VisualPoseWireframe,
} from "../types/index";

export interface BuildPoseGeneratorOptions {
  referencePoseTitle?: string;
  referenceCategory?: string;
  hasReferenceImage: boolean;
  variationLevel: VariationLevel;
  gender?: "nu" | "nam" | "couple" | "nhom";
  shotType?: "full" | "medium" | "close" | "sitting";
  concept?: string;
  customInstructions?: string;
}

export function buildPoseGeneratorPrompt(options: BuildPoseGeneratorOptions): string {
  const {
    referencePoseTitle,
    referenceCategory,
    hasReferenceImage,
    variationLevel,
    gender = "nu",
    shotType = "full",
    concept = "Kỷ yếu & Chân dung",
    customInstructions = "",
  } = options;

  const levelName =
    variationLevel === 1
      ? "LEVEL 1 — BIẾN TẤU NHẸ (Giữ gần như toàn bộ cấu trúc pose; chỉ đổi tay, đầu, mắt, chân, biểu cảm)"
      : variationLevel === 2
      ? "LEVEL 2 — BIẾN TẤU VỪA (Giữ tinh thần pose nhưng đổi hướng thân, trọng tâm, chân trụ, độ cong cơ thể, đạo cụ)"
      : "LEVEL 3 — BIẾN TẤU SÁNG TẠO (Giữ silhouette hoặc ý tưởng hình thể chính, tạo pose mới mẻ nhưng cùng hệ logic)";

  const genderLabel =
    gender === "nu"
      ? "Nữ (Một bạn nữ)"
      : gender === "nam"
      ? "Nam (Một bạn nam)"
      : gender === "couple"
      ? "Cặp đôi (Couple)"
      : "Nhóm / Tập thể bạn bè";

  const shotTypeLabel =
    shotType === "full"
      ? "Toàn thân (Full Body - Thấy rõ từ đầu đến chân và giày)"
      : shotType === "medium"
      ? "Bán thân (Medium Shot - Từ đùi/eo trở lên)"
      : shotType === "sitting"
      ? "Dáng Ngồi / Tựa bậc thềm / Ghế"
      : "Cận cảnh / Chân dung (Headshot & Bust)";

  return `Bạn là Chuyên Gia Định Hình Tư Thế & Giám Đốc Tạo Dáng (Pose Director) của POSING ART.

BẢN CHẤT ỨNG DỤNG:
- POSING ART là một SỔ TAY THAM KHẢO DÁNG CHỤP BẰNG HÌNH ẢNH.
- Người dùng mở app để: quan sát cách cơ thể được đặt, lấy cảm hứng, tham khảo vị trí tay, chân, đầu, vai, hông, sau đó biến tấu thực tế ngoài hiện trường.
- ĐÂY KHÔNG PHẢI là một app lập kế hoạch buổi chụp.
- TUYỆT ĐỐI KHÔNG tạo: shot list, shooting sequence, timeline buổi chụp, kịch bản hành động "người A đi trước người B đi sau", storyboard 5-8 cảnh.
- Không áp đặt cốt truyện hay hành động thừa nếu người dùng không yêu cầu.

MỤC TIÊU:
${
  hasReferenceImage
    ? `Tạo BIẾN THỂ THAM KHẢO của dáng chụp trong ảnh gốc theo nguyên tắc:
REFERENCE → PHÂN TÍCH HÌNH THỂ GỐC → BIẾN TẤU THEO MỨC ĐỘ → DÁNG MỚI ĐỒNG ĐIỆU.
Giữ "tinh thần hình học" của dáng ban đầu, KHÔNG nhảy sang concept hoàn toàn xa lạ.`
    : `Tạo một DÁNG MẪU THAM KHẢO MỚI từ đầu, dễ học, anatomy chuẩn xác, dễ làm ngoài đời thực.`
}

MỨC ĐỘ BIẾN TẤU YÊU CẦU:
${levelName}

THÔNG TIN ĐẦU VÀO:
- Đối tượng: ${genderLabel}
- Khung hình: ${shotTypeLabel}
- Bối cảnh / Concept: ${concept}
${referencePoseTitle ? `- Tên dáng gốc: ${referencePoseTitle}` : ""}
${referenceCategory ? `- Thể loại gốc: ${referenceCategory}` : ""}
${customInstructions ? `- Yêu cầu thêm từ người dùng: ${customInstructions}` : ""}

${
  hasReferenceImage
    ? `HƯỚNG DẪN QUAN SÁT ẢNH GỐC (ẢNH THAM KHẢO ĐÍNH KÈM):
Hãy phân tích ảnh theo:
A. HEAD: hướng đầu, độ nghiêng đầu, hướng mặt, hướng mắt
B. SHOULDERS & TORSO: hướng vai, độ xoay thân, độ nghiêng cơ thể, đường cong chính của cơ thể (S-curve, C-curve, thẳng)
C. ARMS & HANDS: tay đang ở đâu, khuỷu tay, cổ tay, bàn tay, điểm tiếp xúc với cơ thể hoặc đạo cụ
D. HIPS & LEGS: trọng tâm dồn vào đâu, chân trụ, chân còn lại, độ chéo, khoảng cách hai chân, hướng bàn chân
E. SILHOUETTE: đường cơ thể chính, negative space giữa tay và thân, negative space giữa hai chân, hình khối tổng thể của pose
Sau đó áp dụng ${levelName} để sinh ra dáng mới.`
    : ""
}

QUY TẮC ANATOMY & HÌNH ẢNH:
- Dáng phải có anatomy người chuẩn, các khớp tự nhiên, ngón tay thả lỏng nhẹ nhàng (không nắm chặt, không che mặt vô lý).
- Luôn chú trọng "Negative Space" (khoảng trống giữa cánh tay và eo/hông) để tránh làm thân hình bị bè to trên ảnh.
- Luôn chỉ rõ chân nào chịu lực (chân trụ) và chân nào thả lỏng tạo dáng.
- Lời hướng dẫn phải chuyển thành HÀNH ĐỘNG VẬT LÝ CỤ THỂ mà thợ ảnh hoặc mẫu làm được ngay trong 3 giây.
- TUYỆT ĐỐI KHÔNG dùng câu sáo rỗng: "hãy tự nhiên", "hãy cười rạng rỡ", "hãy diễn cảm xúc".

QUY TẮC TẠO IMAGE PROMPT (CHO BƯỚC VẼ ẢNH THAM KHẢO):
- Ưu tiên KHẢ NĂNG HỌC DÁNG: cơ thể rõ ràng, silhouette dễ nhìn, tay/chân dễ quan sát, pose dễ hiểu, background gọn gàng không gây nhiễu, ánh sáng rõ ràng thấy rõ khối cơ thể.
- TUYỆT ĐỐI KHÔNG có chữ (no text), không watermark, không UI, không infographic, không mũi tên hay sơ đồ đè lên ảnh.
- Prompt bằng tiếng Anh chi tiết, tả rõ vị trí tay, chân, đầu, góc nhìn máy ảnh, phong cách chụp ảnh chân thực (photorealistic portrait photography).

ĐỊNH DẠNG TRẢ VỀ:
BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm lời chào hay giải thích ngoài JSON) theo cấu trúc sau:
{
  "title": "Tên ngắn gọn của dáng mới (3-6 từ, vd: Nghiêng 45 Độ Vén Tóc Chân Trước Thả Lỏng)",
  "variationLevel": ${variationLevel},
  "variationType": "Tóm tắt sự thay đổi (vd: Đổi tay chạm tóc, dồn trọng tâm sang chân phải, mở rộng góc xoay vai)",
  "summary": "1-2 câu nhận định nhanh giúp thợ ảnh hiểu ngay dáng này dùng để làm gì và tôn ưu điểm gì.",
  ${
    hasReferenceImage
      ? `"referenceAnalysis": {
    "head": "Mô tả ngắn gọn đầu/mặt/mắt của ảnh gốc",
    "shouldersTorso": "Mô tả ngắn gọn vai/thân của ảnh gốc",
    "armsHands": "Mô tả ngắn gọn tay của ảnh gốc",
    "hipsLegs": "Mô tả ngắn gọn chân/trọng tâm của ảnh gốc",
    "silhouette": "Mô tả ngắn gọn silhouette & khoảng trống của ảnh gốc"
  },`
      : ""
  }
  "anatomy": {
    "head": "Hướng đầu (xoay bao nhiêu độ), độ nghiêng cằm, hướng mắt nhìn (vd: Nghiêng nhẹ 15° về vai phải, cằm hơi nâng 5°, mắt nhìn góc 2 giờ)",
    "torso": "Hướng vai, độ xoay thân (vd: Vai xoay chếch 30° so với ống kính, lưng giữ thẳng tự nhiên, ngực mở nhẹ)",
    "armsHands": "Vị trí chính xác tay trái và tay phải, ngón tay thả lỏng ra sao, điểm tiếp xúc (vd: Tay phải co nhẹ chạm nhẹ lọn tóc sau tai, tay trái buông hờ thả lỏng bên hông tạo khoảng hở với eo)",
    "hipsLegs": "Trọng tâm và chân (vd: Trọng tâm 80% dồn chân sau chịu lực, chân trước bước chếch 20cm gối hơi chùng mũi chân hướng máy ảnh)",
    "silhouette": "Đường cong cơ thể & negative space (vd: Đường cong S nhẹ nhàng, khoảng trống tam giác rõ nét giữa tay trái và eo giúp eo thon gọn)"
  },
  "fieldExecution": {
    "modelAction": "Khẩu lệnh thợ ảnh nói với mẫu (ngắn gọn, chính xác, vd: 'Em nghiêng mặt qua phải một chút, tay phải đưa lên luồn nhẹ chân tóc, chân trái bước nhẹ lên trước thả lỏng')",
    "photographerCue": "Vị trí máy ảnh và framing (vd: Máy ngang ngực, góc 3/4, lùi 2.5m, khung hình dọc 3:4)",
    "negativeSpaceTip": "Mẹo tạo khoảng trống thẩm mỹ (vd: Giữ khuỷu tay cách sườn 5-10cm, không ép sát cánh tay vào mạn sườn)",
    "difficulty": "DỄ" | "VỪA" | "CẦN_DẺO",
    "commonMistake": "Lỗi mẫu hay mắc phải ở dáng này (vd: Ép chặt bắp tay làm tay trông to, hoặc gồng cứng các ngón tay)"
  },
  "visualPoseWireframe": {
    "headTiltDeg": 10,
    "torsoAngleDeg": 30,
    "weightFoot": "left" | "right" | "balanced",
    "silhouetteShape": "S-Curve" | "Triangle" | "Straight" | "A-Shape" | "Diagonal",
    "armPositionSummary": "Tay phải chạm tóc, tay trái buông hờ tạo khoảng hở eo",
    "keyPointsSummary": [
      "Điểm 1: Đầu nghiêng nhẹ về vai phải",
      "Điểm 2: Khoảng trống tay - eo rõ ràng",
      "Điểm 3: Chân trước chéo nhẹ mũi chân hướng thợ"
    ]
  },
  "imagePrompt": "Detailed English prompt for generating reference photograph: A full-body realistic fashion portrait of a Vietnamese girl standing gracefully in a white traditional ao dai, head tilted 15 degrees smiling gently, right hand delicately touching hair, left arm resting relaxed by hip with clear negative space, weight on back foot, front leg bent slightly, clean minimalist courtyard background, soft directional natural light, 85mm lens look, hyper realistic, no watermark, no text, clean composition."
}`;
}

export function parsePoseGeneratorResponse(rawText: string): PoseReferenceData {
  try {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    }

    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanJson);

    return {
      title: parsed.title || "Dáng Tham Khảo Biến Thể Thực Chiến",
      variationLevel: parsed.variationLevel || 1,
      variationType: parsed.variationType || "Biến thể tay và hướng đầu",
      summary: parsed.summary || "Dáng đứng tự nhiên, tạo đường nét cơ thể thanh thoát và dễ thực hiện.",
      referenceAnalysis: parsed.referenceAnalysis,
      anatomy: {
        head: parsed.anatomy?.head || "Đầu nghiêng nhẹ 10-15 độ, mắt nhìn chếch về phía trước.",
        torso: parsed.anatomy?.torso || "Thân người xoay 30 độ so với máy ảnh, lưng thẳng tự nhiên.",
        armsHands: parsed.anatomy?.armsHands || "Một tay đưa lên tương tác nhẹ, tay còn lại buông thả lỏng cách eo.",
        hipsLegs: parsed.anatomy?.hipsLegs || "Dồn trọng tâm vào chân sau, chân trước hơi chùng mũi chân hướng máy.",
        silhouette: parsed.anatomy?.silhouette || "Đường nét cơ thể mềm mại, có khoảng trống giữa tay và sườn.",
      },
      fieldExecution: {
        modelAction: parsed.fieldExecution?.modelAction || "Mẫu xoay người 30 độ, một tay đưa nhẹ lên tóc, chân trước thả lỏng.",
        photographerCue: parsed.fieldExecution?.photographerCue || "Máy ảnh ngang ngực, lùi 2-3 mét, góc chụp hơi chếch.",
        negativeSpaceTip: parsed.fieldExecution?.negativeSpaceTip || "Tạo khoảng hở 5-10cm giữa cánh tay và eo để dáng thon hơn.",
        difficulty: parsed.fieldExecution?.difficulty || "DỄ",
        commonMistake: parsed.fieldExecution?.commonMistake || "Tránh ép bắp tay vào mạn sườn làm tay bị to.",
      },
      visualPoseWireframe: parsed.visualPoseWireframe || {
        headTiltDeg: 12,
        torsoAngleDeg: 25,
        weightFoot: "right",
        silhouetteShape: "S-Curve",
        armPositionSummary: "Một tay chạm tóc, một tay buông lỏng",
        keyPointsSummary: [
          "Đầu nghiêng nhẹ tạo nét duyên dáng",
          "Khoảng hở tay-thân giúp eo thon gọn",
          "Chân trước thả lỏng kéo dài tỷ lệ chân",
        ],
      },
      imagePrompt: parsed.imagePrompt || "Photorealistic reference portrait of a model posing naturally.",
      imageUrl: parsed.imageUrl,
      caption: parsed.caption,
    };
  } catch (err) {
    console.error("Failed to parse pose generator JSON response:", err);
    return generateSmartFallbackPose({
      referencePoseTitle: "Dáng Tham Khảo Biến Thể",
      hasReferenceImage: false,
      variationLevel: 1,
    });
  }
}

export function generateSmartFallbackPose(options: BuildPoseGeneratorOptions): PoseReferenceData {
  const {
    referencePoseTitle = "Dáng Mẫu Thực Tế",
    variationLevel = 1,
    gender = "nu",
    shotType = "full",
    concept = "Kỷ yếu & Ngoại cảnh",
  } = options;

  if (variationLevel === 1) {
    return {
      title: `${referencePoseTitle} — Biến Thể Nhẹ (Level 1)`,
      variationLevel: 1,
      variationType: "Biến thể vị trí tay, hướng đầu & ánh mắt",
      summary: "Giữ 90% cấu trúc gốc, đổi tay tiếp xúc và hướng mắt nhìn góc 2 giờ để tạo nét biểu cảm mới mà không làm mẫu bỡ ngỡ.",
      referenceAnalysis: {
        head: "Đầu thẳng hoặc nghiêng nhẹ theo thế đứng",
        shouldersTorso: "Vai mở tự nhiên, thân đứng nghiêng nhẹ",
        armsHands: "Một tay tương tác cơ thể, tay kia buông",
        hipsLegs: "Trọng tâm đặt vững ở một chân",
        silhouette: "Dáng đứng cân đối, có khoảng hở mạn sườn",
      },
      anatomy: {
        head: "Nghiêng nhẹ 10-15° về phía vai sau, cằm nâng nhẹ 5°, ánh mắt nhìn chếch 45° (hướng 2 giờ) thay vì nhìn thẳng.",
        torso: "Giữ góc xoay vai 30° so với ống kính, thả lỏng lồng ngực, kéo nhẹ hai bả vai về sau để mở rộng xương quai xanh.",
        armsHands: "Đổi tay: tay phía trước co nhẹ chạm đầu ngón tay vào xương quai xanh hoặc lọn tóc, tay sau buông thả lỏng cách eo 8cm.",
        hipsLegs: "Trọng tâm dồn 85% vào chân trụ phía sau, chân trước hơi chùng gối, mũi chân hướng thẳng về phía máy ảnh để kéo dài chân.",
        silhouette: "Đường cong chữ S mềm mại, khoảng trống tam giác rõ nét giữa cánh tay sau và eo giúp thon gọn vòng hai.",
      },
      fieldExecution: {
        modelAction: "Em giữ nguyên hướng đứng, xoay nhẹ cằm qua vai phải, tay trước chạm nhẹ xương quai xanh, mắt cười nhẹ nhé!",
        photographerCue: "Giữ máy ngang ngực, lùi 2.5m, góc chụp chếch 3/4 để bắt được đường cong xương quai xanh.",
        negativeSpaceTip: "Nhắc mẫu nhấc nhẹ khuỷu tay ra khỏi hông 5-8cm, tuyệt đối không ép sát bắp tay vào mạn sườn.",
        difficulty: "DỄ",
        commonMistake: "Mẫu hay gồng cứng ngón tay hoặc nhìn chằm chằm vào ống kính làm mất nét tự nhiên.",
      },
      visualPoseWireframe: {
        headTiltDeg: 12,
        torsoAngleDeg: 28,
        weightFoot: "right",
        silhouetteShape: "S-Curve",
        armPositionSummary: "Tay trước chạm xương quai xanh, tay sau buông lỏng hở eo",
        keyPointsSummary: [
          "Cằm nâng 5° bắt sáng đều vùng cổ",
          "Khoảng trống tay-eo rõ nét giúp thon gọn",
          "Mũi chân trước hướng ống kính tạo hiệu ứng chân dài",
        ],
      },
      imagePrompt: `Realistic portrait photography of a ${gender === "nam" ? "young man" : "young woman"} posing gracefully in ${concept}, Level 1 subtle variation, head tilted 12 degrees smiling gently, hand touching collarbone delicately, negative space at waist, natural outdoor lighting, 85mm lens look, no text, no watermark, high learnability.`,
    };
  }

  if (variationLevel === 2) {
    return {
      title: `${referencePoseTitle} — Biến Thể Vừa (Level 2)`,
      variationLevel: 2,
      variationType: "Đổi hướng xoay thân, chuyển chân trụ & mở rộng góc vai",
      summary: "Giữ tinh thần dáng nhưng chuyển toàn bộ trọng tâm sang chân đối diện và xoay thân 45° để thay đổi hoàn toàn khối thị giác.",
      referenceAnalysis: {
        head: "Hướng đầu ở vị trí chuẩn của dáng ban đầu",
        shouldersTorso: "Trục thân người hướng thẳng hoặc xoay nhẹ",
        armsHands: "Tay đặt ở vị trí quen thuộc",
        hipsLegs: "Chân trụ cũ chịu lực chính",
        silhouette: "Hình khối cân bằng ổn định",
      },
      anatomy: {
        head: "Đầu ngoảnh nhẹ qua vai đối diện, cằm hơi hạ 5° để tạo chiều sâu cho đôi mắt và làm rõ nét đường viền hàm (jawline).",
        torso: "Xoay thân 45° so với máy ảnh, hơi đẩy nhẹ hông sau ra ngoài để tạo đường cong hông rõ nét hơn dáng gốc.",
        armsHands: "Một tay gập khuỷu góc 90° đặt hờ mu bàn tay lên eo trên, tay còn lại cầm nhẹ vạt áo/đạo cụ hoặc buông lỏng tự nhiên.",
        hipsLegs: "Chuyển hẳn chân trụ sang chân trước hoặc chân sau, chân còn lại bước chéo nhẹ qua chân trụ, gót chân nhấc nhẹ 2cm.",
        silhouette: "Tạo hình tam giác kép: tam giác giữa khuỷu tay và eo, tam giác giữa hai bắp chân, tạo cảm giác thanh mảnh và vững chãi.",
      },
      fieldExecution: {
        modelAction: "Em bước chân trái chéo nhẹ qua chân phải, đặt một tay lên eo trên, quay đầu nhìn qua vai về phía anh nhé!",
        photographerCue: "Hạ thấp máy ảnh xuống ngang bụng/thắt lưng, chếch nhẹ 15° từ dưới lên để tôn chiều cao của mẫu.",
        negativeSpaceTip: "Khoảng trống giữa hai đầu gối và giữa khuỷu tay với eo phải nhìn thấy rõ ánh sáng nền xuyên qua.",
        difficulty: "VỪA",
        commonMistake: "Mẫu dễ bị mất thăng bằng khi đổi chân trụ; nhắc mẫu dồn chắc lực vào gót chân trụ.",
      },
      visualPoseWireframe: {
        headTiltDeg: -10,
        torsoAngleDeg: 45,
        weightFoot: "left",
        silhouetteShape: "Triangle",
        armPositionSummary: "Một tay chống hờ trên eo, một tay thả lỏng cầm đạo cụ",
        keyPointsSummary: [
          "Thân xoay 45° thu gọn bề rộng cơ thể",
          "Chân chéo nhẹ tạo cảm giác chân thon dài",
          "Đường viền hàm sắc nét nhờ cằm hạ nhẹ",
        ],
      },
      imagePrompt: `Realistic portrait photography of a ${gender === "nam" ? "young man" : "young woman"} in ${concept}, Level 2 moderate pose variation, body turned 45 degrees, one hand resting softly on upper waist, crossed feet with dynamic balance, soft natural backlight, 70mm lens, clear limbs, no text, no watermark.`,
    };
  }

  // Level 3
  return {
    title: `${referencePoseTitle} — Biến Thể Sáng Tạo (Level 3)`,
    variationLevel: 3,
    variationType: "Biến thể hình thể sáng tạo — Tương tác bối cảnh & Đường chéo động",
    summary: "Giữ lại silhouette đường cong chính nhưng giải phóng toàn bộ thế đứng, tạo tư thế mới có tính chuyển động và tương tác cao.",
    referenceAnalysis: {
      head: "Tư thế đầu tĩnh ở dáng cũ",
      shouldersTorso: "Trục cơ thể tĩnh tại chỗ",
      armsHands: "Tay ở vị trí cố định",
      hipsLegs: "Thế đứng tĩnh",
      silhouette: "Hình thể đóng",
    },
    anatomy: {
      head: "Đầu hơi ngửa nhẹ 10° đón ánh sáng tự nhiên hoặc quay ngoảnh 3/4 với nụ cười sảng khoái, mắt nhìn xa xăm hoặc bắt trọn ống kính.",
      torso: "Thân người hơi nghiêng theo đường chéo động (diagonal), vai trước hơi hạ 5cm so with vai sau để tạo sự linh hoạt phi đối xứng.",
      armsHands: "Hai tay hoạt động tự do: một tay đưa lên che nhẹ ánh nắng hoặc chạm tóc bay, tay kia vung nhẹ theo bước chân hoặc tựa hờ thành lan can.",
      hipsLegs: "Tư thế bước đi tự nhiên (walking motion) hoặc tựa nhẹ hông vào điểm tựa, một chân thẳng chịu lực, một chân co gối tự nhiên.",
      silhouette: "Hình khối đường chéo mở (Dynamic Diagonal), toàn bộ cơ thể toát lên năng lượng tươi trẻ và không gian thở rộng mở.",
    },
    fieldExecution: {
      modelAction: "Em bước chậm về phía trước 2 bước rồi quay người lại mỉm cười, tay đưa lên vén nhẹ tóc theo gió nhé!",
      photographerCue: "Lùi xa 3.5m, chuyển chế độ chụp liên tục (burst mode), giữ máy ngang ngực và di chuyển nhẹ theo nhịp bước của mẫu.",
      negativeSpaceTip: "Khoảng không gian phía trước hướng nhìn (lead room) cần rộng gấp đôi phía sau để tạo chiều sâu.",
      difficulty: "CẦN_DẺO",
      commonMistake: "Mẫu bước quá nhanh hoặc cúi mặt nhìn đất; nhắc mẫu luôn giữ cằm cao và mắt nhìn ngang tầm mắt người đối diện.",
    },
    visualPoseWireframe: {
      headTiltDeg: 15,
      torsoAngleDeg: 35,
      weightFoot: "balanced",
      silhouetteShape: "Diagonal",
      armPositionSummary: "Hai tay chuyển động nhẹ nhàng, một tay che nắng/vén tóc",
      keyPointsSummary: [
        "Đường chéo động tạo cảm giác chuyển động tự nhiên",
        "Không gian thở phía trước hướng nhìn rộng rãi",
        "Tư thế phi đối xứng tạo phong cách hiện đại",
      ],
    },
    imagePrompt: `Realistic environmental portrait photography of a ${gender === "nam" ? "young man" : "young woman"} in ${concept}, Level 3 creative pose variation with candid motion, wind in hair, natural movement, warm golden hour lighting, clean bokeh background, no watermark, no text, realistic photography.`,
  };
}
