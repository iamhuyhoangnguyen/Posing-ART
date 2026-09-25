import { getUserRecordsByType, syncConcept } from "./syncService";

export const conceptService = {
  getPersonalConcepts: (): any[] => {
    const records = getUserRecordsByType("personalConcept");
    return records.map((r) => r.data);
  },

  savePersonalConcept: async (conceptId: string, conceptData: any): Promise<void> => {
    await syncConcept(conceptId, conceptData, false);
  },

  deletePersonalConcept: async (conceptId: string): Promise<void> => {
    await syncConcept(conceptId, { id: conceptId }, true);
  },
};
