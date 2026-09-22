import { createEntry } from "../shared/defaults.js";
import { loadEntries, saveEntries } from "../shared/storage.js";
import { PROFILE_MODULES, isStructuredEntry } from "../shared/profile-schema.js";

const els = {
  tabs: document.querySelector("#module-tabs"), count: document.querySelector("#entry-count"),
  title: document.querySelector("#module-title"), description: document.querySelector("#module-description"),
  form: document.querySelector("#module-form"), records: document.querySelector("#record-list"),
  addRecord: document.querySelector("#add-record-button"), saveHint: document.querySelector("#save-hint"),
  exportButton: document.querySelector("#export-button"), legacyPanel: document.querySelector("#legacy-panel"),
  legacyList: document.querySelector("#legacy-list"), notice: document.querySelector("#notice")
};
const aiEls = {
  form: document.querySelector("#ai-settings-form"), endpoint: document.querySelector("#ai-endpoint"),
  model: document.querySelector("#ai-model"), key: document.querySelector("#ai-key"),
  autoMatch: document.querySelector("#ai-auto-match"),
  clear: document.querySelector("#ai-clear"), test: document.querySelector("#ai-test"), status: document.querySelector("#ai-settings-status")
};
const AI_CONFIG_KEY = "jobClipboardAiConfig";
const AI_SESSION_KEY = "jobClipboardAiKey";

const MODULE_HELP = {
  basic: "姓名、联系方式和身份资料均为选填，空白字段不会出现在侧栏。",
  education: "每所学校作为一段教育经历，可继续增加学校或学历。",
  internship: "每家单位作为一段实习经历，工作内容适合保留完整段落。",
  project: "每个项目单独保存，方便按网申字段快速填入。",
  campus: "学生组织、助教、志愿服务等经历可以分别添加。",
  award: "每项荣誉或奖励单独记录，便于填写名称、级别和时间。",
  selfEvaluation: "保存常用个人评价；还可以增加不同用途的自定义版本。",
  interests: "记录兴趣爱好与个人特长，也可以添加其他常见字段。",
  family: "每位家庭成员单独记录；敏感信息可留空。"
};

let entries = await loadEntries();
let activeModuleId = PROFILE_MODULES[0].id;
let draftRecords = [];
const moduleById = (id) => PROFILE_MODULES.find((item) => item.id === id) || PROFILE_MODULES[0];
const entriesForModule = (id) => entries.filter((entry) => entry.metadata?.moduleId === id);

function newDraft(module, index) {
  return { id: module.repeatable ? crypto.randomUUID() : `${module.id}-default`, label: module.repeatable ? `${module.groupLabel || module.label} ${index + 1}` : module.label, values: {}, custom: [] };
}

function buildDrafts(module) {
  const groups = new Map();
  entriesForModule(module.id).forEach((entry) => {
    const id = entry.metadata.groupId || `${module.id}-default`;
    if (!groups.has(id)) groups.set(id, { id, label: entry.metadata.groupLabel || "", values: {}, custom: [] });
    const record = groups.get(id);
    if (module.fields.some((field) => field.key === entry.metadata.fieldKey)) record.values[entry.metadata.fieldKey] = entry.content;
    else record.custom.push({ key: entry.metadata.fieldKey, label: entry.metadata.fieldLabel || entry.title, value: entry.content });
  });
  const drafts = [...groups.values()];
  if (!drafts.length) drafts.push(newDraft(module, 0));
  return drafts;
}

function renderTabs() {
  els.tabs.replaceChildren(...PROFILE_MODULES.map((module) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", String(module.id === activeModuleId));
    const label = document.createElement("span"); label.textContent = module.label;
    const count = document.createElement("small");
    const total = entriesForModule(module.id).filter((entry) => entry.content.trim()).length;
    count.textContent = total ? String(total) : "";
    button.append(label, count);
    button.addEventListener("click", () => openModule(module.id));
    return button;
  }));
  els.count.textContent = `${entries.filter((entry) => entry.content.trim()).length} 项已填写`;
}

function fieldControl(field, value, recordIndex) {
  const label = document.createElement("label");
  label.className = `field${field.inputType === "textarea" ? " wide" : ""}`;
  label.textContent = field.label;
  const control = document.createElement(field.inputType === "textarea" ? "textarea" : "input");
  control.name = `field:${recordIndex}:${field.key}`;
  control.value = value || "";
  control.placeholder = field.inputType === "textarea" ? `填写${field.label}，支持多行` : `填写${field.label}`;
  label.append(control);
  return label;
}

function customFieldRow(item, recordIndex, customIndex) {
  const row = document.createElement("div"); row.className = "custom-field";
  const label = document.createElement("input"); label.name = `custom-label:${recordIndex}:${customIndex}`; label.value = item.label || ""; label.placeholder = "自定义字段名"; label.setAttribute("aria-label", "自定义字段名");
  const value = document.createElement("textarea"); value.name = `custom-value:${recordIndex}:${customIndex}`; value.value = item.value || ""; value.placeholder = "填写内容，支持多行"; value.setAttribute("aria-label", "自定义字段内容"); value.rows = 4;
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "icon-remove"; remove.textContent = "删除";
  remove.addEventListener("click", () => { readDraftFromForm(); draftRecords[recordIndex].custom.splice(customIndex, 1); renderRecords(); markDirty(); });
  row.append(label, value, remove);
  return row;
}

function recordCard(module, record, index) {
  const section = document.createElement("section"); section.className = "record"; section.dataset.recordId = record.id;
  const heading = document.createElement("div"); heading.className = "record-heading";
  const title = document.createElement("input"); title.name = `group-label:${index}`; title.value = record.label || `${module.groupLabel || module.label} ${index + 1}`; title.setAttribute("aria-label", "这段经历的显示名称"); title.title = "可以修改这段经历在侧栏中的名称";
  heading.append(title);
  if (module.repeatable && draftRecords.length > 1) {
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-record"; remove.textContent = "删除这一段";
    remove.addEventListener("click", () => { readDraftFromForm(); draftRecords.splice(index, 1); renderRecords(); markDirty(); });
    heading.append(remove);
  }
  const fields = document.createElement("div"); fields.className = "fields";
  module.fields.forEach((field) => fields.append(fieldControl(field, record.values[field.key], index)));
  const custom = document.createElement("div"); custom.className = "custom-fields";
  record.custom.forEach((item, customIndex) => custom.append(customFieldRow(item, index, customIndex)));
  fields.append(custom);
  const tools = document.createElement("div"); tools.className = "record-tools";
  const add = document.createElement("button"); add.type = "button"; add.className = "add-field"; add.textContent = "＋ 增加自定义字段";
  add.addEventListener("click", () => { readDraftFromForm(); draftRecords[index].custom.push({ key: `custom-${crypto.randomUUID()}`, label: "", value: "" }); renderRecords(); markDirty(); });
  tools.append(add);
  section.append(heading, fields, tools);
  return section;
}

function renderRecords() {
  const module = moduleById(activeModuleId);
  els.records.replaceChildren(...draftRecords.map((record, index) => recordCard(module, record, index)));
}

function openModule(moduleId) {
  activeModuleId = moduleId;
  const module = moduleById(moduleId);
  draftRecords = buildDrafts(module);
  els.title.textContent = module.label;
  els.description.textContent = MODULE_HELP[module.id];
  els.addRecord.hidden = !module.repeatable;
  els.addRecord.textContent = `增加${module.groupLabel || module.label}`;
  els.saveHint.textContent = "修改后点击保存";
  renderTabs(); renderRecords();
}

function readDraftFromForm() {
  const form = new FormData(els.form);
  const module = moduleById(activeModuleId);
  draftRecords.forEach((record, recordIndex) => {
    record.label = String(form.get(`group-label:${recordIndex}`) || record.label).trim();
    module.fields.forEach((field) => { record.values[field.key] = String(form.get(`field:${recordIndex}:${field.key}`) || ""); });
    record.custom.forEach((item, customIndex) => {
      item.label = String(form.get(`custom-label:${recordIndex}:${customIndex}`) || "").trim();
      item.value = String(form.get(`custom-value:${recordIndex}:${customIndex}`) || "");
    });
  });
}

function structuredEntriesFromDrafts(module) {
  return draftRecords.flatMap((record) => {
    const firstValue = String(record.values[module.fields[0]?.key] || "").trim();
    const defaultPattern = new RegExp(`^${module.groupLabel || module.label}\\s*\\d*$`);
    const groupLabel = module.repeatable && firstValue && defaultPattern.test(record.label) ? firstValue : record.label;
    const common = { category: module.label, groupId: record.id, groupLabel, moduleId: module.id };
    const standard = module.fields.flatMap((field, index) => {
      const content = String(record.values[field.key] || "").trim();
      if (!content) return [];
      return [createEntry({ title: field.label, category: module.label, aliases: field.aliases, content, metadata: { ...common, fieldKey: field.key, fieldLabel: field.label, sortOrder: index, sourceType: "form" } })];
    });
    const custom = record.custom.flatMap((field, index) => {
      const label = String(field.label || "").trim(); const content = String(field.value || "").trim();
      if (!label || !content) return [];
      return [createEntry({ title: label, category: module.label, aliases: [label], content, metadata: { ...common, fieldKey: field.key, fieldLabel: label, sortOrder: module.fields.length + index, sourceType: "custom" } })];
    });
    return [...standard, ...custom];
  });
}

function markDirty() { els.saveHint.textContent = "有尚未保存的修改"; }

function renderLegacy() {
  const legacy = entries.filter((entry) => !isStructuredEntry(entry));
  els.legacyPanel.hidden = !legacy.length;
  els.legacyList.replaceChildren(...legacy.map((entry) => {
    const row = document.createElement("div"); row.className = "legacy-row";
    const copy = document.createElement("div"); const title = document.createElement("strong"); title.textContent = `${entry.category} · ${entry.title}`;
    const preview = document.createElement("span"); preview.textContent = entry.content.replace(/\s+/g, " ").slice(0, 100); copy.append(title, preview);
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "删除";
    remove.addEventListener("click", async () => {
      if (!confirm(`确定删除「${entry.title}」吗？`)) return;
      entries = await saveEntries(entries.filter((item) => item.id !== entry.id)); renderTabs(); renderLegacy(); showNotice("资料已删除");
    });
    row.append(copy, remove); return row;
  }));
}

function showNotice(message) {
  els.notice.textContent = message; els.notice.classList.add("visible"); clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => els.notice.classList.remove("visible"), 2400);
}

els.form.addEventListener("input", markDirty);
els.form.addEventListener("submit", async (event) => {
  event.preventDefault(); readDraftFromForm();
  const module = moduleById(activeModuleId);
  entries = await saveEntries([...structuredEntriesFromDrafts(module), ...entries.filter((entry) => entry.metadata?.moduleId !== module.id)]);
  draftRecords = buildDrafts(module); renderTabs(); renderRecords(); renderLegacy();
  els.saveHint.textContent = "已保存到本地"; showNotice(`${module.label}已保存`);
});

els.addRecord.addEventListener("click", () => { readDraftFromForm(); const module = moduleById(activeModuleId); draftRecords.push(newDraft(module, draftRecords.length)); renderRecords(); markDirty(); });
els.exportButton.addEventListener("click", () => {
  const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), entries }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" })); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `网申资料夹备份-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); showNotice("本地备份已导出");
});

aiEls.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let endpoint;
  try {
    endpoint = new URL(aiEls.endpoint.value.trim());
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) throw new Error();
  } catch {
    aiEls.status.textContent = "请填写有效的 HTTPS API 地址。";
    return;
  }
  const model = aiEls.model.value.trim();
  if (!model) { aiEls.status.textContent = "请填写模型名。"; return; }
  const previous = (await chrome.storage.local.get(AI_CONFIG_KEY))[AI_CONFIG_KEY];
  let providerChanged = false;
  try { providerChanged = Boolean(previous?.endpoint && new URL(previous.endpoint).origin !== endpoint.origin); }
  catch { providerChanged = Boolean(previous?.endpoint); }
  if (providerChanged && !aiEls.key.value.trim()) {
    aiEls.status.textContent = "API 服务商已更换，请填写新服务商的密钥后再保存。";
    return;
  }
  const origin = `${endpoint.origin}/*`;
  const request = chrome.permissions?.request?.({ origins: [origin] });
  try {
    if (!request || !await request) { aiEls.status.textContent = "未授权访问该 API 域名，配置未保存。"; return; }
    const key = aiEls.key.value.trim();
    if (key) await chrome.storage.session.set({ [AI_SESSION_KEY]: key });
    const existing = await chrome.storage.session.get(AI_SESSION_KEY);
    if (!existing[AI_SESSION_KEY]) { aiEls.status.textContent = "请填写 API 密钥。"; return; }
    await chrome.storage.local.set({ [AI_CONFIG_KEY]: { endpoint: endpoint.href, model, autoMatch: aiEls.autoMatch.checked } });
    aiEls.key.value = "";
    aiEls.status.textContent = `已保存，密钥已隐藏并在当前浏览器会话中可用。${aiEls.autoMatch.checked ? "侧栏打开时会自动向 API 请求字段匹配；" : "AI 自动匹配已关闭；"}长文本压缩仍需单独确认。`;
  } catch (error) {
    aiEls.status.textContent = `保存失败：${error instanceof Error ? error.message : String(error)}`;
  }
});

aiEls.clear.addEventListener("click", async () => {
  await chrome.storage.local.remove(AI_CONFIG_KEY);
  await chrome.storage.session.remove(AI_SESSION_KEY);
  aiEls.form.reset();
  aiEls.status.textContent = "AI 配置和会话密钥已清除。";
});

aiEls.test.addEventListener("click", async () => {
  aiEls.test.disabled = true;
  aiEls.status.textContent = "正在测试 API 连接，会产生一次少量调用费用；不会发送个人资料。";
  try {
    const result = await chrome.runtime.sendMessage({ type: "JOB_CLIPBOARD_TEST_AI" });
    aiEls.status.textContent = result?.ok
      ? "API 连接成功，模型已返回测试结果。不会自动开启 AI 匹配。"
      : `连接失败：${result?.error || "没有收到结果"}`;
  } catch (error) {
    aiEls.status.textContent = `连接失败：${error instanceof Error ? error.message : String(error)}`;
  } finally { aiEls.test.disabled = false; }
});

Promise.all([chrome.storage.local.get(AI_CONFIG_KEY), chrome.storage.session.get(AI_SESSION_KEY)]).then(([result, session]) => {
  const config = result[AI_CONFIG_KEY];
  if (!config) return;
  aiEls.endpoint.value = config.endpoint || "";
  aiEls.model.value = config.model || "";
  aiEls.autoMatch.checked = config.autoMatch === true;
  aiEls.status.textContent = session[AI_SESSION_KEY]
    ? "地址和模型已保存；密钥已隐藏，在当前浏览器会话中可用。"
    : "地址和模型已保存；当前没有可用密钥，请重新填写后保存。";
});

openModule(activeModuleId);
renderLegacy();
