import { getUserRecordsByType, syncFavorite } from "./syncService";

export const favoriteService = {
  isFavorite: (poseKey: string): boolean => {
    const favs = getUserRecordsByType<{ poseKey: string; isFavorite: boolean }>("favorite");
    return favs.some((f) => f.data.poseKey === poseKey && f.data.isFavorite);
  },

  toggleFavorite: async (poseKey: string): Promise<boolean> => {
    const current = favoriteService.isFavorite(poseKey);
    const nextState = !current;
    await syncFavorite(poseKey, nextState);
    return nextState;
  },

  getAllFavorites: (): string[] => {
    const favs = getUserRecordsByType<{ poseKey: string; isFavorite: boolean }>("favorite");
    return favs.filter((f) => f.data.isFavorite).map((f) => f.data.poseKey);
  },
};
