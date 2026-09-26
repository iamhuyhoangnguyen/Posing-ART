export type SectionType = "home" | "kyyeu" | "canhan" | "idea-ai";

export type UserRole = "admin" | "member";

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  authType: "credentials" | "google" | "facebook";
  createdAt: number;
  token?: string;
}

export type PhotoApprovalStatus = "approved" | "pending";

export interface PoseItem {
  id: string; // e.g. "kyyeu-0-0" or custom uuid
  title: string;
  desc: string;
  coverImage?: string; // Real photography preview image (replaces stick-figure)
  tips?: string[];
  angle?: string; // e.g. "Góc ngang tầm mắt", "Góc thấp 30 độ"
  isCustom?: boolean;
}

export interface CategoryItem {
  id: string;
  label: string;
  coverImage?: string; // Cover photo for this category/concept
  description?: string;
  poses: PoseItem[];
}

export interface PhotoRecord {
  id: number;
  syncId?: string;
  cloudId?: string;
  ownerUserId?: string;
  poseKey: string;
  blob: Blob | File;
  dataUrl?: string;
  createdAt: number;
  note?: string;
  uploadedBy?: string;
  uploaderRole?: UserRole;
  status?: PhotoApprovalStatus;
}

export interface AIAccountSettings {
  chatgpt: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    status: "connected" | "disconnected";
  };
  gemini: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    status: "connected" | "disconnected";
  };
  claude: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    status: "connected" | "disconnected";
  };
}

export type FilterStatus = "all" | "pending" | "completed";

export interface PhotographerContext {
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  environment?: "outdoor" | "indoor" | "studio" | "";
  timeOfDay?: string;
  concept?: string;
  outfit?: string;
  peopleCount?: string;
  photoGoal?: string;
}

export interface ImmediateFixItem {
  id: number;
  title?: string;
  modelAction: string;
  cameraAction: string;
  result: string;
}

export interface PoseAnalysisScores {
  posing: "TỐT" | "CẦN SỬA" | "CẦN CHỈNH NHIỀU";
  composition: "TỐT" | "CẦN SỬA";
  expression: "TỰ NHIÊN" | "HƠI GƯỢNG" | "GƯỢNG";
  technicalRisk: "THẤP" | "TRUNG BÌNH" | "CAO";
}

export interface PoseAnalysisData {
  quickSummary: string;
  threeSecondRule: string;
  scores: PoseAnalysisScores;
  issues: {
    model: string;
    camera: string;
    lighting: string;
  };
  immediateFixes: ImmediateFixItem[];
  camera: {
    height: string;
    direction: string;
    framing: string;
    perspective: string;
    focalLengthNote: string;
    recommendation: string;
  };
  lighting: {
    direction: string;
    quality: string;
    highlightsShadows: string;
    backgroundImpact: string;
  };
  composition: {
    subjectPosition: string;
    headroomLeadroom: string;
    backgroundDistraction: string;
    cropBalance: string;
  };
  subjectPosingDetails?: {
    subject?: string;
    headNeck?: string;
    shouldersBack?: string;
    armsHands?: string;
    hipsLegs?: string;
    gazeExpression?: string;
  };
  markdown: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  analysis?: string;
  structured?: PoseAnalysisData;
  error?: string;
}

// ==========================================
// VISUAL IDEA LIBRARY (PHẦN 2: CONCEPT CÁ NHÂN & BỐI CẢNH)
// ==========================================

export interface VisualIdeaLocation {
  id: string;
  name: string;
  shortName: string;
  coverImage: string;
  iconName?: string;
  description: string;
  totalIdeas?: number;
  tags?: string[];
  isCustom?: boolean;
}

export interface VisualIdeaItem {
  id: string;
  locationId: string;
  title: string;
  tagline: string;
  coverImage: string;
  mood: string; // "Thơ mộng" | "Thanh xuân" | "Cá tính" | "Cổ điển" | "Điện ảnh" | "Năng động"
  outfitSuggestion: string; // Gợi ý trang phục
  propsSuggestion: string; // Gợi ý đạo cụ
  timeOfDaySuggestion: string; // Thời điểm chụp đẹp
  keyPoses: string[]; // Các dáng đề xuất tiêu biểu
  lightingStyle?: string; // Phong cách ánh sáng tự nhiên/nhân tạo
  referenceImages?: string[];
  isCustom?: boolean;
  createdAt?: number;
}
