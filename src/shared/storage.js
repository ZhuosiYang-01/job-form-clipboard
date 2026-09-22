import { STORAGE_KEY, normalizeEntry } from "./defaults.js";
import { isStructuredEntry } from "./profile-schema.js";

export async function loadEntries() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const entries = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  return entries.map(normalizeEntry);
}

export async function saveEntries(entries) {
  const normalized = entries
    .map(normalizeEntry)
    .filter((entry) => !isStructuredEntry(entry) || entry.content.trim());
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

export async function upsertEntry(entry) {
  const entries = await loadEntries();
  const next = normalizeEntry(entry);
  const index = entries.findIndex((item) => item.id === next.id);
  if (isStructuredEntry(next) && !next.content.trim()) {
    if (index >= 0) entries.splice(index, 1);
    return saveEntries(entries);
  }
  if (index >= 0) entries[index] = next;
  else entries.unshift(next);
  return saveEntries(entries);
}

export async function removeEntry(id) {
  const entries = await loadEntries();
  return saveEntries(entries.filter((entry) => entry.id !== id));
}
