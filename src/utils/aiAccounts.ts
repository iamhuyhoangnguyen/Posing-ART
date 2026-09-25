import { AIAccountSettings } from "../types";

const AI_ACCOUNTS_KEY = "posing_art_ai_accounts";

export const DEFAULT_AI_SETTINGS: AIAccountSettings = {
  chatgpt: {
    enabled: true,
    model: "gpt-4o",
    status: "connected",
  },
  gemini: {
    enabled: true,
    model: "gemini-2.5-flash",
    status: "connected",
  },
  claude: {
    enabled: true,
    model: "claude-3-5-sonnet",
    status: "connected",
  },
};

export function getAIAccountSettings(): AIAccountSettings {
  try {
    const raw = localStorage.getItem(AI_ACCOUNTS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAIAccountSettings(settings: AIAccountSettings): void {
  try {
    localStorage.setItem(AI_ACCOUNTS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("ai_accounts_changed", { detail: settings }));
  } catch (e) {
    console.error("Failed to save AI accounts settings:", e);
  }
}

export function updateProviderSetting(
  provider: "chatgpt" | "gemini" | "claude",
  updates: Partial<AIAccountSettings["chatgpt"]>
): AIAccountSettings {
  const current = getAIAccountSettings();
  current[provider] = {
    ...current[provider],
    ...updates,
  };
  saveAIAccountSettings(current);
  return current;
}
