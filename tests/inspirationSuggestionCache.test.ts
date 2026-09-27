import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INSPIRATION_SUGGESTION_TTL_MS,
  readInspirationSuggestionCache,
  writeInspirationSuggestionCache,
  type SuggestionStorage,
} from "../src/utils/inspirationSuggestionCache";

function createStorage(): SuggestionStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

test("suggestions persist across reads until the seven-day TTL expires", () => {
  const storage = createStorage();
  const savedAt = 1_800_000_000_000;
  const entry = { suggestions: ["Dáng bên cửa sổ", "Ánh nắng cuối chiều", "Bước chân trên phố", "Cười nhìn bạn", "Tựa vai nhẹ nhàng", "Chân dung cùng hoa"], history: [], savedAt };

  writeInspirationSuggestionCache("vintage", entry, storage);
  assert.deepEqual(readInspirationSuggestionCache("vintage", savedAt + INSPIRATION_SUGGESTION_TTL_MS - 1, storage), entry);
  assert.equal(readInspirationSuggestionCache("vintage", savedAt + INSPIRATION_SUGGESTION_TTL_MS, storage), null);
});

test("suggestion cache rejects future timestamps and malformed entries", () => {
  const storage = createStorage();
  writeInspirationSuggestionCache("future", { suggestions: ["a", "b", "c", "d", "e", "f"], history: [], savedAt: 2000 }, storage);
  assert.equal(readInspirationSuggestionCache("future", 1000, storage), null);
  writeInspirationSuggestionCache("bad", { suggestions: [], history: [], savedAt: 1000 }, storage);
  assert.equal(readInspirationSuggestionCache("bad", 1000, storage), null);
});
