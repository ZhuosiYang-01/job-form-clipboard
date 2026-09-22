export const STORAGE_KEY = "jobFormClipboardEntries";

export const DEFAULT_CATEGORIES = [
  "基础信息",
  "教育经历",
  "实习经历",
  "项目经历",
  "校园经历",
  "获奖信息",
  "个人评价",
  "兴趣特长",
  "家庭关系",
  "粘贴资料",
  "其他"
];

export function createEntry(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || "未命名资料",
    category: overrides.category || "其他",
    aliases: Array.isArray(overrides.aliases) ? overrides.aliases : [],
    content: overrides.content || "",
    pinned: Boolean(overrides.pinned),
    ...(normalizeMetadata(overrides.metadata) ? { metadata: normalizeMetadata(overrides.metadata) } : {}),
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const normalized = {};
  for (const key of ["moduleId", "category", "groupId", "groupLabel", "fieldKey", "fieldLabel", "sourceType"]) {
    const value = String(metadata[key] ?? "").trim();
    if (value) normalized[key] = value;
  }
  const sortOrder = Number(metadata.sortOrder);
  if (Number.isFinite(sortOrder)) normalized.sortOrder = sortOrder;
  return Object.keys(normalized).length ? normalized : null;
}

export function normalizeEntry(entry = {}) {
  return createEntry({
    ...entry,
    title: String(entry.title || "未命名资料").trim(),
    category: String(entry.category || "其他").trim(),
    aliases: Array.isArray(entry.aliases)
      ? entry.aliases.map((alias) => String(alias).trim()).filter(Boolean)
      : [],
    content: String(entry.content || "")
  });
}
