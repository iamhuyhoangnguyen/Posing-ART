const CACHE_PREFIX = "posing:inspiration-suggestions:v1:";
export const INSPIRATION_SUGGESTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InspirationSuggestionEntry {
  suggestions: string[];
  history: string[][];
  savedAt: number;
}

export interface SuggestionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): SuggestionStorage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function cacheKey(categoryId: string): string {
  return `${CACHE_PREFIX}${encodeURIComponent(categoryId)}`;
}

export function readInspirationSuggestionCache(
  categoryId: string,
  now = Date.now(),
  storage = defaultStorage(),
): InspirationSuggestionEntry | null {
  if (!storage) return null;
  const key = cacheKey(categoryId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const entry = value as Partial<InspirationSuggestionEntry>;
    const valid = Array.isArray(entry.suggestions)
      && entry.suggestions.length >= 6
      && entry.suggestions.every((item) => typeof item === "string")
      && Array.isArray(entry.history)
      && typeof entry.savedAt === "number"
      && Number.isFinite(entry.savedAt)
      && now >= entry.savedAt
      && now - entry.savedAt < INSPIRATION_SUGGESTION_TTL_MS;
    if (!valid) {
      storage.removeItem(key);
      return null;
    }
    return entry as InspirationSuggestionEntry;
  } catch {
    return null;
  }
}

export function writeInspirationSuggestionCache(
  categoryId: string,
  entry: InspirationSuggestionEntry,
  storage = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(cacheKey(categoryId), JSON.stringify(entry));
  } catch {
    // Storage may be disabled or full; the in-memory cache still works for this session.
  }
}
