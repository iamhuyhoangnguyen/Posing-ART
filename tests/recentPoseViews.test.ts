import assert from "node:assert/strict";
import { test } from "node:test";
import { filterRecentPoseViews, RECENT_POSE_VIEW_TTL_MS } from "../src/utils/recentPoseViews";

test("hides views older than 24 hours while retaining newer ones", () => {
  const now = Date.parse("2026-09-27T12:00:00.000Z");
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    const visibleViews = filterRecentPoseViews([
      { poseKey: "older-than-24h", viewedAt: now - RECENT_POSE_VIEW_TTL_MS - 60 * 60 * 1000 },
      { poseKey: "just-under-24h", viewedAt: now - RECENT_POSE_VIEW_TTL_MS + 60 * 1000 },
    ]);

    assert.deepEqual(visibleViews.map((view) => view.poseKey), ["just-under-24h"]);
  } finally {
    Date.now = originalNow;
  }
});
