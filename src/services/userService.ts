import { getCurrentUser } from "../utils/userAuth";
import { serverUrl } from "./apiUrl";
import { UserSummaryData } from "../types/sync";
import { getUserRecordsByType, syncRecord } from "./syncService";

export const userService = {
  getCurrentProfile: () => {
    return getCurrentUser();
  },

  updateProfile: async (updates: Partial<{ name: string; avatar: string }>) => {
    const user = getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    const { token: _token, ...safeProfile } = updated;
    await syncRecord("profile", `profile_${user.id}`, safeProfile);
    return updated;
  },

  getUserSummary: async (): Promise<UserSummaryData> => {
    const user = getCurrentUser();
    const userId = user ? user.id : "guest";

    try {
      if (user) {
        const res = await fetch(serverUrl(`/api/user/summary?userId=${encodeURIComponent(userId)}`), {
          headers: { Authorization: `Bearer ${user.token || ""}` },
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {
      // Local fallback
    }

    const favs = getUserRecordsByType("favorite");
    const poses = getUserRecordsByType("savedPose");
    const collections = getUserRecordsByType("collection");
    const ideas = getUserRecordsByType("generatedIdea");
    const concepts = getUserRecordsByType("personalConcept");

    return {
      userId,
      favoritesCount: favs.length,
      savedPosesCount: poses.length,
      collectionsCount: collections.length,
      generatedIdeasCount: ideas.length,
      personalConceptsCount: concepts.length,
      lastSyncedAt: Date.now(),
    };
  },
};
