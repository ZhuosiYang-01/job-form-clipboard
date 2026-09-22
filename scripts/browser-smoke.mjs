import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/46117/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://127.0.0.1:8765/tests/fixtures/form-playground.html?manual=1", { waitUntil: "networkidle" });

  await page.locator("#self-evaluation").click();
  await page.evaluate(() => window.__jobClipboardMessage?.({ type: "JOB_CLIPBOARD_TOGGLE" }));

  const root = page.locator("#job-form-clipboard-root");
  const fieldText = await root.locator(".field-strip strong").textContent();
  assert.equal(fieldText, "个人评价", "opening must recognize the already-focused field");
  assert.equal(await page.locator("#self-evaluation").inputValue(), "", "focusing a web field must never fill it automatically");
  assert.equal(await page.evaluate(() => window.__aiMatchCalls?.length || 0), 0, "AI matching must stay off by default");
  assert.equal(await root.locator('.group-toggle[aria-expanded="true"]').count(), 0, "all modules must start collapsed");
  await root.getByRole("button", { name: "下一个匹配" }).click();
  assert.match(await root.locator(".match-count").textContent(), /^2 \/ 2/);
  assert.equal(await root.locator('[data-entry-id="demo-evaluation-alt"]').getAttribute("class").then((value) => value.includes("current-match")), true);
  assert.equal(await page.locator("#self-evaluation").inputValue(), "", "navigating matches must not fill the page");
  await root.getByRole("button", { name: "上一个匹配" }).click();
  assert.match(await root.locator(".match-count").textContent(), /^1 \/ 2/);

  const search = root.locator("#search");
  await search.fill("个人评价");
  assert.equal(await search.inputValue(), "个人评价", "search must retain multi-character input and focus");
  assert.match(await root.locator(".search-count").textContent(), /^1 \/ 2/);
  assert.ok(await root.locator(".group-toggle").count() > 1, "search must keep nonmatching modules in the list");
  await root.getByRole("button", { name: "下一个搜索结果" }).click();
  assert.match(await root.locator(".search-count").textContent(), /^2 \/ 2/);
  await root.getByRole("button", { name: "上一个搜索结果" }).click();
  assert.match(await root.locator(".search-count").textContent(), /^1 \/ 2/);

  await root.locator('[data-entry-id="demo-evaluation"]').click();
  assert.equal(
    await page.locator("#self-evaluation").inputValue(),
    "这是用于本地功能验证的示例个人评价。",
    "clicking a suggestion must fill the focused textarea"
  );

  await search.fill("");
  await root.locator('.group-toggle[data-module="项目经历"]').click();
  await root.locator('[data-compress-id="demo-long"]').click();
  assert.equal(await page.evaluate(() => window.__aiCallCount || 0), 0, "opening compression must not send text");
  await root.locator("#ai-limit").fill("100");
  await root.locator('[data-action="generate-compressed"]').click();
  await root.locator("#ai-candidate").waitFor();
  assert.equal(await page.evaluate(() => window.__aiCallCount), 1, "only explicit generation sends text");
  assert.match(await root.locator("#ai-limit-note").textContent(), /字数上限/);
  await page.setViewportSize({ width: 900, height: 500 });
  const panel = root.locator(".ai-panel");
  const scrollRange = await panel.evaluate((element) => element.scrollHeight - element.clientHeight);
  assert.ok(scrollRange > 0, "compression panel must scroll in a short viewport");
  await panel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  assert.ok(await panel.evaluate((element) => element.scrollTop) > 0, "compression panel content must be reachable by scrolling");
  await root.locator("#ai-candidate").fill("这是一段超出限制的测试文字。".repeat(10));
  assert.equal(await root.locator('[data-action="fill-compressed"]').isDisabled(), true, "over-limit text cannot be filled");
  await root.locator("#ai-candidate").fill("参与需求梳理与沟通协调。");
  assert.equal(await root.locator('[data-action="fill-compressed"]').isEnabled(), true, "edited text within limit can be filled");
  await root.locator('[data-action="copy-compressed"]').click();
  await root.locator("#toast.visible").waitFor();
  assert.match(await root.locator("#toast").textContent(), /生成稿已复制/);
  assert.equal(await root.locator("#ai-diff").count(), 0, "removed difference component must stay absent");
  await root.locator('[data-action="cancel-compress"]').click();
  await page.setViewportSize({ width: 1280, height: 800 });
  assert.equal(await root.locator("#ai-candidate").count(), 0, "cancel leaves the source unchanged");
  await root.locator(".brand").click();
  await root.locator(".shell").evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/plain", "通讯地址：示例市示例路100号");
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, composed: true, clipboardData: data }));
  });
  await root.locator("#paste-confirm-form").waitFor();
  assert.match(await root.locator(".paste-preview").textContent(), /示例市示例路100号/);
  assert.equal(await root.locator("#paste-confirm-form input").inputValue(), "通讯地址");
  await root.locator("#paste-confirm-form button[type='submit']").click();
  await root.locator('.group-toggle[data-module="粘贴资料"]').click();
  await page.waitForFunction(() => {
    const root = document.querySelector("#job-form-clipboard-root")?.shadowRoot;
    return [...(root?.querySelectorAll(".entry-title strong") || [])].some((item) => item.textContent === "通讯地址");
  });
  assert.equal(
    await root.locator(".entry-title strong", { hasText: "通讯地址" }).count(),
    1,
    "pasting on a non-editable sidebar area must create a parsed card"
  );
  assert.equal(await root.locator(".group-toggle", { hasText: "粘贴资料" }).count(), 1, "pasted cards must use their own module");

  await root.locator(".brand").click();
  await root.locator(".shell").evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/plain", "没有显式标题的第一行\n第二行");
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, composed: true, clipboardData: data }));
  });
  await root.locator("#paste-confirm-form").waitFor();
  assert.equal(await root.locator("#paste-confirm-form input").getAttribute("placeholder"), "标题（选填）");
  const countBeforeCancel = await root.locator("[data-entry-id]").count();
  await root.getByRole("button", { name: "取消" }).click();
  assert.equal(await root.locator("[data-entry-id]").count(), countBeforeCancel, "cancelled paste must not create a card");

  const firstModule = root.locator(".group-toggle").first();
  const wasExpanded = await firstModule.getAttribute("aria-expanded");
  await firstModule.click();
  assert.notEqual(await firstModule.getAttribute("aria-expanded"), wasExpanded, "module headings must toggle");
  await root.getByRole("button", { name: "收起侧栏" }).click();
  await root.getByRole("button", { name: "展开网申资料夹" }).waitFor();
  await root.getByRole("button", { name: "展开网申资料夹" }).click();
  await root.getByRole("button", { name: "收起侧栏" }).waitFor();

  const beforeResize = await root.locator(".shell").boundingBox();
  const resizeHandle = await root.locator("[data-resize-handle]").boundingBox();
  await page.mouse.move(resizeHandle.x + resizeHandle.width / 2, resizeHandle.y + 100);
  await page.mouse.down();
  await page.mouse.move(resizeHandle.x - 70, resizeHandle.y + 100);
  await page.mouse.up();
  const afterResize = await root.locator(".shell").boundingBox();
  assert.ok(afterResize.width > beforeResize.width + 50, "dragging the left border must resize the rail");

  const brandBox = await root.locator(".brand").boundingBox();
  await page.mouse.move(brandBox.x + brandBox.width / 2, brandBox.y + brandBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(brandBox.x - 90, brandBox.y + 30);
  await page.mouse.up();
  const afterMove = await root.locator(".shell").boundingBox();
  assert.ok(afterMove.x < afterResize.x - 60, "dragging the top bar must move the rail");

  await page.setViewportSize({ width: 1280, height: 360 });
  await page.locator("#self-evaluation").evaluate((element) => element.focus());
  const list = root.locator("#entries");
  const scrollBeforeFill = await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  assert.ok(scrollBeforeFill > 0, "test sidebar must have a scrollable list");
  await root.locator('[data-entry-id="demo-long"]').evaluate((element) => element.click());
  const scrollAfterFill = await list.evaluate((element) => element.scrollTop);
  assert.ok(Math.abs(scrollAfterFill - scrollBeforeFill) < 3, "filling a field must preserve the sidebar list position");
  await page.locator("#candidate-name").evaluate((element) => element.focus());
  await page.locator("#self-evaluation").evaluate((element) => element.focus());
  const firstMatchPosition = await list.evaluate((element) => {
    const card = element.querySelector('[data-entry-id="demo-evaluation"]');
    return { top: card.getBoundingClientRect().top, listTop: element.getBoundingClientRect().top, scrollTop: element.scrollTop };
  });
  assert.ok(firstMatchPosition.scrollTop > 0, "focusing a new field must navigate to its first match");
  assert.ok(firstMatchPosition.top >= firstMatchPosition.listTop - 3, "the first match must remain visible inside the sidebar");
  const valueBeforeAiMatch = await page.locator("#self-evaluation").inputValue();
  await page.evaluate(() => {
    window.__aiConfig = { endpoint: "https://example.test/v1/chat/completions", model: "mock", autoMatch: true };
    window.__jobClipboardStorageChanged({ jobClipboardAiConfig: { newValue: window.__aiConfig } }, "local");
  });
  await page.waitForFunction(() => window.__aiMatchCalls?.length === 1);
  assert.equal(await root.locator(".match-count").textContent(), "AI 1 / 2 匹配");
  assert.equal(await page.locator("#self-evaluation").inputValue(), valueBeforeAiMatch, "AI matching must never fill the page automatically");
  await page.locator("#candidate-name").evaluate((element) => element.focus());
  await page.waitForFunction(() => window.__aiMatchCalls?.length === 2);
  assert.equal(await root.locator(".match-count").textContent(), "AI 1 / 1 匹配");
  await page.evaluate(() => {
    window.__aiConfig.autoMatch = false;
    window.__jobClipboardStorageChanged({ jobClipboardAiConfig: { newValue: window.__aiConfig } }, "local");
  });
  await page.locator("#self-evaluation").evaluate((element) => element.focus());
  assert.equal(await page.evaluate(() => window.__aiMatchCalls.length), 2, "disabling AI matching must stop requests");

  console.log("Browser smoke test passed: manual fill, match navigation, paste, collapses, resize, drag, and scroll retention.");
} finally {
  await browser.close();
}
