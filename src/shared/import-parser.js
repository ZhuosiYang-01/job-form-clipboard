/**
 * Dependency-free import helpers shared by the extension's import screens.
 * The parser deliberately receives file-like objects instead of reading disk.
 */

const SUPPORTED_TEXT_EXTENSIONS = new Set(["txt", "md", "markdown"]);

function clean(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function slug(value) {
  return clean(value)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

/** Return a deterministic, compact ID for the same logical entry. */
export function stableId(...parts) {
  const input = parts.flat(Infinity).map(slug).join("\u001f");
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `entry_${(hash >>> 0).toString(36).padStart(7, "0")}`;
}

function makeEntry({ id, category, title, content, aliases, pinned, createdAt, updatedAt }) {
  const normalized = {
    category: clean(category) || "未分类",
    title: clean(title) || "未命名",
    content: clean(content),
    aliases: Array.isArray(aliases) ? aliases.map(clean).filter(Boolean) : [],
    pinned: Boolean(pinned),
  };
  if (!normalized.content) throw new Error(`“${normalized.title}”没有正文`);
  const entry = {
    id: clean(id) || stableId(normalized.category, normalized.title, normalized.content),
    ...normalized,
  };
  if (createdAt) entry.createdAt = clean(createdAt);
  if (updatedAt) entry.updatedAt = clean(updatedAt);
  return entry;
}

function extensionOf(name = "") {
  const match = String(name).toLowerCase().match(/\.([^.]+)$/);
  return match?.[1] ?? "";
}

function baseName(name = "") {
  return String(name).replace(/\.[^.]+$/, "").trim() || "导入内容";
}

function parseMarkdown(text, fallbackCategory) {
  const lines = clean(text).split("\n");
  const entries = [];
  let category = fallbackCategory;
  let title = "";
  let body = [];

  const flush = () => {
    const content = clean(body.join("\n"));
    if (title && content) entries.push(makeEntry({ category, title, content }));
    body = [];
  };

  for (const line of lines) {
    const categoryMatch = line.match(/^#\s+(.+?)\s*$/);
    const titleMatch = line.match(/^##\s+(.+?)\s*$/);
    if (titleMatch) {
      flush();
      title = titleMatch[1];
    } else if (categoryMatch) {
      flush();
      category = clean(categoryMatch[1]) || fallbackCategory;
      title = "";
    } else if (title) {
      body.push(line);
    }
  }
  flush();
  return entries;
}

function parseSeparated(text, fallbackCategory) {
  return clean(text)
    .split(/^\s*-{3,}\s*$/m)
    .map(clean)
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split("\n");
      let category = fallbackCategory;
      let title = "";

      while (lines.length) {
        const line = clean(lines[0]);
        const categoryMatch = line.match(/^(?:分类|category)\s*[:：]\s*(.+)$/i);
        const titleMatch = line.match(/^(?:标题|title)\s*[:：]\s*(.+)$/i);
        if (categoryMatch) {
          category = categoryMatch[1];
          lines.shift();
        } else if (titleMatch) {
          title = titleMatch[1];
          lines.shift();
        } else {
          break;
        }
      }

      if (!title && lines.length > 1) title = clean(lines.shift()).replace(/^#+\s*/, "");
      return makeEntry({
        category,
        title: title || `${fallbackCategory} ${index + 1}`,
        content: lines.join("\n"),
      });
    });
}

/** Parse a .txt or .md payload into normalized entries. */
export function parseTextImport(text, { fileName = "导入内容.txt" } = {}) {
  const source = clean(text).replace(/^\uFEFF/, "");
  if (!source) throw new Error("文件内容为空");
  const fallbackCategory = baseName(fileName);
  const markdownEntries = parseMarkdown(source, fallbackCategory);
  if (markdownEntries.length) return markdownEntries;
  if (/^\s*-{3,}\s*$/m.test(source)) return parseSeparated(source, fallbackCategory);
  return [makeEntry({ category: fallbackCategory, title: fallbackCategory, content: source })];
}

/** Parse an exported backup. Accepts an array or { entries/items/cards: [] }. */
export function parseJsonBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text).replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("JSON 格式无效");
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed?.entries ?? parsed?.items ?? parsed?.cards;
  if (!Array.isArray(rows)) throw new Error("JSON 备份中没有 entries 数组");
  return rows.map((row, index) => {
    if (!row || typeof row !== "object") throw new Error(`第 ${index + 1} 项格式无效`);
    return makeEntry({
      id: row.id,
      category: row.category ?? row.group,
      title: row.title ?? row.name,
      content: row.content ?? row.value ?? row.text,
      aliases: row.aliases ?? row.tags,
      pinned: row.pinned,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });
}

export function parseImportContent({ name = "导入内容.txt", text = "" }) {
  const extension = extensionOf(name);
  if (extension === "json") return parseJsonBackup(text);
  if (SUPPORTED_TEXT_EXTENSIONS.has(extension)) return parseTextImport(text, { fileName: name });
  throw new Error(`不支持 .${extension || "未知"} 文件`);
}

/**
 * Parse multiple browser File objects or plain {name, text} fixtures.
 * A broken file is reported without preventing valid files from importing.
 */
export async function parseImportFiles(files) {
  const entries = [];
  const errors = [];
  for (const file of Array.from(files ?? [])) {
    const name = clean(file?.name) || "未命名文件";
    try {
      const text = typeof file?.text === "function" ? await file.text() : file?.text;
      if (typeof text !== "string") throw new Error("无法读取文件内容");
      entries.push(...parseImportContent({ name, text }));
    } catch (error) {
      errors.push({ fileName: name, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { entries, errors };
}
