import { CategoryItem } from "../types";
import { getUserRecordsByType, syncCollection } from "./syncService";

export const collectionService = {
  getCustomCollections: (): CategoryItem[] => {
    const records = getUserRecordsByType<CategoryItem>("collection");
    return records.map((r) => r.data);
  },

  addCustomCollection: async (collection: CategoryItem): Promise<void> => {
    await syncCollection(collection.id, collection, false);
  },

  deleteCustomCollection: async (collectionId: string): Promise<void> => {
    await syncCollection(collectionId, { id: collectionId }, true);
  },
};
