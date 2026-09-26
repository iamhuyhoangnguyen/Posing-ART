/**
 * Cloud Synchronization & Data Models
 * Common schema across Web and Android (.apk)
 */

export type CloudRecordType =
  | "favorite"
  | "savedPose"
  | "collection"
  | "generatedIdea"
  | "personalConcept"
  | "setting"
  | "profile";

export interface UserCloudRecord<T = any> {
  id: string;
  userId: string;
  type: CloudRecordType;
  data: T;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface UserCloudSyncPayload {
  userId: string;
  records: UserCloudRecord[];
  clientTime: number;
}

export interface UserCloudSyncResponse {
  success: boolean;
  serverTime: number;
  records: UserCloudRecord[];
  conflicts?: UserCloudRecord[];
}

export interface UserSummaryData {
  userId: string;
  favoritesCount: number;
  savedPosesCount: number;
  collectionsCount: number;
  generatedIdeasCount: number;
  personalConceptsCount: number;
  lastSyncedAt: number;
}
