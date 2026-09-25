import { PoseItem } from "../types";
import { getUserRecordsByType, syncSavedPose } from "./syncService";

export const poseService = {
  isPoseCompleted: (poseKey: string): boolean => {
    // Check localStorage first for instant speed
    const localVal = localStorage.getItem(`done-${poseKey}`);
    if (localVal !== null) {
      return localVal === "true";
    }
    const saved = getUserRecordsByType<{ poseKey: string; isCompleted: boolean }>("savedPose");
    const record = saved.find((r) => r.data.poseKey === poseKey);
    return record?.data?.isCompleted ?? false;
  },

  setPoseCompleted: async (poseKey: string, completed: boolean, poseItem?: PoseItem): Promise<void> => {
    localStorage.setItem(`done-${poseKey}`, String(completed));
    await syncSavedPose(poseKey, { ...poseItem, isCompleted: completed }, completed);
  },

  getSavedPoses: () => {
    return getUserRecordsByType("savedPose");
  },
};
