import { VisualIdeaLocation, VisualIdeaItem } from "../types";

export const INITIAL_VISUAL_LOCATIONS: VisualIdeaLocation[] = [
  {
    id: "loc-garden",
    name: "Sân Vườn & Cây Xanh",
    shortName: "Sân Vườn",
    coverImage:
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",
    description: "Không gian xanh mát, ánh nắng xuyên qua kẽ lá, bầu không khí thơ mộng",
    tags: ["Thơ mộng", "Nàng thơ", "Hoa lá", "Tự nhiên"],
    totalIdeas: 3,
  },
  {
    id: "loc-street",
    name: "Đường Phố & Phố Cổ",
    shortName: "Đường Phố",
    coverImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    description: "Bức tường vàng, ngõ nhỏ rêu phong, nhịp sống đô thị hiện đại hoặc hoài cổ",
    tags: ["Cá tính", "Phố cổ", "Streetwear", "Điện ảnh"],
    totalIdeas: 3,
  },
  {
    id: "loc-cafe",
    name: "Quán Cafe & Không Gian Chill",
    shortName: "Quán Cafe",
    coverImage:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    description: "Bàn gỗ, ánh sáng ấm, ly cafe thơm và những góc ban công nhìn xuống phố",
    tags: ["Ấm cúng", "Thanh lịch", "Đời thường", "Đọc sách"],
    totalIdeas: 3,
  },
  {
    id: "loc-rooftop",
    name: "Sân Thượng & Hoàng Hôn",
    shortName: "Sân Thượng",
    coverImage:
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80",
    description: "Không gian mở khoáng đạt, đón trọn giờ vàng hoàng hôn và ánh đèn thành phố",
    tags: ["Golden Hour", "Tự do", "Skyline", "Gió lộng"],
    totalIdeas: 3,
  },
  {
    id: "loc-forest",
    name: "Rừng Thông & Thiên Nhiên",
    shortName: "Rừng Thông",
    coverImage:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    description: "Hàng thông cao vút, thảm cỏ sương mai, cảm giác thanh tịnh và phiêu lưu",
    tags: ["Đà Lạt vibe", "Du mục", "Sương mờ", "Bình yên"],
    totalIdeas: 3,
  },
  {
    id: "loc-studio",
    name: "Studio Nghệ Thuật Tối Giản",
    shortName: "Studio",
    coverImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    description: "Phông nền đơn sắc, kiểm soát ánh sáng chuẩn xác, tôn vinh tối đa hình thể và biểu cảm",
    tags: ["Tối giản", "Tạp chí", "High Fashion", "Chân dung"],
    totalIdeas: 3,
  },
  {
    id: "loc-beach",
    name: "Biển & Bờ Hồ Yên Bình",
    shortName: "Biển & Hồ",
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    description: "Sóng vỗ nhẹ, bãi cát trải dài, gió biển bay tóc và mặt nước lấp lánh",
    tags: ["Mùa hè", "Phóng khoáng", "Nắng vàng", "Maxi"],
    totalIdeas: 2,
  },
  {
    id: "loc-school",
    name: "Trường Học & Thư Viện",
    shortName: "Trường Học",
    coverImage:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
    description: "Hành lang lớp học đầy nắng, giá sách gỗ cổ kính, góc sân trường đầy kỷ niệm",
    tags: ["Thanh xuân", "Học đường", "Kỷ yếu", "Trong sáng"],
    totalIdeas: 2,
  },
];

export const INITIAL_VISUAL_IDEAS: VisualIdeaItem[] = [
  // --- LOC: SÂN VƯỜN ---
  {
    id: "idea-garden-1",
    locationId: "loc-garden",
    title: "Nàng Thơ Bên Hoa Hồng & Nắng Xuyên Kẽ Lá",
    tagline: "Vẻ đẹp thuần khiết, trong trẻo như giọt sương sớm",
    coverImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Váy trắng xoè nhẹ, đầm voan pastel, tóc buông lơi tự nhiên",
    propsSuggestion: "Bó hoa hồng trắng, nón cói mộc mạc, giỏ đan lát tre",
    timeOfDaySuggestion: "Nắng sớm 7h00 - 8h30 hoặc chiều tà 16h30",
    lightingStyle: "Ánh sáng tự nhiên mềm mại khuếch tán qua tán lá",
    keyPoses: [
      "Đứng nghiêng 45 độ, một tay nâng nhẹ cánh hoa gần mặt, mắt nhắm hờ tận hưởng",
      "Ngồi trên thảm cỏ, hai chân co nhẹ sang một bên, tay chống nhẹ ra sau",
      "Bước chậm ngang qua giàn hoa, đầu ngoảnh lại nhìn máy ảnh cười mỉm",
      "Chụp cận mặt dùng hoa che một phần mắt tạo hiệu ứng khung viền",
    ],
  },
  {
    id: "idea-garden-2",
    locationId: "loc-garden",
    title: "Buổi Dã Ngoại Picnic Thư Thái Giữa Thảm Cỏ",
    tagline: "Khoảnh khắc tận hưởng nhịp sống chậm rãi cùng thiên nhiên",
    coverImage:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Váy kẻ caro gingham, áo sơ mi đũi sáng màu, nón cói boater",
    propsSuggestion: "Khăn trải picnic caro, giỏ mây, vài cuốn sách vintage, đĩa trái cây tươi",
    timeOfDaySuggestion: "Chiều 15h30 - 17h00 (nắng vàng dịu)",
    lightingStyle: "Nắng vàng xiên ấm áp",
    keyPoses: [
      "Nằm sấp trên thảm, hai chân bắt chéo gập lên cao, tay chống cằm đọc sách",
      "Ngồi xếp bằng tự nhiên, hai tay cầm ly nước mát hoặc quả táo, mắt cười rạng rỡ",
      "Nằm ngửa thả lỏng, tóc xòe đều trên nền cỏ xanh, góc chụp từ trên thẳng xuống",
    ],
  },
  {
    id: "idea-garden-3",
    locationId: "loc-garden",
    title: "Đón Gió Bên Hàng Rào Gỗ Trắng",
    tagline: "Nét mộc mạc như bước ra từ một trang tiểu thuyết đồng quê",
    coverImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    mood: "Cổ điển",
    outfitSuggestion: "Váy linen nâu be hoặc xanh rêu nhạt, sandal da quai mảnh",
    propsSuggestion: "Túi vải canvas, bình tưới cây kim loại cổ điển",
    timeOfDaySuggestion: "Sáng sớm mát mẻ hoặc chiều tà",
    lightingStyle: "Ánh sáng phản chiếu mềm mại",
    keyPoses: [
      "Đứng tựa lưng nhẹ vào hàng rào gỗ, hai tay đặt ra phía sau bờ rào",
      "Một tay vịn cọc rào, thân người hơi nghiêng về phía trước, chân trước chùng nhẹ",
      "Đi dọc theo hàng rào, một tay lướt nhẹ ngón tay trên đỉnh các thanh gỗ",
    ],
  },

  // --- LOC: ĐƯỜNG PHỐ & PHỐ CỔ ---
  {
    id: "idea-street-1",
    locationId: "loc-street",
    title: "Streetwear Năng Động Giữa Ngã Tư Hiện Đại",
    tagline: "Thần thái tự tin, phóng khoáng của cô gái đô thị",
    coverImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    mood: "Cá tính",
    outfitSuggestion: "Áo blazer oversize, quần ống rộng, sneaker khỏe khoắn, kính mát",
    propsSuggestion: "Cốc cà phê mang đi (take-away), túi đeo chéo mini",
    timeOfDaySuggestion: "Ban ngày ánh sáng gắt tương phản mạnh hoặc xế chiều",
    lightingStyle: "Ánh sáng tương phản đô thị rõ nét",
    keyPoses: [
      "Bước sải dài qua vạch kẻ đường, áo khoác bay nhẹ, đầu nhìn chếch theo hướng đi",
      "Đứng tựa một chân vào cột đèn hoặc tường bê tông, một tay đút túi quần",
      "Kéo nhẹ kính mát xuống sống mũi, ánh mắt nhìn thẳng sắc sảo vào ống kính",
      "Ngồi trên bậc thềm toà nhà hiện đại, chân duỗi chân co tạo đường chéo khoẻ khoắn",
    ],
  },
  {
    id: "idea-street-2",
    locationId: "loc-street",
    title: "Hoài Niệm Phố Cổ Tường Vàng Rêu Phong",
    tagline: "Vẻ đẹp tĩnh lặng, nét thanh lịch Á Đông giữa nhịp phố thăng trầm",
    coverImage:
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=600&q=80",
    mood: "Cổ điển",
    outfitSuggestion: "Áo dài truyền thống lụa tơ tằm hoặc áo dài cách tân màu nhã nhặn",
    propsSuggestion: "Chiếc nón lá, túi mây đan tròn, nhành hoa sen hoặc hoa cúc",
    timeOfDaySuggestion: "Sáng 7h - 9h khi phố còn vắng người qua lại",
    lightingStyle: "Ánh sáng phản chiếu từ bức tường vàng ấm cúng",
    keyPoses: [
      "Đứng nép bên khung cửa gỗ cổ, hai bàn tay nhẹ nhàng đan trước bụng",
      "Dạo bước chầm chậm bên bức tường vàng loang lổ rêu xanh, tà áo thướt tha",
      "Nghiêng đầu e ấp, một tay giữ nhẹ vành nón lá, mắt nhìn hướng 4 giờ",
    ],
  },
  {
    id: "idea-street-3",
    locationId: "loc-street",
    title: "Điện Ảnh Hong Kong Thập Niên 90 Chiều Tối",
    tagline: "Ánh đèn neon mơ ảo và những suy tư lắng đọng",
    coverImage:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
    mood: "Điện ảnh",
    outfitSuggestion: "Áo khoác da, đầm đỏ nhung hoặc áo sơ mi lụa cổ mở phóng khoáng",
    propsSuggestion: "Ô trong suốt dưới mưa, máy ảnh film cơ vintage",
    timeOfDaySuggestion: "Chạng vạng tối (Blue hour) khi đèn phố vừa bật",
    lightingStyle: "Ánh sáng màu hỗn hợp từ bảng hiệu neon và đèn xe",
    keyPoses: [
      "Đứng dưới ánh đèn rọi ngõ hẻm, khói sương mờ ảo, nhìn xa xăm không cảm xúc",
      "Ngồi thu mình ở quán ăn lề đường, một tay đỡ cằm, nửa mặt đón vệt sáng đỏ",
      "Ngoảnh lại nhìn máy ảnh giữa dòng người mờ ảo di chuyển vội vã",
    ],
  },

  // --- LOC: QUÁN CAFE ---
  {
    id: "idea-cafe-1",
    locationId: "loc-cafe",
    title: "Góc Bàn Cửa Sổ & Trang Sách Chiều Mưa",
    tagline: "Khoảnh khắc bình yên và ấm áp bên tách trà nóng",
    coverImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Áo len cardigan mềm màu be/kem, áo thun trắng, tóc kẹp càng cua",
    propsSuggestion: "Tách cafe gốm nóng bốc khói, cuốn sách đang mở dở, cặp kính tròn",
    timeOfDaySuggestion: "Buổi chiều 14h - 16h hoặc ngày mưa",
    lightingStyle: "Ánh sáng cửa sổ tạt ngang dịu dàng (Window lighting)",
    keyPoses: [
      "Hai bàn tay áp nhẹ quanh thành cốc cafe cảm nhận hơi ấm, mắt nhìn ra cửa kính",
      "Tựa cằm lên một bàn tay, tay kia lật nhẹ trang sách, mỉm cười nhẹ",
      "Chụp từ ngoài qua lớp kính cửa sổ có phản chiếu vệt nước hoặc cây xanh",
    ],
  },
  {
    id: "idea-cafe-2",
    locationId: "loc-cafe",
    title: "Tone Hàn Quốc Tối Giản Tone Gỗ Trắng",
    tagline: "Thanh lịch, hiện đại, hình ảnh tinh tế chuẩn Instagram",
    coverImage:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Áo sơ mi trắng form rộng, quần tây ống đứng be, phụ kiện bạc tinh tế",
    propsSuggestion: "Ly nước cam/matcha nhiều tầng màu, laptop hoặc máy tính bảng",
    timeOfDaySuggestion: "Sáng 9h00 - 11h00 khi ánh sáng tự nhiên đầy phòng",
    lightingStyle: "Ánh sáng trắng sáng ngập tràn, ít bóng đổ",
    keyPoses: [
      "Ngồi thẳng lưng tự nhiên, một tay vuốt tóc mai, tay kia đặt hờ trên đùi",
      "Đưa ly nước lên gần môi chuẩn bị uống, mắt nhìn chếch ống kính cười tươi",
      "Đứng cạnh chậu cây xanh trong quán, vai mở nhẹ, dáng đứng thư thái",
    ],
  },
  {
    id: "idea-cafe-3",
    locationId: "loc-cafe",
    title: "Ban Công Cổ Điển Nhìn Xuống Ngã Tư Phố",
    tagline: "Góc nhìn bao quát, vẻ thư thái đón nhận nhịp sống thành phố",
    coverImage:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
    mood: "Cổ điển",
    outfitSuggestion: "Đầm họa tiết hoa nhí phong cách Pháp, mũ nồi beret",
    propsSuggestion: "Chiếc máy ảnh film nhỏ gọn đeo cổ, đĩa bánh ngọt croissant",
    timeOfDaySuggestion: "Hoàng hôn 17h00 khi ánh nắng buông xuống mái ngói",
    lightingStyle: "Ánh sáng ngược ấm áp tạo viền vàng trên tóc",
    keyPoses: [
      "Hai khuỷu tay tựa lên lan can sắt uốn, lưng cong tự nhiên, ngắm nhìn phố",
      "Xoay người lại hướng ống kính, lưng dựa lan can, tay nâng nhẹ vạt váy",
      "Ngồi vắt chéo chân ở ghế sắt ngoài trời, nhấp ngụm trà chiều thanh lịch",
    ],
  },

  // --- LOC: SÂN THƯỢNG & HOÀNG HÔN ---
  {
    id: "idea-rooftop-1",
    locationId: "loc-rooftop",
    title: "Đón Nắng Vàng Hoàng Hôn (Golden Hour)",
    tagline: "Khoảnh khắc kỳ diệu khi cả bầu trời rực rỡ sắc cam hồng",
    coverImage:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Váy lụa satin bay bổng, đầm hở lưng thanh thoát, tone trắng hoặc vàng cam",
    propsSuggestion: "Gương tròn nhỏ phản chiếu bầu trời, ly rượu vang thủy tinh",
    timeOfDaySuggestion: "Chính xác 17h15 - 17h45 (Golden Hour)",
    lightingStyle: "Ánh sáng vàng mật ong chiếu xiên cực đẹp",
    keyPoses: [
      "Đứng ngược sáng hoàn toàn, hai tay đưa nhẹ lên đón tia nắng lọt qua kẽ ngón tay",
      "Quay người 3/4, mái tóc tung bay trong gió, mắt nhắm hờ tận hưởng làn gió mát",
      "Chụp bóng hình silhouette nổi bật trên nền trời hoàng hôn rực rỡ",
    ],
  },
  {
    id: "idea-rooftop-2",
    locationId: "loc-rooftop",
    title: "Ánh Đèn Thành Phố Về Đêm (City Night Lights)",
    tagline: "Sự quyến rũ, hiện đại của thành phố không ngủ",
    coverImage:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
    mood: "Điện ảnh",
    outfitSuggestion: "Trang phục ánh kim lấp lánh hoặc đen tuyền sang trọng",
    propsSuggestion: "Pháo bông que nhỏ, đèn led dây lung linh",
    timeOfDaySuggestion: "19h00 - 21h00 khi cao ốc lên đèn rực rỡ",
    lightingStyle: "Bokeh đèn thành phố mờ ảo phía hậu cảnh",
    keyPoses: [
      "Tựa vào vách kính sân thượng, nhìn xuống dòng xe cộ lung linh phía dưới",
      "Cầm que pháo bông sáng lung linh trước mặt, ánh lửa soi rọi đôi mắt lấp lánh",
      "Bước đi kiêu kỳ trên nền sân thượng, ánh đèn bokeh tạo hậu cảnh lộng lẫy",
    ],
  },
  {
    id: "idea-rooftop-3",
    locationId: "loc-rooftop",
    title: "Tự Do Phóng Khoáng Bên Bờ Tường Gạch Cũ",
    tagline: "Cảm giác phá cách, tự do thoát khỏi những ồn ã thường nhật",
    coverImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    mood: "Cá tính",
    outfitSuggestion: "Áo croptop, quần jean rách, giày bốt cổ cao, áo khoác denim",
    propsSuggestion: "Ván trượt skateboard, tai nghe chụp tai cỡ lớn",
    timeOfDaySuggestion: "Chiều mát 16h00 - 17h30",
    lightingStyle: "Ánh sáng trời khoáng đạt không bị che chắn",
    keyPoses: [
      "Ngồi trên gờ tường an toàn, một chân duỗi thẳng, hai tay chống sau thoải mái",
      "Đứng thẳng dang rộng hai tay như muốn ôm trọn bầu trời bao la",
      "Dáng ngồi xổm cá tính (crouch pose), ánh mắt mạnh mẽ hướng về ống kính",
    ],
  },

  // --- LOC: RỪNG THÔNG ---
  {
    id: "idea-forest-1",
    locationId: "loc-forest",
    title: "Sương Khói Rừng Thông Sớm Tinh Khôi",
    tagline: "Không gian hư ảo, thanh bình ngỡ như chốn bồng lai",
    coverImage:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Áo dạ măng tô dài, khăn len quàng cổ ấm áp, váy xòe vintage",
    propsSuggestion: "Nhành hoa dã quỳ dại, đèn măng xông cổ điển",
    timeOfDaySuggestion: "Sáng sớm 5h30 - 7h00 khi còn lớp sương mờ bay lơ lửng",
    lightingStyle: "Ánh sáng luồn qua làn sương mù tạo thành các luồng sáng (God rays)",
    keyPoses: [
      "Bước đi chậm rãi giữa hai hàng thông cao vút, người hơi nghiêng đón tia sáng",
      "Tựa lưng nhẹ vào thân cây thông xù xì, hai tay ủ ấm trong túi áo khoác",
      "Ngoảnh lại nhìn máy ảnh với ánh mắt dịu dàng qua lớp sương sớm",
    ],
  },
  {
    id: "idea-forest-2",
    locationId: "loc-forest",
    title: "Phong Cách Du Mục Bohemian Hoang Dã",
    tagline: "Tự do, phóng khoáng hòa nhịp cùng cỏ cây và đất trời",
    coverImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    mood: "Cá tính",
    outfitSuggestion: "Váy maxi họa tiết thổ cẩm bohemian, áo khoác tua rua, bốt da lộn",
    propsSuggestion: "Vòng hoa đội đầu, dreamcatcher, đàn guitar acoustic",
    timeOfDaySuggestion: "Nắng xế 15h00 - 16h30",
    lightingStyle: "Ánh sáng tự nhiên ấm áp len lỏi",
    keyPoses: [
      "Ngồi ôm đàn guitar trên thân cây đổ, các ngón tay lướt nhẹ trên dây đàn",
      "Xoay tròn giữa đồi cỏ, tà váy xòe rộng tung bay tự do",
      "Nằm tựa đầu lên thảm cỏ nhìn lên tán thông xanh thẳm",
    ],
  },
  {
    id: "idea-forest-3",
    locationId: "loc-forest",
    title: "Cắm Trại & Lửa Trại Ấm Áp Buổi Xế",
    tagline: "Cảm giác bình yên bên lều trại và tách trà nghi ngút khói",
    coverImage:
      "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Áo nỉ hoodie ấm, quần yếm kaki, mũ len beanie dễ thương",
    propsSuggestion: "Lều vải vintage màu cát, ấm đun nước dã ngoại, ghế xếp cắm trại",
    timeOfDaySuggestion: "Chiều muộn 16h30 - 18h00",
    lightingStyle: "Ánh lửa vàng ấm áp kết hợp nền trời xanh thẫm",
    keyPoses: [
      "Ngồi trên ghế xếp dã ngoại, hai tay cầm cốc trà nóng đưa lên sưởi ấm má",
      "Ngồi co chân trước cửa lều vải, mỉm cười chào người đối diện",
      "Đứng thổi lửa hoặc chỉnh củi cắm trại một cách tự nhiên candid",
    ],
  },

  // --- LOC: STUDIO ---
  {
    id: "idea-studio-1",
    locationId: "loc-studio",
    title: "Chân Dung Bìa Tạp Chí High-Fashion",
    tagline: "Thần thái sắc sảo, đường nét hình thể dứt khoát và sang trọng",
    coverImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    mood: "Cá tính",
    outfitSuggestion: "Bộ suit đen cá tính, đầm dạ hội bất đối xứng, trang sức kim loại lớn",
    propsSuggestion: "Ghế đẩu studio tối giản (wooden stool), khối hình học trắng",
    timeOfDaySuggestion: "Studio (kiểm soát ánh sáng độc lập bất kỳ lúc nào)",
    lightingStyle: "Ánh sáng cứng (Hard light) tạo bóng đổ sắc nét chuẩn editorial",
    keyPoses: [
      "Ngồi trên ghế đẩu, một chân gác thanh ngang, thân hơi ngả trước, ánh mắt sắc lẹm",
      "Đứng thẳng dồn trọng tâm một chân, một tay chạm nhẹ xương quai xanh, vai mở chéo",
      "Chụp cận mặt góc nghiêng nhấn vào đường viền quai hàm và sống mũi cao",
    ],
  },
  {
    id: "idea-studio-2",
    locationId: "loc-studio",
    title: "Tương Phản Ánh Sáng Nghệ Thuật (Chiaroscuro)",
    tagline: "Vẻ đẹp bí ẩn với sự đối lập mãnh liệt giữa sáng và tối",
    coverImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    mood: "Điện ảnh",
    outfitSuggestion: "Trang phục trơn tối giản, không họa tiết rối mắt",
    propsSuggestion: "Kính chiếu khe sáng, một nhành hoa khô đơn độc",
    timeOfDaySuggestion: "Studio phòng tối",
    lightingStyle: "Nguồn sáng hẹp rọi xiên (Rembrandt / Split lighting)",
    keyPoses: [
      "Nghiêng mặt 45 độ sao cho nguồn sáng vẽ nên tam giác sáng dưới gò má",
      "Dùng bàn tay che hờ một bên mặt, vệt sáng rọi xuyên qua các kẽ ngón tay",
      "Cúi đầu nhẹ rồi từ từ ngước mắt lên nhìn vào nguồn sáng đơn độc",
    ],
  },
  {
    id: "idea-studio-3",
    locationId: "loc-studio",
    title: "Tone Trắng Be Thuần Khiết Trong Trẻo",
    tagline: "Nét tự nhiên nhẹ nhàng, tôn vinh làn da và nụ cười tươi",
    coverImage:
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Áo thun trắng trơn, quần jeans sáng màu hoặc đầm suông be",
    propsSuggestion: "Tấm gương đứng viền cong, vài nhánh hoa tulip tươi",
    timeOfDaySuggestion: "Bất kỳ thời điểm",
    lightingStyle: "Ánh sáng khuếch tán tản đều (Softbox lớn)",
    keyPoses: [
      "Ngồi bệt trên sàn studio, hai tay ôm nhẹ đầu gối, cằm tựa lên gối cười tươi",
      "Đứng nghiêng đầu tự nhiên, hai tay giấu nhẹ sau lưng, mắt nhìn máy ảnh thân thiện",
      "Chụp qua gương phản chiếu với một nụ cười rạng ngời",
    ],
  },

  // --- LOC: BIỂN & HỒ ---
  {
    id: "idea-beach-1",
    locationId: "loc-beach",
    title: "Váy Maxi Đón Gió Biển Phóng Khoáng",
    tagline: "Cảm giác tự do bay bổng giữa tiếng sóng và đại dương xanh thẳm",
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Váy maxi dài chấm gót màu trắng/xanh pastel, chất liệu voan lụa mềm",
    propsSuggestion: "Mũ cói rộng vành mềm, kính râm thời trang",
    timeOfDaySuggestion: "Bình minh 5h30 hoặc hoàng hôn 17h00",
    lightingStyle: "Ánh sáng phản chiếu lung linh từ mặt nước biển",
    keyPoses: [
      "Đi chân trần dạo mép nước, hai tay khẽ nhấc nhẹ tà váy tránh ướt sóng",
      "Đứng quay lưng về ống kính nhìn ra biển xa, một tay giữ vành mũ cói bay trong gió",
      "Ngồi trên bãi cát mịn, hai chân duỗi nhẹ về phía trước, tay chống sau ngước nhìn trời",
    ],
  },
  {
    id: "idea-beach-2",
    locationId: "loc-beach",
    title: "Bờ Hồ Sáng Sớm Tĩnh Lặng Bình Yên",
    tagline: "Nét dịu dàng, lắng đọng bên mặt nước hồ phẳng lặng như gương",
    coverImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Váy yếm hoặc chân váy midi xếp ly, áo len dệt kim mỏng nhẹ",
    propsSuggestion: "Chiếc ô trong suốt che sương, máy nghe nhạc nhỏ",
    timeOfDaySuggestion: "Sáng sớm 6h00 - 7h30",
    lightingStyle: "Ánh sáng bạc mát dịu đầu ngày",
    keyPoses: [
      "Ngồi trên cầu gỗ vươn ra hồ, hai chân thả hờ gần mặt nước",
      "Đứng nghiêng bên gốc liễu ven hồ, ngón tay chạm nhẹ vào cành lá rủ",
      "Bước chậm trên con đường lát đá ven hồ, đầu hơi cúi mỉm cười nhẹ",
    ],
  },

  // --- LOC: TRƯỜNG HỌC ---
  {
    id: "idea-school-1",
    locationId: "loc-school",
    title: "Nữ Sinh Áo Trắng & Hành Lang Nắng Sân Trường",
    tagline: "Ký ức thanh xuân rực rỡ, nụ cười hồn nhiên của tuổi học trò",
    coverImage:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80",
    mood: "Thanh xuân",
    outfitSuggestion: "Áo dài trắng nữ sinh truyền thống hoặc đồng phục váy xếp ly áo sơ mi",
    propsSuggestion: "Cặp sách da, cuốn lưu bút, chùm phượng vĩ hoặc nhành hoa bằng lăng",
    timeOfDaySuggestion: "Sáng sớm 8h00 hoặc nắng chiều 15h30",
    lightingStyle: "Vệt nắng xiên qua dãy hành lang lớp học",
    keyPoses: [
      "Đứng tựa lan can hành lang tầng 2, hai tay ôm cuốn vở trước ngực nhìn xuống sân trường",
      "Ngồi ở ghế đá dưới tán cây cổ thụ, một tay che nắng, nụ cười rạng rỡ",
      "Ngoảnh lại nhìn máy ảnh khi đang bước lên cầu thang trường học",
    ],
  },
  {
    id: "idea-school-2",
    locationId: "loc-school",
    title: "Không Gian Tĩnh Lặng Giữa Giá Sách Thư Viện",
    tagline: "Vẻ đẹp trí thức, chăm chú và ấm áp giữa hàng ngàn trang sách",
    coverImage:
      "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&q=80",
    mood: "Thơ mộng",
    outfitSuggestion: "Áo sơ mi cổ đức, áo gile len phong cách preppy, tóc buộc thấp",
    propsSuggestion: "Cuốn sách dày gáy bìa da, kính gọng kim loại tri thức",
    timeOfDaySuggestion: "Buổi trưa hoặc chiều khi nắng tạt vào khung kính thư viện",
    lightingStyle: "Ánh sáng ấm cúng lọt qua khe giữa hai hàng giá sách cao",
    keyPoses: [
      "Đứng giữa hai kệ sách, một tay với lấy cuốn sách ở tầng cao, thân người vươn nhẹ",
      "Ngồi bên bàn gỗ dài, say sưa lật sách, ánh sáng cửa sổ chiếu viền lên mái tóc",
      "Lấp ló nửa khuôn mặt sau gáy cuốn sách đang cầm, đôi mắt cười tinh nghịch",
    ],
  },
];
