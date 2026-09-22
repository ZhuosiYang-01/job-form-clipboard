(() => {
  const ROOT_ID = "job-form-clipboard-root";
  const STORAGE_KEY = "jobFormClipboardEntries";
  const MODULE_ORDER = [
    "基础信息",
    "教育经历",
    "实习经历",
    "项目经历",
    "校园经历",
    "获奖信息",
    "个人评价",
    "兴趣特长",
    "家庭关系",
    "粘贴资料"
  ];
  const MODULE_ALIASES = {
    "基本信息": "基础信息",
    "个人基本信息": "基础信息",
    "工作经历": "实习经历",
    "荣誉或奖励": "获奖信息",
    "荣誉奖励": "获奖信息",
    "奖项荣誉": "获奖信息",
    "自我评价": "个人评价",
    "兴趣爱好": "兴趣特长",
    "家庭信息": "家庭关系"
  };

  if (globalThis.__jobFormClipboardInjected) return;
  globalThis.__jobFormClipboardInjected = true;

  let host = null;
  let shadow = null;
  let entries = [];
  let filteredEntries = [];
  let lastTarget = null;
  let lastRange = null;
  let fieldContext = emptyContext();
  let suggestedIds = [];
  let activeMatchIndex = 0;
  let aiMatched = false;
  let aiMatching = false;
  let matchRequestId = 0;
  let aiAutoMatchEnabled = false;
  const aiMatchCache = new Map();
  let quickAddOpen = false;
  let matcherModule = null;
  let pasteParserModule = null;
  let searchQuery = "";
  let searchIds = [];
  let activeSearchIndex = 0;
  let pendingPaste = null;
  let aiDraft = null;
  let railCollapsed = false;
  let railPosition = null;
  const collapsedModules = new Set();
  MODULE_ORDER.forEach((name) => collapsedModules.add(name));

  const icons = {
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>`,
    settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.55 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.55a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.45 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.35.7.6 1 .3.3.69.45 1.1.4h.1v4h-.09A1.7 1.7 0 0 0 19.4 15z"></path></svg>`,
    collapse: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"></path></svg>`,
    expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path></svg>`,
    chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>`,
    up: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"></path></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>`,
    pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-3 1-4 4-1 5-2-2-4 4-1-1 4-4-2-2 5-1 4-4z"></path></svg>`
  };

  const STYLES = `
    :host { all: initial; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    .shell {
      position: fixed; z-index: 2147483647; inset: 12px 12px 12px auto; width: min(390px, calc(100vw - 24px)); height: calc(100vh - 24px);
      display: grid; grid-template-rows: auto auto auto auto auto minmax(0, 1fr) auto; overflow: hidden;
      color: #18324a; background: #fbfaf6; border: 1px solid #c7d2dc; border-radius: 16px;
      box-shadow: -8px 16px 44px rgba(20, 43, 62, .18); font: 14px/1.45 "Segoe UI Variable", "Segoe UI", "Microsoft YaHei", sans-serif;
      transform: translateX(calc(100% + 28px)); opacity: 0; transition: transform 190ms cubic-bezier(.2,.8,.2,1), opacity 150ms ease-out;
    }
    .shell.ai-active { grid-template-rows: auto minmax(0, 1fr) auto; }
    .shell.ai-active .field-strip, .shell.ai-active .search-wrap, .shell.ai-active .toolbar, .shell.ai-active .entries { display: none; }
    :host([data-open="true"]) .shell { transform: translateX(0); opacity: 1; }
    :host([data-collapsed="true"]) .shell { visibility: hidden; transform: translateX(calc(100% + 28px)); opacity: 0; pointer-events: none; }
    .collapsed-tab { position: fixed; z-index: 2147483647; top: 50%; right: 0; display: none; align-items: center; gap: 3px; width: 34px; min-height: 92px; padding: 8px 5px; color: #fff; background: #175f8e; border: 0; border-radius: 10px 0 0 10px; box-shadow: -4px 8px 20px rgba(20,43,62,.2); cursor: pointer; transform: translateY(-50%); writing-mode: vertical-rl; }
    .collapsed-tab svg { width: 15px; height: 15px; }
    :host([data-open="true"][data-collapsed="true"]) .collapsed-tab { display: inline-flex; }
    .resize-handle { position: absolute; z-index: 3; inset: 44px auto 0 -4px; width: 9px; cursor: ew-resize; touch-action: none; }
    .resize-handle:hover::after { content: ""; position: absolute; top: 20%; bottom: 20%; left: 4px; width: 1px; background: #175f8e; }
    button, input, textarea { font: inherit; }
    button { color: inherit; }
    button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid rgba(21, 103, 159, .28); outline-offset: 2px; }
    svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .topbar { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 7px; min-height: 48px; padding: 7px 10px; background: #f3f6f7; border-bottom: 1px solid #d5dde3; cursor: grab; user-select: none; touch-action: none; }
    .topbar:active { cursor: grabbing; }
    .brand { margin: 0; color: #102b43; font-size: 17px; font-weight: 720; letter-spacing: -.02em; }
    .privacy { margin: 0; color: #587184; font-size: 11px; }
    .top-actions { display: flex; gap: 6px; }
    .icon-button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 9px; background: transparent; cursor: pointer; }
    .icon-button:hover { background: #e5ebee; }
    .icon-button:active { background: #dbe4e8; }
    .field-strip { display: grid; grid-template-columns: 4px 1fr auto; gap: 9px; align-items: center; min-height: 50px; padding: 7px 12px; border-bottom: 1px solid #d7dfe4; background: #fff; }
    .status-mark { width: 4px; height: 28px; border-radius: 4px; background: #9eabb5; }
    .field-strip.ready .status-mark { background: #d69222; }
    .field-strip div { min-width: 0; }
    .field-caption { display: block; color: #6a7d8b; font-size: 11px; font-weight: 650; letter-spacing: .06em; }
    .field-strip strong { display: block; overflow: hidden; margin-top: 2px; color: #173a55; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
    .match-count { color: #75500c; background: #fff1cb; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .match-nav { display: flex; align-items: center; gap: 3px; }
    .match-nav button { display: grid; place-items: center; width: 25px; height: 25px; padding: 0; color: #175f8e; background: #f0f4f5; border: 1px solid #cad5dc; border-radius: 9px; cursor: pointer; }
    .match-nav button:hover:not(:disabled) { background: #e5ebee; }
    .match-nav button:disabled { color: #9eabb5; cursor: default; }
    .match-nav svg { width: 14px; height: 14px; }
    .ai-match-status { color: #60798a; font-size: 11px; white-space: nowrap; }
    .search-wrap { position: relative; margin: 9px 12px 6px; }
    .search-wrap > svg { position: absolute; left: 10px; top: 9px; width: 16px; color: #62798a; }
    .search-wrap input { width: 100%; height: 34px; padding: 0 10px 0 34px; color: #17354c; background: #fff; border: 1px solid #cbd6dd; border-radius: 9px; font-size: 12px; }
    .search-wrap input::placeholder { color: #718695; }
    .search-nav { display: flex; align-items: center; justify-content: flex-end; gap: 7px; min-height: 28px; margin-top: 3px; color: #60798a; font-size: 11px; }
    .search-nav:empty { display: none; }
    .search-nav .match-nav { gap: 5px; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 12px 7px; }
    .add-button, .text-button, .empty button, footer button { border: 0; background: transparent; cursor: pointer; }
    .add-button { display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 0 9px; color: #fff; background: #175f8e; border-radius: 9px; font-size: 12px; font-weight: 700; }
    .add-button:hover { background: #104f78; }
    .add-button svg { width: 16px; height: 16px; }
    .text-button, footer button { color: #175f8e; font-weight: 650; }
    .text-button:hover, footer button:hover { text-decoration: underline; text-underline-offset: 3px; }
    .quick-add { margin: 0 16px 12px; padding: 14px; background: #eef3f5; border-radius: 12px; }
    .quick-add label { display: grid; gap: 5px; margin-bottom: 10px; color: #405d70; font-size: 12px; font-weight: 650; }
    .quick-add input, .quick-add textarea { width: 100%; color: #15354d; background: #fff; border: 1px solid #bdcbd4; border-radius: 8px; padding: 9px 10px; font-weight: 400; }
    .quick-add textarea { min-height: 88px; resize: vertical; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .form-actions button { min-width: 62px; min-height: 32px; border: 1px solid #b9c7d0; border-radius: 8px; background: #fff; cursor: pointer; }
    .form-actions button[type="submit"] { color: #fff; border-color: #175f8e; background: #175f8e; }
    .entries { overflow: auto; padding: 2px 12px 16px 16px; scrollbar-color: #9bacb7 transparent; scrollbar-width: thin; }
    .group { margin-top: 16px; }
    .group:first-child { margin-top: 10px; }
    .group-heading { margin: 0 2px 8px; }
    .group-toggle { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 28px; padding: 0; color: #15364e; background: transparent; border: 0; font-size: 13px; font-weight: 720; cursor: pointer; }
    .group-toggle svg { width: 15px; height: 15px; transition: transform 150ms ease-out; }
    .group-toggle[aria-expanded="false"] svg { transform: rotate(-90deg); }
    .group-toggle .group-count { color: #60798a; font-size: 11px; font-variant-numeric: tabular-nums; }
    .record + .record { margin-top: 12px; }
    .record-heading { display: flex; align-items: center; gap: 7px; min-width: 0; margin: 0 2px 6px; color: #60798a; font-size: 11px; font-weight: 680; }
    .record-heading::after { content: ""; flex: 1; min-width: 18px; height: 1px; background: #cad5dc; }
    .record-heading span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entry-list { display: grid; gap: 7px; }
    .entry { display: grid; grid-template-columns: 5px minmax(0, 1fr) auto; gap: 11px; width: 100%; min-height: 68px; padding: 0 12px 0 0; overflow: hidden; text-align: left; border: 0; border-radius: 12px; background: #fff; box-shadow: 0 2px 10px rgba(22, 49, 68, .08); cursor: pointer; }
    .entry:hover { box-shadow: 0 5px 16px rgba(22, 49, 68, .14); }
    .entry:active { transform: translateY(1px); }
    .entry-rail { display: grid; place-items: center; height: 100%; color: #65450d; background: #cad5dc; }
    .entry.suggested .entry-rail { width: 5px; background: #d99524; box-shadow: 3px 0 0 #f7d794; }
    .entry.current-match { outline: 2px solid #d99524; outline-offset: -2px; }
    .entry.current-search { outline: 2px solid #175f8e; outline-offset: -2px; }
    .entry-rail b { position: absolute; transform: translateX(12px); width: 18px; height: 18px; display: none; }
    .entry-body { min-width: 0; padding: 11px 0; }
    .entry-title { display: flex; align-items: center; gap: 5px; }
    .entry-title svg { width: 13px; height: 13px; color: #b97917; fill: currentColor; }
    .entry-title strong { overflow: hidden; color: #163750; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
    .entry-title em { margin-left: auto; color: #77500b; font-size: 10px; font-style: normal; font-weight: 750; }
    .entry-preview { display: block; overflow: hidden; margin-top: 5px; color: #667d8d; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .entry-action { align-self: center; color: #17628f; font-size: 12px; font-weight: 750; }
    .empty { padding: 36px 22px; text-align: center; }
    .empty strong { color: #1a3b53; font-size: 15px; }
    .empty p { max-width: 30ch; margin: 7px auto 14px; color: #647b8b; }
    .empty button { color: #175f8e; font-weight: 700; }
    footer { display: flex; justify-content: space-between; align-items: center; padding: 11px 18px; color: #6b808e; background: #f1f4f5; border-top: 1px solid #d5dde3; font-size: 12px; }
    .toast { position: absolute; left: 50%; bottom: 50px; max-width: calc(100% - 40px); padding: 9px 12px; color: #fff; background: #173b54; border-radius: 9px; box-shadow: 0 8px 24px rgba(12, 32, 48, .22); opacity: 0; pointer-events: none; transform: translate(-50%, 8px); transition: opacity 150ms ease-out, transform 180ms cubic-bezier(.2,.8,.2,1); white-space: nowrap; }
    .toast.visible { opacity: 1; transform: translate(-50%, 0); }
    .title-prompt { margin: 0 16px 10px; padding: 12px; border: 1px solid #cbd6dd; border-radius: 12px; background: #fff0c7; }
    .title-prompt strong { display: block; color: #15364e; font-size: 13px; }
    .title-prompt p { margin: 3px 0 7px; color: #60798a; font-size: 12px; }
    .paste-preview { overflow: hidden; padding: 7px 8px; color: #15364e !important; background: rgba(255,255,255,.72); border-radius: 8px; text-overflow: ellipsis; white-space: nowrap; }
    .title-prompt form { display: flex; gap: 7px; }
    .title-prompt input { min-width: 0; flex: 1; padding: 8px 9px; border: 1px solid #cad5dc; border-radius: 9px; background: #fff; }
    .title-prompt button { padding: 0 10px; border: 1px solid #cad5dc; border-radius: 9px; background: #fff; cursor: pointer; }
    .entry-wrap { position: relative; }
    .entry-wrap .entry { padding-right: 58px; }
    .compress-button { position: absolute; right: 9px; bottom: 8px; min-height: 25px; padding: 0 6px; color: #175f8e; background: #f0f4f5; border: 1px solid #cad5dc; border-radius: 9px; font-size: 11px; cursor: pointer; }
    .ai-panel { min-height: 0; margin: 10px 12px; padding: 12px; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: #9bacb7 transparent; scrollbar-width: thin; background: #f0f4f5; border: 1px solid #cad5dc; border-radius: 12px; }
    .ai-panel h2 { margin: 0 0 4px; color: #15364e; font-size: 14px; }
    .ai-panel p { margin: 5px 0 9px; color: #60798a; font-size: 12px; }
    .ai-panel label { display: grid; gap: 4px; margin-top: 8px; color: #15364e; font-size: 12px; font-weight: 680; }
    .ai-result-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; color: #15364e; font-size: 12px; font-weight: 680; }
    .ai-result-heading label { display: block; margin: 0; }
    .ai-result-heading button { min-height: 30px; padding: 0 9px; color: #175f8e; background: #fff; border: 1px solid #cad5dc; border-radius: 9px; cursor: pointer; white-space: nowrap; }
    .ai-result-heading button:hover { background: #e5ebee; }
    .ai-limit-note { margin: 4px 0 0 !important; }
    .ai-panel input, .ai-panel textarea { width: 100%; min-width: 0; padding: 7px 8px; color: #15364e; background: #fff; border: 1px solid #cad5dc; border-radius: 9px; font-weight: 400; }
    .ai-panel input { width: 90px; }
    .ai-panel textarea { min-height: 75px; max-height: 150px; resize: vertical; line-height: 1.5; }
    .ai-panel #ai-candidate { margin-top: 4px; }
    .ai-panel textarea[readonly] { background: #fbfaf6; }
    .ai-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; margin-top: 10px; }
    .ai-actions button { min-height: 30px; padding: 0 9px; color: #15364e; background: #fff; border: 1px solid #cad5dc; border-radius: 9px; cursor: pointer; }
    .ai-actions button.primary { color: #fff; background: #175f8e; border-color: #175f8e; }
    .ai-actions button:disabled { opacity: .55; cursor: not-allowed; }
    .ai-error { color: #a33b34 !important; }
    @media (max-width: 520px) { .shell { inset: 6px; width: calc(100vw - 12px) !important; height: calc(100vh - 12px); } .resize-handle { display: none; } }
    @media (prefers-reduced-motion: reduce) { .shell, .toast { transition-duration: .01ms; } .entry:active { transform: none; } }
  `;

  function emptyContext() {
    return { label: "", ariaLabel: "", placeholder: "", name: "", id: "", nearbyText: "" };
  }

  function isEditable(element) {
    if (!(element instanceof Element)) return false;
    if (shadow && element.getRootNode() === shadow) return false;
    if (element.closest(`#${ROOT_ID}`)) return false;
    if (element.matches("textarea:not([disabled]):not([readonly])")) return true;
    if (element.matches("[contenteditable='true'], [contenteditable='plaintext-only']")) return true;
    if (!element.matches("input:not([disabled]):not([readonly])")) return false;
    return ["text", "email", "tel", "url", "search", "password"].includes((element.type || "text").toLowerCase());
  }

  function textOfIds(ids) {
    return String(ids || "")
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
  }

  function compactText(value, limit = 120) {
    return String(value || "").replace(/\s+/g, " ").replace(/[：:*]+$/g, "").trim().slice(0, limit);
  }

  function contextFor(element) {
    const explicitLabels = element.labels ? Array.from(element.labels).map((label) => label.textContent) : [];
    const ariaLabelled = textOfIds(element.getAttribute("aria-labelledby"));
    const fieldsetLegend = element.closest("fieldset")?.querySelector(":scope > legend")?.textContent || "";
    const row = element.closest(".form-item, .form-group, .field, .ant-form-item, .el-form-item, [class*='formItem'], [class*='form-item']");
    let nearby = "";
    if (row) {
      const label = row.querySelector("label, .label, [class*='label'], dt, th");
      nearby = label?.textContent || "";
    }
    if (!nearby) nearby = element.previousElementSibling?.textContent || fieldsetLegend;

    return {
      label: compactText(explicitLabels.join(" ") || ariaLabelled || nearby),
      ariaLabel: compactText(element.getAttribute("aria-label")),
      placeholder: compactText(element.getAttribute("placeholder")),
      name: compactText(element.getAttribute("name")),
      id: compactText(element.id),
      nearbyText: compactText([nearby, fieldsetLegend].filter(Boolean).join(" "))
    };
  }

  function contextName(context) {
    return context.label || context.ariaLabel || context.placeholder || context.name || context.id || "未识别字段";
  }

  function saveSelection(target) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.__jobClipboardSelection = {
        start: target.selectionStart,
        end: target.selectionEnd
      };
      return;
    }
    if (target.isContentEditable) {
      const selection = document.getSelection();
      if (selection?.rangeCount) lastRange = selection.getRangeAt(0).cloneRange();
    }
  }

  function handleFocus(event) {
    const target = event.composedPath?.()[0] || event.target;
    if (!isEditable(target)) return;
    if (target === lastTarget) { saveSelection(target); return; }
    setTarget(target);
    activeMatchIndex = 0;
    aiMatched = false;
    aiMatching = false;
    matchRequestId++;
    render();
    jumpToMatch(0);
    if (aiAutoMatchEnabled && host?.dataset.open === "true") void runAiMatch();
  }

  function setTarget(target) {
    lastTarget = target;
    saveSelection(target);
    fieldContext = contextFor(target);
    updateSuggestions();
  }

  document.addEventListener("focusin", handleFocus, true);
  document.addEventListener("keyup", (event) => {
    if (event.target === lastTarget) saveSelection(lastTarget);
  }, true);
  document.addEventListener("select", (event) => {
    if (event.target === lastTarget) saveSelection(lastTarget);
  }, true);

  function updateSuggestions() {
    if (!matcherModule?.matchFieldEntries || !lastTarget) {
      suggestedIds = [];
      return;
    }
    suggestedIds = matcherModule.matchFieldEntries(fieldContext, entries, { minScore: 0.4, limit: entries.length })
      .map((match) => match.entry.id);
    activeMatchIndex = Math.min(activeMatchIndex, Math.max(0, suggestedIds.length - 1));
  }

  async function loadEntries() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    entries = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    sortEntries();
    updateSuggestions();
  }

  function sortEntries() {
    entries.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(a.title).localeCompare(String(b.title), "zh-CN"));
    filteredEntries = entries;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.jobClipboardAiConfig) {
      aiMatchCache.clear();
      aiAutoMatchEnabled = changes.jobClipboardAiConfig.newValue?.autoMatch === true;
      matchRequestId++;
      aiMatching = false;
      const hadAiMatch = aiMatched;
      aiMatched = false;
      if (hadAiMatch) updateSuggestions();
      if (aiAutoMatchEnabled && host?.dataset.open === "true" && lastTarget) void runAiMatch();
      else if (hadAiMatch) render();
    }
    if (!changes[STORAGE_KEY]) return;
    entries = Array.isArray(changes[STORAGE_KEY].newValue) ? changes[STORAGE_KEY].newValue : [];
    aiMatchCache.clear();
    aiMatched = false;
    matchRequestId++;
    aiMatching = false;
    sortEntries();
    updateSuggestions();
    render();
  });

  function writeNativeValue(target, value) {
    const current = String(target.value || "");
    const saved = target.__jobClipboardSelection || {};
    const start = Number.isInteger(saved.start) ? saved.start : current.length;
    const end = Number.isInteger(saved.end) ? saved.end : start;
    const next = current.slice(0, start) + value + current.slice(end);
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(target, next);
    else target.value = next;
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.focus();
    const cursor = start + value.length;
    try { target.setSelectionRange(cursor, cursor); } catch (_) {}
    target.__jobClipboardSelection = { start: cursor, end: cursor };
  }

  function writeContentEditable(target, value) {
    target.focus();
    const selection = document.getSelection();
    if (lastRange && target.contains(lastRange.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(lastRange);
    }
    if (!document.execCommand("insertText", false, value)) {
      const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
      range.deleteContents();
      const node = document.createTextNode(value);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }

  async function copyFallback(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      return copied;
    }
  }

  async function useEntry(entry) {
    if (!entry?.content) return;
    if (!lastTarget || !lastTarget.isConnected || !isEditable(lastTarget)) {
      const copied = await copyFallback(entry.content);
      toast(copied ? "未找到有效输入框，内容已复制" : "请重新点击网页中的输入框");
      return;
    }
    try {
      if (lastTarget instanceof HTMLInputElement || lastTarget instanceof HTMLTextAreaElement) {
        writeNativeValue(lastTarget, entry.content);
      } else {
        writeContentEditable(lastTarget, entry.content);
      }
      toast(`已填入「${entry.title}」`);
    } catch (_) {
      const copied = await copyFallback(entry.content);
      toast(copied ? "网页拒绝直接填入，内容已复制" : "填入失败，请重新选择输入框");
    }
  }

  function isSensitive(entry) {
    return /(身份证|证件号|银行卡|密码|住址|家庭地址)/.test(`${entry.title} ${entry.category}`);
  }

  function preview(entry) {
    const value = String(entry.content || "").replace(/\s+/g, " ").trim();
    if (isSensitive(entry) && value.length > 4) return `••••••${value.slice(-4)}`;
    return value.length > 76 ? `${value.slice(0, 76)}…` : value;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  }

  function entryMetadata(entry) {
    const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
    return {
      groupId: String(entry?.groupId || metadata.groupId || "").trim(),
      groupLabel: String(entry?.groupLabel || metadata.groupLabel || "").trim(),
      fieldLabel: String(entry?.fieldLabel || metadata.fieldLabel || entry?.title || "未命名资料").trim(),
      sortOrder: Number.isFinite(Number(entry?.sortOrder ?? metadata.sortOrder)) ? Number(entry?.sortOrder ?? metadata.sortOrder) : 999
    };
  }

  function normalizedModuleName(entry) {
    const raw = String(entry?.module || entry?.category || "其他").trim() || "其他";
    return MODULE_ALIASES[raw] || raw;
  }

  function groupedModules(list) {
    const modules = new Map();
    list.forEach((entry) => {
      const moduleName = normalizedModuleName(entry);
      if (!modules.has(moduleName)) modules.set(moduleName, []);
      modules.get(moduleName).push(entry);
    });

    return Array.from(modules, ([name, items]) => ({ name, items })).sort((a, b) => {
      const aIndex = MODULE_ORDER.indexOf(a.name);
      const bIndex = MODULE_ORDER.indexOf(b.name);
      if (aIndex >= 0 || bIndex >= 0) {
        if (aIndex < 0) return 1;
        if (bIndex < 0) return -1;
        return aIndex - bIndex;
      }
      if (a.name === "其他") return 1;
      if (b.name === "其他") return -1;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }

  function recordGroups(items) {
    const records = new Map();
    items.forEach((entry) => {
      const metadata = entryMetadata(entry);
      const key = metadata.groupId || (metadata.groupLabel ? `label:${metadata.groupLabel}` : "ungrouped");
      if (!records.has(key)) records.set(key, { label: metadata.groupLabel, items: [] });
      records.get(key).items.push(entry);
    });
    return Array.from(records.values()).map((record) => ({
      ...record,
      items: record.items.sort((a, b) => entryMetadata(a).sortOrder - entryMetadata(b).sortOrder)
    }));
  }

  function updateSearchResults() {
    const query = searchQuery.trim().toLowerCase();
    searchIds = query ? groupedModules(entries)
      .flatMap(({ items }) => recordGroups(items).flatMap((record) => record.items))
      .filter((entry) => {
        const metadata = entryMetadata(entry);
        return [entry.title, entry.category, entry.module, metadata.fieldLabel, metadata.groupLabel, ...(entry.aliases || []), entry.content]
          .join(" ").toLowerCase().includes(query);
      }).map((entry) => entry.id) : [];
    activeSearchIndex = Math.min(activeSearchIndex, Math.max(0, searchIds.length - 1));
  }

  function searchNavMarkup() {
    if (!searchQuery.trim()) return "";
    if (!searchIds.length) return `<span role="status">没有找到匹配资料</span>`;
    return `<div class="match-nav"><span class="search-count">${activeSearchIndex + 1} / ${searchIds.length} 搜索结果</span><button type="button" data-action="previous-search" aria-label="上一个搜索结果" title="上一个搜索结果" ${activeSearchIndex === 0 ? "disabled" : ""}>${icons.up}</button><button type="button" data-action="next-search" aria-label="下一个搜索结果" title="下一个搜索结果" ${activeSearchIndex === searchIds.length - 1 ? "disabled" : ""}>${icons.chevron}</button></div>`;
  }

  function ensureUi() {
    if (host?.isConnected) return;
    host = document.createElement("aside");
    host.id = ROOT_ID;
    host.setAttribute("aria-label", "网申资料夹");
    document.documentElement.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.appendChild(style);
    const app = document.createElement("div");
    app.id = "app";
    shadow.appendChild(app);
    shadow.addEventListener("click", handleUiClick);
    shadow.addEventListener("input", handleUiInput);
    shadow.addEventListener("keydown", handleUiKeydown);
    shadow.addEventListener("paste", handleSidebarPaste);
    shadow.addEventListener("pointerdown", handleRailPointerDown);
  }

  function render() {
    if (!shadow) return;
    const app = shadow.getElementById("app");
    const previousEntries = app.querySelector("#entries");
    const previousScrollTop = previousEntries?.scrollTop || 0;
    filteredEntries = entries;
    updateSearchResults();
    const modules = groupedModules(entries);
    const fieldName = contextName(fieldContext);
    const suggestionCount = suggestedIds.length;

    host.dataset.collapsed = String(railCollapsed);
    app.innerHTML = `
      <button class="collapsed-tab" data-action="expand" type="button" aria-label="展开网申资料夹">${icons.expand}<span>资料夹</span></button>
      <section class="shell ${aiDraft ? "ai-active" : ""}" role="complementary" aria-label="网申资料夹" tabindex="-1">
        <span class="resize-handle" data-resize-handle aria-hidden="true"></span>
        <header class="topbar" data-drag-handle>
          <button class="icon-button" data-action="collapse" aria-label="收起侧栏" title="收起侧栏">${icons.collapse}</button>
          <div><p class="brand">网申资料夹</p></div>
          <div class="top-actions">
            <button class="icon-button" data-action="settings" aria-label="设置" title="设置">${icons.settings}</button>
            <button class="icon-button" data-action="close" aria-label="关闭侧栏">${icons.close}</button>
          </div>
        </header>
        <div class="field-strip ${lastTarget ? "ready" : "waiting"}">
          <span class="status-mark" aria-hidden="true"></span>
          <div><span class="field-caption">当前字段</span><strong>${escapeHtml(lastTarget ? fieldName : "请先点击网页输入框")}</strong></div>
          ${aiMatching ? `<span class="ai-match-status" role="status">AI 识别中…</span>` : suggestionCount ? `<div class="match-nav"><span class="match-count">${aiMatched ? "AI " : ""}${activeMatchIndex + 1} / ${suggestionCount} 匹配</span>${suggestionCount > 1 ? `<button type="button" data-action="previous-match" aria-label="上一个匹配" title="上一个匹配" ${activeMatchIndex === 0 ? "disabled" : ""}>${icons.up}</button><button type="button" data-action="next-match" aria-label="下一个匹配" title="下一个匹配" ${activeMatchIndex === suggestionCount - 1 ? "disabled" : ""}>${icons.chevron}</button>` : ""}</div>` : ""}
        </div>
        <div class="search-wrap">${icons.search}<input id="search" type="search" value="${escapeHtml(searchQuery)}" placeholder="搜索姓名、学校、个人评价…" aria-label="搜索资料"><div class="search-nav">${searchNavMarkup()}</div></div>
        <div class="toolbar">
          <button class="add-button" data-action="toggle-add">${icons.plus}<span>粘贴新建</span></button>
          <button class="text-button" data-action="settings">管理资料</button>
        </div>
        ${aiDraft ? aiPanelMarkup() : ""}
        ${pendingPaste ? `
          <aside class="title-prompt" role="status">
            <strong>准备新建资料</strong>
            <p class="paste-preview" title="${escapeHtml(pendingPaste.content)}">${escapeHtml(pendingPaste.content)}</p>
            <form id="paste-confirm-form">
              <input name="title" value="${escapeHtml(pendingPaste.titleDetected ? pendingPaste.title : "")}" placeholder="标题（选填）" aria-label="资料标题" autofocus>
              <button type="submit">保存</button>
              <button type="button" data-action="cancel-paste">取消</button>
            </form>
          </aside>` : ""}
        ${quickAddOpen ? `
          <form class="quick-add" id="quick-add-form">
            <label>标题<input name="title" required placeholder="例如：个人评价"></label>
            <label>内容<textarea name="content" required autofocus placeholder="在这里按 Ctrl+V"></textarea></label>
            <div class="form-actions"><button type="button" data-action="cancel-add">取消</button><button type="submit">保存</button></div>
          </form>` : ""}
        <main class="entries" id="entries">${entriesMarkup(modules)}</main>
        <footer><span>${entries.length} 条本地资料</span><button data-action="settings">管理与备份</button></footer>
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
      </section>`;
    const shell = app.querySelector(".shell");
    const nextEntries = app.querySelector("#entries");
    if (nextEntries) nextEntries.scrollTop = previousScrollTop;
    if (shell && railPosition && window.innerWidth > 520) {
      shell.style.left = `${Math.min(railPosition.left, Math.max(0, window.innerWidth - railPosition.width))}px`;
      shell.style.top = `${Math.min(railPosition.top, Math.max(0, window.innerHeight - railPosition.height))}px`;
      shell.style.width = `${Math.min(railPosition.width, window.innerWidth - 12)}px`;
      shell.style.height = `${Math.min(railPosition.height, window.innerHeight)}px`;
      shell.style.right = "auto";
      shell.style.bottom = "auto";
    }
  }

  function entriesMarkup(modules) {
    return filteredEntries.length ? modules.map(({ name, items }) => `
      <section class="group">
        <h2 class="group-heading"><button class="group-toggle" data-action="toggle-module" data-module="${escapeHtml(name)}" type="button" aria-expanded="${String(!collapsedModules.has(name))}">${icons.chevron}<span>${escapeHtml(name)}</span><span class="group-count">${items.length}</span></button></h2>
        ${collapsedModules.has(name) ? "" : recordGroups(items).map(({ label, items: recordItems }) => `
          <div class="record">
            ${label && label !== name ? `<h3 class="record-heading"><span>${escapeHtml(label)}</span></h3>` : ""}
            <div class="entry-list">${recordItems.map(entryTemplate).join("")}</div>
          </div>`).join("")}
      </section>`).join("") : emptyTemplate(false);
  }

  function renderEntries() {
    updateSearchResults();
    const nav = shadow?.querySelector(".search-nav");
    if (nav) nav.innerHTML = searchNavMarkup();
  }

  function jumpToMatch(index) {
    if (!suggestedIds.length || index < 0 || index >= suggestedIds.length || !shadow) return;
    activeMatchIndex = index;
    const id = suggestedIds[index];
    const group = groupedModules(entries).find(({ items }) => items.some((entry) => entry.id === id));
    if (group && collapsedModules.delete(group.name)) render();
    const list = shadow.getElementById("entries");
    const card = Array.from(list?.querySelectorAll("[data-entry-id]") || []).find((item) => item.dataset.entryId === id);
    if (!list || !card) return;
    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    list.scrollTop += cardRect.top - listRect.top - 8;
    list.querySelectorAll(".current-match").forEach((item) => item.classList.remove("current-match"));
    card.classList.add("current-match");
    const count = shadow.querySelector(".match-count");
    if (count) count.textContent = `${aiMatched ? "AI " : ""}${index + 1} / ${suggestedIds.length} 匹配`;
    const previous = shadow.querySelector('[data-action="previous-match"]');
    const next = shadow.querySelector('[data-action="next-match"]');
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === suggestedIds.length - 1;
  }

  function jumpToSearch(index) {
    if (!searchIds.length || index < 0 || index >= searchIds.length || !shadow) return;
    activeSearchIndex = index;
    const id = searchIds[index];
    const group = groupedModules(entries).find(({ items }) => items.some((entry) => entry.id === id));
    if (group && collapsedModules.delete(group.name)) render();
    const list = shadow.getElementById("entries");
    const card = Array.from(list?.querySelectorAll("[data-entry-id]") || []).find((item) => item.dataset.entryId === id);
    if (!list || !card) return;
    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    list.scrollTop += cardRect.top - listRect.top - 8;
    list.querySelectorAll(".current-search").forEach((item) => item.classList.remove("current-search"));
    card.classList.add("current-search");
    const nav = shadow.querySelector(".search-nav");
    if (nav) nav.innerHTML = searchNavMarkup();
  }

  async function runAiMatch() {
    if (!aiAutoMatchEnabled || aiMatching || !lastTarget || !entries.length || host?.dataset.open !== "true") return;
    const requestId = ++matchRequestId;
    const context = { ...fieldContext };
    const cacheKey = JSON.stringify(context);
    const cached = aiMatchCache.get(cacheKey);
    if (cached) {
      suggestedIds = cached.filter((id) => entries.some((entry) => entry.id === id));
      aiMatched = true;
      activeMatchIndex = 0;
      render();
      jumpToMatch(0);
      return;
    }
    aiMatching = true;
    render();
    try {
      const response = await chrome.runtime.sendMessage({ type: "JOB_CLIPBOARD_MATCH", context });
      if (requestId !== matchRequestId || host?.dataset.open !== "true") return;
      if (!response?.ok) throw new Error(response?.error || "AI 识别失败");
      suggestedIds = (Array.isArray(response.entryIds) ? response.entryIds : [])
        .filter((id) => entries.some((entry) => entry.id === id));
      aiMatchCache.set(cacheKey, suggestedIds);
      if (aiMatchCache.size > 30) aiMatchCache.delete(aiMatchCache.keys().next().value);
      aiMatched = true;
      activeMatchIndex = 0;
      aiMatching = false;
      render();
      if (suggestedIds.length) jumpToMatch(0);
      else toast("AI 没有找到合适的资料，请手动搜索");
    } catch (error) {
      if (requestId !== matchRequestId) return;
      aiMatching = false;
      render();
      toast(error instanceof Error ? error.message : "AI 识别失败");
    }
  }

  function entryTemplate(entry) {
    const suggestedIndex = suggestedIds.indexOf(entry.id);
    const suggested = suggestedIndex >= 0;
    const metadata = entryMetadata(entry);
    return `<div class="entry-wrap">
      <button class="entry ${suggested ? "suggested" : ""} ${suggestedIndex === activeMatchIndex ? "current-match" : ""}" data-entry-id="${escapeHtml(entry.id)}" type="button">
        <span class="entry-rail">${suggested ? `<b>${suggestedIndex + 1}</b>` : ""}</span>
        <span class="entry-body">
          <span class="entry-title">${entry.pinned ? icons.pin : ""}<strong>${escapeHtml(metadata.fieldLabel)}</strong>${suggested ? `<em>匹配</em>` : ""}</span>
          <span class="entry-preview">${escapeHtml(preview(entry) || "空内容")}</span>
        </span>
        <span class="entry-action">填入</span>
      </button>
      ${String(entry.content || "").length >= 100 && !isSensitive(entry) ? `<button class="compress-button" type="button" data-action="compress" data-compress-id="${escapeHtml(entry.id)}" aria-label="压缩${escapeHtml(entry.title)}">压缩</button>` : ""}
    </div>`;
  }

  function aiPanelMarkup() {
    const source = entries.find((item) => item.id === aiDraft.entryId);
    if (!source) return "";
    const count = Array.from(aiDraft.candidate || "").length;
    const overLimit = count > aiDraft.limit;
    return `<section class="ai-panel" aria-label="AI 长文本压缩">
      <h2>压缩「${escapeHtml(source.title)}」</h2>
      <p>只有点击“修改”，才会把下方这一张卡的原文发送到你配置的 API。请核对生成稿，AI 可能删错事实。</p>
      <label for="ai-limit">最多保留多少字（含标点和空格）</label>
      <input id="ai-limit" type="number" min="20" max="1000" step="1" value="${aiDraft.limit}" aria-describedby="ai-limit-note" ${aiDraft.candidate ? "disabled" : ""}>
      <p class="ai-limit-note" id="ai-limit-note">这是字数上限，不是要求恰好写满；超出上限的生成稿不能填入或另存。${aiDraft.candidate ? "如需更改上限，请取消后重新开始。" : ""}</p>
      <label>将发送的原文<textarea readonly>${escapeHtml(source.content)}</textarea></label>
      ${aiDraft.candidate ? `<div class="ai-result-heading"><label for="ai-candidate">生成稿（可编辑，<span id="ai-count">${count}</span> 字）</label><button type="button" data-action="copy-compressed" aria-label="复制生成稿">复制</button></div><textarea id="ai-candidate">${escapeHtml(aiDraft.candidate)}</textarea><p id="ai-length-status" class="${overLimit ? "ai-error" : ""}" role="status">${overLimit ? `超过 ${aiDraft.limit} 字上限，请先删减。` : `符合 ${aiDraft.limit} 字上限，请核对事实后再填入。`}</p>` : ""}
      ${aiDraft.error ? `<p class="ai-error" role="alert">${escapeHtml(aiDraft.error)}</p>` : ""}
      <div class="ai-actions">
        <button type="button" data-action="cancel-compress">取消</button>
        ${aiDraft.candidate ? `<button type="button" data-action="save-compressed" ${overLimit ? "disabled" : ""}>另存为卡片</button><button class="primary" type="button" data-action="fill-compressed" ${overLimit ? "disabled" : ""}>确认填入</button>` : `<button class="primary" type="button" data-action="generate-compressed" ${aiDraft.loading ? "disabled" : ""}>${aiDraft.loading ? "修改中…" : "修改"}</button>`}
      </div>
    </section>`;
  }

  function emptyTemplate(hasQuery) {
    return `<div class="empty"><strong>${hasQuery ? "没有找到匹配资料" : "还没有保存资料"}</strong><p>${hasQuery ? "换一个关键词，或前往资料管理添加内容。" : "前往资料管理填写模板，或直接在侧栏粘贴新建。"}</p><button data-action="settings">打开资料管理</button></div>`;
  }

  function handleUiInput(event) {
    if (event.target.id === "ai-candidate" && aiDraft) {
      aiDraft.candidate = event.target.value;
      const count = Array.from(aiDraft.candidate).length;
      const counter = shadow.querySelector("#ai-count");
      if (counter) counter.textContent = String(count);
      const overLimit = count > aiDraft.limit;
      for (const action of ["save-compressed", "fill-compressed"]) {
        const button = shadow.querySelector(`[data-action="${action}"]`);
        if (button) button.disabled = overLimit;
      }
      const lengthStatus = shadow.querySelector("#ai-length-status");
      if (lengthStatus) {
        lengthStatus.textContent = overLimit ? `超过 ${aiDraft.limit} 字上限，请先删减。` : `符合 ${aiDraft.limit} 字上限，请核对事实后再填入。`;
        lengthStatus.classList.toggle("ai-error", overLimit);
      }
    }
    if (event.target.id === "search") {
      searchQuery = event.target.value;
      activeSearchIndex = 0;
      renderEntries();
      if (searchIds.length) {
        jumpToSearch(0);
        const input = shadow.querySelector("#search");
        if (input !== event.target) {
          input?.focus({ preventScroll: true });
          input?.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      } else {
        shadow.querySelectorAll(".current-search").forEach((item) => item.classList.remove("current-search"));
      }
    }
  }

  function handleUiKeydown(event) {
    if (event.key === "Escape") close();
  }

  function isSidebarEditable(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  }

  function handleRailPointerDown(event) {
    const shell = shadow?.querySelector(".shell");
    if (!shell || event.button !== 0) return;
    const resizeHandle = event.target.closest?.("[data-resize-handle]");
    const dragHandle = event.target.closest?.("[data-drag-handle]");
    if (!resizeHandle && (!dragHandle || event.target.closest?.("button"))) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, rect: shell.getBoundingClientRect() };
    const minWidth = 300;
    const maxWidth = Math.min(700, window.innerWidth - 12);
    const move = (moveEvent) => {
      if (resizeHandle) {
        const width = Math.min(maxWidth, Math.max(minWidth, start.rect.right - moveEvent.clientX));
        const left = Math.max(0, start.rect.right - width);
        shell.style.width = `${width}px`;
        shell.style.left = `${left}px`;
        shell.style.right = "auto";
        railPosition = { left, top: start.rect.top, width, height: start.rect.height };
        return;
      }
      const left = Math.min(window.innerWidth - start.rect.width, Math.max(0, start.rect.left + moveEvent.clientX - start.x));
      const top = Math.min(window.innerHeight - start.rect.height, Math.max(0, start.rect.top + moveEvent.clientY - start.y));
      shell.style.left = `${left}px`;
      shell.style.top = `${top}px`;
      shell.style.right = "auto";
      shell.style.bottom = "auto";
      railPosition = { left, top, width: start.rect.width, height: start.rect.height };
    };
    const end = () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", end, true);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
  }

  function handleSidebarPaste(event) {
    if (isSidebarEditable(event.target)) return;
    const text = event.clipboardData?.getData("text/plain") || "";
    const parsed = pasteParserModule?.parsePastedCard?.(text);
    if (!parsed) return;
    event.preventDefault();
    pendingPaste = parsed;
    render();
    shadow.querySelector("#paste-confirm-form input")?.focus();
  }

  async function handleUiClick(event) {
    const compressButton = event.target.closest?.("[data-compress-id]");
    if (compressButton) {
      aiDraft = { entryId: compressButton.dataset.compressId, limit: 100, candidate: "", loading: false, error: "" };
      render();
      shadow.querySelector("#ai-limit")?.focus();
      return;
    }
    const entryButton = event.target.closest?.("[data-entry-id]");
    if (entryButton) {
      const entry = entries.find((item) => item.id === entryButton.dataset.entryId);
      await useEntry(entry);
      return;
    }
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action === "previous-match" || action === "next-match") {
      jumpToMatch(activeMatchIndex + (action === "next-match" ? 1 : -1));
      return;
    }
    if (action === "previous-search" || action === "next-search") {
      jumpToSearch(activeSearchIndex + (action === "next-search" ? 1 : -1));
      return;
    }
    if (action === "cancel-compress") { aiDraft = null; render(); return; }
    if (action === "copy-compressed") {
      const candidate = shadow.querySelector("#ai-candidate")?.value || "";
      const copied = candidate && await copyFallback(candidate);
      toast(copied ? "生成稿已复制" : "复制失败，请选中文字后手动复制");
      return;
    }
    if (action === "generate-compressed") { await generateCompressed(); return; }
    if (action === "fill-compressed") { await confirmCompressed(false); return; }
    if (action === "save-compressed") { await confirmCompressed(true); return; }
    if (action === "close") close();
    if (action === "collapse") { railCollapsed = true; render(); }
    if (action === "expand") { railCollapsed = false; render(); }
    if (action === "settings") chrome.runtime.sendMessage({ type: "JOB_CLIPBOARD_OPEN_OPTIONS" });
    if (action === "toggle-add") { quickAddOpen = !quickAddOpen; render(); shadow.querySelector("textarea")?.focus(); }
    if (action === "cancel-add") { quickAddOpen = false; render(); }
    if (action === "cancel-paste") { pendingPaste = null; render(); toast("已取消新建"); }
    if (action === "toggle-module") {
      const moduleName = event.target.closest("[data-module]")?.dataset.module;
      if (moduleName) {
        if (collapsedModules.has(moduleName)) collapsedModules.delete(moduleName);
        else collapsedModules.add(moduleName);
        render();
      }
    }
    if (!isSidebarEditable(event.target) && !event.target.closest?.("button, a")) {
      shadow.querySelector(".shell")?.focus({ preventScroll: true });
    }
  }

  async function generateCompressed() {
    if (!aiDraft || aiDraft.loading) return;
    const limit = Number(shadow.querySelector("#ai-limit")?.value);
    if (!Number.isInteger(limit) || limit < 20 || limit > 1000) { aiDraft.error = "目标字数应在 20 到 1000 之间"; render(); return; }
    aiDraft.limit = limit;
    aiDraft.loading = true;
    aiDraft.error = "";
    const requestedEntryId = aiDraft.entryId;
    render();
    try {
      const response = await chrome.runtime.sendMessage({ type: "JOB_CLIPBOARD_COMPRESS", entryId: requestedEntryId, limit });
      if (!aiDraft || aiDraft.entryId !== requestedEntryId) return;
      if (!response?.ok) throw new Error(response?.error || "生成失败");
      aiDraft.candidate = String(response.candidate || "").trim();
      if (!aiDraft.candidate) throw new Error("模型没有返回文本");
    } catch (error) {
      if (aiDraft?.entryId === requestedEntryId) aiDraft.error = error instanceof Error ? error.message : "生成失败";
    } finally {
      if (aiDraft?.entryId === requestedEntryId) { aiDraft.loading = false; render(); }
    }
  }

  async function confirmCompressed(saveAsCard) {
    if (!aiDraft) return;
    const candidate = String(shadow.querySelector("#ai-candidate")?.value || "").trim();
    if (!candidate) { aiDraft.error = "生成稿不能为空"; render(); return; }
    if (Array.from(candidate).length > aiDraft.limit) { aiDraft.error = `仍超过 ${aiDraft.limit} 字，请继续删减。`; render(); return; }
    const original = entries.find((entry) => entry.id === aiDraft.entryId);
    if (!original) { aiDraft = null; render(); return; }
    if (saveAsCard) {
      const now = new Date().toISOString();
      entries.unshift({ id: crypto.randomUUID(), title: `${original.title}｜${aiDraft.limit}字版`, content: candidate, category: "粘贴资料", aliases: [], pinned: false, createdAt: now, updatedAt: now });
      await chrome.storage.local.set({ [STORAGE_KEY]: entries });
      sortEntries();
      aiDraft = null;
      render();
      toast("压缩版已另存为新卡片，原文未改动");
    } else {
      aiDraft = null;
      render();
      await useEntry({ title: `${original.title}｜压缩版`, content: candidate });
    }
  }

  async function saveQuickAdd(form) {
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const content = String(data.get("content") || "");
    if (!title || !content) return;
    entries.unshift({
      id: crypto.randomUUID(), title, content, category: "粘贴资料", aliases: [], pinned: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: entries });
    quickAddOpen = false;
    sortEntries();
    render();
    toast("资料已保存在本地");
  }

  function attachSubmitHandler() {
    shadow.addEventListener("submit", (event) => {
      if (event.target.id === "paste-confirm-form") {
        event.preventDefault();
        savePendingPaste(event.target);
        return;
      }
      if (event.target.id !== "quick-add-form") return;
      event.preventDefault();
      saveQuickAdd(event.target);
    });
  }

  async function savePendingPaste(form) {
    if (!pendingPaste) return;
    const title = String(new FormData(form).get("title") || "").trim() || "未命名资料";
    const now = new Date().toISOString();
    const entry = { id: crypto.randomUUID(), title, content: pendingPaste.content, category: "粘贴资料", aliases: [], pinned: false, createdAt: now, updatedAt: now };
    pendingPaste = null;
    entries.unshift(entry);
    await chrome.storage.local.set({ [STORAGE_KEY]: entries });
    sortEntries();
    render();
    toast(`已新建「${title}」`);
  }

  function toast(message) {
    const element = shadow?.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("visible"), 2400);
  }

  function open() {
    ensureUi();
    const active = document.activeElement;
    if (isEditable(active) && active !== lastTarget) { setTarget(active); activeMatchIndex = 0; }
    collapsedModules.clear();
    MODULE_ORDER.forEach((name) => collapsedModules.add(name));
    groupedModules(entries).forEach(({ name }) => collapsedModules.add(name));
    host.dataset.open = "true";
    render();
    chrome.storage.local.get("jobClipboardAiConfig").then((result) => {
      aiAutoMatchEnabled = result.jobClipboardAiConfig?.autoMatch === true;
      if (aiAutoMatchEnabled) void runAiMatch();
    });
  }

  function close() {
    matchRequestId++;
    aiMatching = false;
    if (host) host.dataset.open = "false";
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "JOB_CLIPBOARD_TOGGLE") return;
    ensureUi();
    if (host.dataset.open === "true") close();
    else open();
  });

  import(chrome.runtime.getURL("src/shared/field-matcher.js"))
    .then((module) => { matcherModule = module; if (!aiMatched) updateSuggestions(); render(); })
    .catch(() => { matcherModule = null; });
  import(chrome.runtime.getURL("src/shared/paste-parser.js"))
    .then((module) => { pasteParserModule = module; })
    .catch(() => { pasteParserModule = null; });
  loadEntries().then(() => { render(); if (aiAutoMatchEnabled) void runAiMatch(); });
  ensureUi();
  attachSubmitHandler();
})();
