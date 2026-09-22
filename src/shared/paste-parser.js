const SPACE_SEPARATED_TITLES = [
  "通讯地址", "现居住址", "家庭地址", "联系地址", "邮寄地址", "户籍地址",
  "姓名", "手机号", "手机号码", "联系电话", "邮箱", "电子邮箱",
  "学校", "毕业院校", "专业", "学历", "学位", "个人评价", "自我评价",
  "个人总结", "自我介绍", "项目经历", "实习经历"
];

function normalizeClipboardText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function isPlausibleTitle(value) {
  const title = value.trim();
  if (title.length < 2 || title.length > 24) return false;
  if (/[@/\\]/.test(title) || /^\d+(?:[.:：-]\d+)*$/.test(title)) return false;
  if (/^(?:https?|ftp|file)$/i.test(title) || /^[a-z]$/i.test(title)) return false;
  return /^[\p{L}\p{N}\s·（）()_-]+$/u.test(title) && /\p{L}/u.test(title);
}

/** Parse one user-initiated paste inside the extension sidebar. */
export function parsePastedCard(value) {
  const text = normalizeClipboardText(value);
  if (!text) return null;

  const colon = text.match(/^([^\n：:]{2,24})\s*[：:]\s*([^\n]*)([\s\S]*)$/u);
  if (colon && isPlausibleTitle(colon[1]) && colon[2].trim()) {
    return {
      title: colon[1].trim(),
      content: `${colon[2]}${colon[3]}`.trim(),
      titleDetected: true
    };
  }

  for (const knownTitle of SPACE_SEPARATED_TITLES) {
    const match = text.match(new RegExp(`^${knownTitle}\\s+([^\\n]+)([\\s\\S]*)$`, "u"));
    if (match) {
      return {
        title: knownTitle,
        content: `${match[1]}${match[2]}`.trim(),
        titleDetected: true
      };
    }
  }

  return { title: "未命名资料", content: text, titleDetected: false };
}

export { SPACE_SEPARATED_TITLES };
