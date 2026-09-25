import type { PhotographerContext, PoseAnalysisData } from "../types/index";

export interface BuildPromptParams {
  poseTitle?: string;
  category?: string;
  contextNotes?: string;
  context?: PhotographerContext;
}

export function buildPoseAdvisorPrompt(params: BuildPromptParams): string {
  const { poseTitle, category, contextNotes, context } = params;

  const cameraContextText = context?.cameraModel
    ? `- Máy ảnh người dùng cung cấp: ${context.cameraModel}`
    : "- Thiết bị máy ảnh: Người dùng KHÔNG cung cấp metadata thiết bị.";

  const lensContextText = context?.lens
    ? `- Ống kính người dùng cung cấp: ${context.lens}`
    : "- Ống kính: Người dùng KHÔNG cung cấp lens cụ thể.";

  const focalLengthText = context?.focalLength
    ? `- Tiêu cự người dùng cung cấp: ${context.focalLength}`
    : "- Tiêu cự: KHÔNG CÓ DỮ LIỆU METADATA. Bạn KHÔNG ĐƯỢC tự bịa tiêu cự chính xác (như 50mm, 85mm). Hãy chỉ đánh giá perspective tương đối (WIDE / NORMAL / TELEPHOTO) và ghi chú 'Không đủ dữ liệu xác định tiêu cự chính xác từ ảnh'.";

  const envText = context?.environment
    ? `- Môi trường chụp: ${
        context.environment === "outdoor"
          ? "Ngoài trời"
          : context.environment === "indoor"
          ? "Trong nhà"
          : "Studio"
      }`
    : "- Môi trường chụp: Quan sát từ bức ảnh.";

  const timeText = context?.timeOfDay
    ? `- Thời gian / Ánh sáng dự kiến: ${context.timeOfDay}`
    : "";

  const conceptText = context?.concept
    ? `- Concept người dùng hướng tới: ${context.concept}`
    : "";

  const outfitText = context?.outfit
    ? `- Trang phục người dùng mô tả: ${context.outfit}`
    : "";

  const peopleCountText = context?.peopleCount
    ? `- Số lượng người trong ảnh: ${context.peopleCount}`
    : "";

  const photoGoalText = context?.photoGoal
    ? `- Mục tiêu bức ảnh: ${context.photoGoal}`
    : "";

  const generalNotes = contextNotes ? `- Ghi chú thêm từ hiện trường: "${contextNotes}"` : "";

  return `
Bạn là TRỢ LÝ NHIẾP ẢNH THỰC CHIẾN TẠI HIỆN TRƯỜNG & GIÁM ĐỐC NGHỆ THUẬT (Art Director) hàng đầu.
Nhiệm vụ của bạn là AUDIT bức ảnh vừa chụp và đưa ra CHỈ DẪN HÀNH ĐỘNG CỤ THỂ, TRỰC DIỆN ĐỂ SỬA NGAY TẠI CÚ BẤM MÁY TIẾP THEO.

BỐI CẢNH BUỔI CHỤP:
- Tư thế tham chiếu: "${poseTitle || "Chụp tự do / Thực chiến"}"
- Chuyên mục: "${category || "Chung"}"
${cameraContextText}
${lensContextText}
${focalLengthText}
${envText}
${timeText ? timeText + "\n" : ""}${conceptText ? conceptText + "\n" : ""}${outfitText ? outfitText + "\n" : ""}${peopleCountText ? peopleCountText + "\n" : ""}${photoGoalText ? photoGoalText + "\n" : ""}${generalNotes ? generalNotes + "\n" : ""}

NGUYÊN TẮC THỰC CHIẾN BẮT BUỘC:
1. KHÔNG DÙNG LỜI KHUYÊN CHUNG CHUNG / SÁO RỖNG:
   Tuyệt đối cấm các câu như: "hãy tạo dáng tự nhiên", "hãy sử dụng ánh sáng mềm", "hãy tạo cảm giác điện ảnh".
   Mỗi lời khuyên PHẢI là MỘT HÀNH ĐỘNG VẬT LÝ CỤ THỂ (ví dụ: "xoay vai trái 25 độ về phía ánh sáng", "hạ máy ngang thắt lưng mẫu khoảng 20cm", "khép 3 ngón tay giữa lại chỉ chạm nhẹ đốt đầu ngón tay vào quai áo").

2. NGUYÊN TẮC KHÔNG ẢO TƯỞNG (ZERO HALLUCINATION):
   Nếu người dùng không cung cấp metadata máy ảnh/lens, TUYỆT ĐỐI KHÔNG tự bịa khẩu độ (f/1.8, f/2.8), tốc độ màn trập (1/250s), ISO (100, 400), White Balance hay model máy.
   Với tiêu cự: chỉ nhận định perspective là [GÓC RỘNG - WIDE] / [CHUẨN - NORMAL] / [TELÊ - TELEPHOTO], và nêu rõ không có metadata để xác định số mm chính xác.
   Khuyến nghị thiết bị chỉ dựa trên nguyên lý quang học (ví dụ: chân dung cận cảnh nên dùng NORMAL/SHORT TELE để tránh méo góc; chụp toàn thân/nhóm dùng WIDE/NORMAL tùy không gian).

3. ĐÁNH GIÁ (SCORE RATING):
   Không chấm điểm số 1-10 nghệ thuật cảm tính. Bắt buộc dùng 4 tiêu chí chuẩn hóa:
   - Posing: chỉ chọn 1 trong 3 giá trị: "TỐT" | "CẦN SỬA" | "CẦN CHỈNH NHIỀU"
   - Composition: chỉ chọn 1 trong 2 giá trị: "TỐT" | "CẦN SỬA"
   - Expression: chỉ chọn 1 trong 3 giá trị: "TỰ NHIÊN" | "HƠI GƯỢNG" | "GƯỢNG"
   - Technical risk: chỉ chọn 1 trong 3 giá trị: "THẤP" | "TRUNG BÌNH" | "CAO"

4. 3 SỬA ĐỔI NGAY Ở CÚ BẤM TIẾP THEO (QUAN TRỌNG NHẤT):
   Đúng 3 hành động có tác động mạnh mẽ nhất đến chất lượng ảnh tiếp theo.
   Mỗi hành động phải tách bạch rõ ràng:
   - MẪU: hành động tư thế / cơ thể cụ thể của mẫu
   - MÁY: hành động điều chỉnh góc / khoảng cách / vị trí của thợ ảnh
   - KẾT QUẢ: hiệu quả thị giác đạt được

5. NẾU CHỤP LẠI (3-SECOND RULE):
   1 câu chỉ dẫn cực ngắn, súc tích để photographer liếc đọc và hô cho mẫu trong vòng 3 giây!

ĐỊNH DẠNG TRẢ VỀ:
Hãy trả về JSON thuần túy (không bọc trong ký tự thừa ngoài JSON hợp lệ) theo cấu trúc schema sau:
{
  "quickSummary": "Nhận định ngắn gọn 1-2 câu về tình trạng bức ảnh hiện tại.",
  "threeSecondRule": "Một câu chỉ dẫn ngắn nhất để photographer đọc to cho mẫu trong 3 giây.",
  "scores": {
    "posing": "TỐT" hoặc "CẦN SỬA" hoặc "CẦN CHỈNH NHIỀU",
    "composition": "TỐT" hoặc "CẦN SỬA",
    "expression": "TỰ NHIÊN" hoặc "HƠI GƯỢNG" hoặc "GƯỢNG",
    "technicalRisk": "THẤP" hoặc "TRUNG BÌNH" hoặc "CAO"
  },
  "issues": {
    "model": "Điểm cần sửa cụ thể ở mẫu (tư thế, vai, ngón tay, mắt, góc mặt...)",
    "camera": "Điểm cần sửa ở máy (chiều cao, góc nghiêng, khoảng cách, framing...)",
    "lighting": "Điểm cần sửa ở ánh sáng (cháy sáng, bóng đổ gắt trên mặt, hướng sáng...)"
  },
  "immediateFixes": [
    {
      "id": 1,
      "title": "Tên chỉnh sửa cốt lõi #1",
      "modelAction": "Hành động cụ thể cho mẫu...",
      "cameraAction": "Hành động cụ thể cho máy ảnh...",
      "result": "Hiệu quả thị giác đạt được..."
    },
    {
      "id": 2,
      "title": "Tên chỉnh sửa cốt lõi #2",
      "modelAction": "Hành động cụ thể cho mẫu...",
      "cameraAction": "Hành động cụ thể cho máy ảnh...",
      "result": "Hiệu quả thị giác đạt được..."
    },
    {
      "id": 3,
      "title": "Tên chỉnh sửa cốt lõi #3",
      "modelAction": "Hành động cụ thể cho mẫu...",
      "cameraAction": "Hành động cụ thể cho máy ảnh...",
      "result": "Hiệu quả thị giác đạt được..."
    }
  ],
  "camera": {
    "height": "Chiều cao đặt máy (ví dụ: ngang tầm mắt, ngang ngực mẫu, ngang hông, thấp hơn đầu gối 15cm)",
    "direction": "Hướng máy (chính diện, chếch 30-45 độ, hất nhẹ lên 5 độ, v.v.)",
    "framing": "Khung hình (toàn thân, bán thân trên đùi, cận cảnh ngực, cận cảnh mặt)",
    "perspective": "Perspective quan sát (WIDE / NORMAL / TELEPHOTO)",
    "focalLengthNote": "Ghi chú tiêu cự (Nêu rõ nếu không có metadata, nhận định qua độ nén hậu cảnh)",
    "recommendation": "Gợi ý tiêu cự/khoảng cách theo nguyên lý quang học cho thể loại này"
  },
  "lighting": {
    "direction": "Hướng sáng chính (thuận sáng, ngược sáng, xiên 45 độ, sáng trên đỉnh đầu...)",
    "quality": "Chất lượng sáng (Ánh sáng gắt / Ánh sáng tán xạ / Sáng khuất bóng)",
    "highlightsShadows": "Vùng cháy sáng hoặc tối sạm (highlight clipping / shadow crush trên da mặt)",
    "backgroundImpact": "Tác động của hậu cảnh (sáng hơn mẫu làm tối mặt, hay tối hơn mẫu nổi bật)"
  },
  "composition": {
    "subjectPosition": "Vị trí chủ thể (quy tắc 1/3, trung tâm, lệch trái/phải)",
    "headroomLeadroom": "Headroom (khoảng không trên đầu) và Lead room (khoảng trống theo hướng nhìn)",
    "backgroundDistraction": "Chi tiết gây rối hậu cảnh (cột điện xuyên đầu, vật thể sáng lạc quẻ)",
    "cropBalance": "Độ hợp lý của vết cắt (không cắt qua khớp ngón tay/đầu gối/mắt cá chân)"
  },
  "subjectPosingDetails": {
    "subject": "Số lượng người, trang phục, tỷ lệ cơ thể trong khung hình",
    "headNeck": "Độ nghiêng của đầu, khoảng cách giữa cằm và cổ",
    "shouldersBack": "Độ xoay của vai, độ thẳng của lưng",
    "armsHands": "Vị trí khuỷu tay, khoảng trống giữa tay và thân eo, dáng bàn tay/ngón tay",
    "hipsLegs": "Trọng tâm cơ thể dồn vào chân nào, dáng đứng/ngồi, đường cong cơ thể",
    "gazeExpression": "Hướng nhìn ánh mắt và độ thả lỏng khẩu hình miệng"
  },
  "markdown": "Nội dung tổng hợp dạng Markdown chuẩn format để đọc nhanh và copy."
}
`;
}

export function generateMarkdownFromAnalysis(data: Partial<PoseAnalysisData>): string {
  const fixesText = (data.immediateFixes || [])
    .map(
      (fix, idx) =>
        `### [AI CHỈNH NGAY #${idx + 1}] ${fix.title || ""}\n` +
        `- **MẪU**: ${fix.modelAction}\n` +
        `- **MÁY**: ${fix.cameraAction}\n` +
        `- **KẾT QUẢ**: ${fix.result}`
    )
    .join("\n\n");

  return `## NHẬN ĐỊNH NHANH
${data.quickSummary || "Đã phân tích tư thế hiện trường."}

## ĐÁNH GIÁ THỰC CHIẾN
- **Tư thế (Posing)**: ${data.scores?.posing || "CẦN SỬA"}
- **Bố cục (Composition)**: ${data.scores?.composition || "TỐT"}
- **Biểu cảm (Expression)**: ${data.scores?.expression || "TỰ NHIÊN"}
- **Rủi ro kỹ thuật**: ${data.scores?.technicalRisk || "TRUNG BÌNH"}

## ĐIỂM CẦN SỬA
- **Mẫu**: ${data.issues?.model || "Cần điều chỉnh tư thế tay và hướng mặt."}
- **Máy**: ${data.issues?.camera || "Cần chỉnh lại góc máy và độ cao."}
- **Ánh sáng**: ${data.issues?.lighting || "Cần chú ý hướng ánh sáng vào mặt."}

## 3 THAY ĐỔI CHO CÚ BẤM TIẾP THEO
${fixesText || "1. Điều chỉnh góc máy và tư thế mẫu."}

## GÓC MÁY
- **Chiều cao (Height)**: ${data.camera?.height || "Ngang tầm ngực"}
- **Hướng máy (Direction)**: ${data.camera?.direction || "Chếch 30 độ"}
- **Khung hình (Framing)**: ${data.camera?.framing || "Bán thân"}
- **Tiêu cự**: ${data.camera?.focalLengthNote || "Không đủ dữ liệu xác định tiêu cự chính xác từ ảnh"}
- **Khuyến nghị**: ${data.camera?.recommendation || "NORMAL / SHORT TELE"}

## ÁNH SÁNG
- **Hướng sáng**: ${data.lighting?.direction || "Ánh sáng tự nhiên"}
- **Chất lượng sáng**: ${data.lighting?.quality || "Tán xạ"}
- **Chi tiết bóng & cháy sáng**: ${data.lighting?.highlightsShadows || "Chưa phát hiện cháy sáng nghiêm trọng"}

## NẾU CHỤP LẠI
**"${data.threeSecondRule || "Thả lỏng vai, mắt nhìn theo hướng 2 giờ và hạ máy ngang ngực!"}"**`;
}

export function parsePoseAdvisorResponse(rawText: string): {
  structured: PoseAnalysisData;
  markdown: string;
} {
  let cleaned = rawText.trim();

  // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Attempt regex extraction of first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }

  // Fallback defaults if parsing is partial or failed
  const defaultScores = {
    posing: "CẦN SỬA" as const,
    composition: "TỐT" as const,
    expression: "TỰ NHIÊN" as const,
    technicalRisk: "TRUNG BÌNH" as const,
  };

  if (!parsed || typeof parsed !== "object") {
    // Return structured object wrapping the raw text
    const fallbackData: PoseAnalysisData = {
      quickSummary: rawText.slice(0, 160),
      threeSecondRule: "Hạ máy ngang ngực, thả lỏng vai và giữ tư thế mềm mại!",
      scores: defaultScores,
      issues: {
        model: "Cần tinh chỉnh độ mềm mại bàn tay và hướng mặt.",
        camera: "Cân đối lại khoảng cách và đường chân trời.",
        lighting: "Chú ý hướng nguồn sáng chiếu lên gương mặt.",
      },
      immediateFixes: [
        {
          id: 1,
          title: "Góc nghiêng vai & cơ thể",
          modelAction: "Xoay vai tạo góc 30 độ so với ống kính, dồn trọng tâm về chân sau.",
          cameraAction: "Hạ máy xuống ngang ngực thay vì chụp chúc từ trên xuống.",
          result: "Tạo đường cong chữ S tự nhiên và thu gọn vóc dáng.",
        },
        {
          id: 2,
          title: "Thả lỏng bàn tay & ngón tay",
          modelAction: "Các ngón tay khép hờ tự nhiên, chỉ chạm nhẹ đầu ngón vào tà áo/tóc.",
          cameraAction: "Giữ khung hình có khoảng thở bên hướng nhìn của mẫu.",
          result: "Tránh tạo cảm giác cứng đơ hay nắm chặt tay vụng về.",
        },
        {
          id: 3,
          title: "Tối ưu ánh sáng gương mặt",
          modelAction: "Nâng cằm nhẹ 10 độ hướng về phía nguồn sáng phụ.",
          cameraAction: "Bấm đo sáng vào vùng da mặt (Face Metering) để tránh tối mặt.",
          result: "Khuôn mặt sáng rõ, có catchlight trong mắt.",
        },
      ],
      camera: {
        height: "Ngang tầm ngực mẫu",
        direction: "Chếch 30 độ",
        framing: "Bán thân (Medium shot)",
        perspective: "Perspective tương đương NORMAL",
        focalLengthNote: "Không đủ dữ liệu xác định tiêu cự chính xác chỉ từ ảnh chụp",
        recommendation: "Khuyến nghị góc NORMAL / SHORT TELE (tiêu cự chuẩn cho chân dung) để hạn chế méo hình",
      },
      lighting: {
        direction: "Ánh sáng tự nhiên từ một bên",
        quality: "Ánh sáng khuếch tán vừa phải",
        highlightsShadows: "Tương phản chấp nhận được, không bị cháy sáng",
        backgroundImpact: "Hậu cảnh sáng tương đồng với chủ thể",
      },
      composition: {
        subjectPosition: "Chủ thể nằm ở trục 1/3",
        headroomLeadroom: "Headroom vừa phải, có không gian mở",
        backgroundDistraction: "Không có vật cản lớn gây mất tập trung",
        cropBalance: "Crop an toàn qua phần hông",
      },
      markdown: rawText,
    };

    return {
      structured: fallbackData,
      markdown: generateMarkdownFromAnalysis(fallbackData),
    };
  }

  // Sanitize scores
  const posingScore = ["TỐT", "CẦN SỬA", "CẦN CHỈNH NHIỀU"].includes(parsed.scores?.posing)
    ? parsed.scores.posing
    : "CẦN SỬA";
  const compScore = ["TỐT", "CẦN SỬA"].includes(parsed.scores?.composition)
    ? parsed.scores.composition
    : "TỐT";
  const exprScore = ["TỰ NHIÊN", "HƠI GƯỢNG", "GƯỢNG"].includes(parsed.scores?.expression)
    ? parsed.scores.expression
    : "TỰ NHIÊN";
  const techScore = ["THẤP", "TRUNG BÌNH", "CAO"].includes(parsed.scores?.technicalRisk)
    ? parsed.scores.technicalRisk
    : "TRUNG BÌNH";

  // Sanitize immediateFixes: Ensure 3 items
  let fixes: any[] = Array.isArray(parsed.immediateFixes) ? parsed.immediateFixes : [];
  if (fixes.length === 0) {
    fixes = [
      {
        id: 1,
        title: "Tư thế vai & đường cong cơ thể",
        modelAction: "Xoay nhẹ vai 30 độ, dồn trọng tâm về chân sau.",
        cameraAction: "Giữ máy ngang ngực mẫu.",
        result: "Tạo vóc dáng thanh thoát, tự nhiên hơn.",
      },
      {
        id: 2,
        title: "Thả lỏng bàn tay",
        modelAction: "Thả lỏng ngón tay, chạm nhẹ nhàng không dùng lực.",
        cameraAction: "Lùi 1 bước để lấy trọn vẹn cử chỉ.",
        result: "Tránh bàn tay bị thô hay gượng gạo.",
      },
      {
        id: 3,
        title: "Bắt sáng gương mặt",
        modelAction: "Nâng cằm 5 độ về hướng sáng.",
        cameraAction: "Khóa nét vào mắt gần máy ảnh nhất.",
        result: "Mắt sáng có catchlight rõ nét.",
      },
    ];
  }

  const structuredData: PoseAnalysisData = {
    quickSummary:
      parsed.quickSummary ||
      "Bức ảnh có nền tảng tốt, cần tinh chỉnh một số chi tiết tư thế và góc máy để đạt hiệu quả cao nhất.",
    threeSecondRule:
      parsed.threeSecondRule ||
      "Thả lỏng vai, mắt nhìn theo hướng 2 giờ và giữ máy ngang ngực!",
    scores: {
      posing: posingScore,
      composition: compScore,
      expression: exprScore,
      technicalRisk: techScore,
    },
    issues: {
      model: parsed.issues?.model || "Cần điều chỉnh tư thế vai và thả lỏng ngón tay.",
      camera: parsed.issues?.camera || "Cần căn chỉnh chiều cao máy phù hợp với vóc dáng.",
      lighting: parsed.issues?.lighting || "Cần lưu ý hướng ánh sáng chiếu vào gương mặt.",
    },
    immediateFixes: fixes.slice(0, 3).map((f, i) => ({
      id: i + 1,
      title: f.title || `Chỉnh sửa #${i + 1}`,
      modelAction: f.modelAction || "Thả lỏng cơ thể tự nhiên.",
      cameraAction: f.cameraAction || "Giữ góc máy ổn định.",
      result: f.result || "Hình ảnh hài hòa hơn.",
    })),
    camera: {
      height: parsed.camera?.height || "Ngang tầm ngực mẫu",
      direction: parsed.camera?.direction || "Chếch 30 độ",
      framing: parsed.camera?.framing || "Bán thân",
      perspective: parsed.camera?.perspective || "NORMAL",
      focalLengthNote:
        parsed.camera?.focalLengthNote ||
        "Không đủ dữ liệu xác định tiêu cự chính xác chỉ từ ảnh chụp (không có metadata)",
      recommendation:
        parsed.camera?.recommendation ||
        "Chân dung / Bán thân nên ưu tiên tiêu cự NORMAL đến SHORT TELE để hạn chế méo góc",
    },
    lighting: {
      direction: parsed.lighting?.direction || "Ánh sáng tự nhiên một bên",
      quality: parsed.lighting?.quality || "Ánh sáng khuếch tán",
      highlightsShadows: parsed.lighting?.highlightsShadows || "Bóng đổ hài hòa",
      backgroundImpact: parsed.lighting?.backgroundImpact || "Tách bạch tốt khỏi hậu cảnh",
    },
    composition: {
      subjectPosition: parsed.composition?.subjectPosition || "Trục 1/3 mắt nhìn",
      headroomLeadroom: parsed.composition?.headroomLeadroom || "Headroom vừa vặn",
      backgroundDistraction: parsed.composition?.backgroundDistraction || "Hậu cảnh gọn gàng",
      cropBalance: parsed.composition?.cropBalance || "Crop hợp lý",
    },
    subjectPosingDetails: parsed.subjectPosingDetails || undefined,
    markdown: parsed.markdown || "",
  };

  if (!structuredData.markdown) {
    structuredData.markdown = generateMarkdownFromAnalysis(structuredData);
  }

  return {
    structured: structuredData,
    markdown: structuredData.markdown,
  };
}
