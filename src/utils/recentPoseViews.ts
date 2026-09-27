export interface RecentPoseView {
  poseKey: string;
  viewedAt: number;
}

export const RECENT_POSE_VIEW_TTL_MS = 24 * 60 * 60 * 1000;

/** Filters the recent-view list without changing offline image cache data. */
export function filterRecentPoseViews(value: unknown): RecentPoseView[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  return value.filter((item): item is RecentPoseView =>
    typeof item?.poseKey === "string"
      && Number.isFinite(item?.viewedAt)
      && item.viewedAt <= now
      && now - item.viewedAt < RECENT_POSE_VIEW_TTL_MS
  ).slice(0, 20);
}
