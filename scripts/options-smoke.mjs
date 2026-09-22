import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/46117/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.__savedEntries = [];
    window.__aiConfig = null;
    window.__aiKey = null;
    window.chrome = {
      permissions: { request: async () => true },
      runtime: { sendMessage: async (message) => {
        window.__aiTestRequest = message;
        return { ok: true };
      } },
      storage: {
        local: {
          get: async () => ({ jobFormClipboardEntries: window.__savedEntries, jobClipboardAiConfig: window.__aiConfig }),
          set: async (value) => {
            if (value.jobFormClipboardEntries) window.__savedEntries = value.jobFormClipboardEntries;
            if (value.jobClipboardAiConfig) window.__aiConfig = value.jobClipboardAiConfig;
          },
          remove: async () => { window.__aiConfig = null; }
        },
        session: {
          get: async () => ({ jobClipboardAiKey: window.__aiKey }),
          set: async (value) => { window.__aiKey = value.jobClipboardAiKey; },
          remove: async () => { window.__aiKey = null; }
        }
      }
    };
  });
  await page.goto("http://127.0.0.1:8765/src/options/options.html", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "实习经历" }).click();
  const firstRecordBox = await page.locator(".record").first().boundingBox();
  const addRecordBox = await page.getByRole("button", { name: "增加实习经历" }).boundingBox();
  assert.ok(addRecordBox.y > firstRecordBox.y + firstRecordBox.height, "add-record action must sit below the current records");
  await page.locator('input[name="field:0:company"]').fill("示例单位一");
  await page.locator('input[name="field:0:role"]').fill("示例岗位一");
  await page.getByRole("button", { name: "增加实习经历" }).click();
  await page.locator('input[name="field:1:company"]').fill("示例单位二");
  await page.locator(".record").nth(1).getByRole("button", { name: /增加自定义字段/ }).click();
  await page.locator('input[name="custom-label:1:0"]').fill("证明人");
  const customValue = page.locator('textarea[name="custom-value:1:0"]');
  assert.equal(await customValue.getAttribute("placeholder"), "填写内容，支持多行");
  await customValue.fill("示例联系人\n第二行补充信息");
  await page.getByRole("button", { name: "保存当前模块" }).click();
  const saved = await page.evaluate(() => window.__savedEntries);
  assert.equal(saved.filter((entry) => entry.metadata?.moduleId === "internship").length, 4);
  assert.equal(new Set(saved.map((entry) => entry.metadata?.groupId)).size, 2);
  assert.equal(saved.find((entry) => entry.metadata?.fieldLabel === "证明人")?.content, "示例联系人\n第二行补充信息");
  assert.equal(saved.some((entry) => !entry.content.trim()), false);
  await page.locator("#ai-settings summary").click();
  assert.equal(await page.locator("#ai-auto-match").isChecked(), false, "automatic AI matching must be off by default");
  await page.locator("#ai-endpoint").fill("https://example.test/v1/chat/completions");
  await page.locator("#ai-model").fill("mock-model");
  await page.locator("#ai-key").fill("test-only-key");
  await page.locator("#ai-auto-match").check();
  await page.getByRole("button", { name: "保存 AI 配置" }).click();
  assert.equal((await page.evaluate(() => window.__aiConfig)).autoMatch, true);
  assert.equal(await page.evaluate(() => window.__aiKey), "test-only-key");
  assert.equal(await page.locator("#ai-key").inputValue(), "", "saved key must not remain visible in the input");
  await page.getByRole("button", { name: "测试 API 连接" }).click();
  assert.equal((await page.evaluate(() => window.__aiTestRequest)).type, "JOB_CLIPBOARD_TEST_AI");
  assert.match(await page.locator("#ai-settings-status").textContent(), /API 连接成功/);
  console.log("Options smoke test passed: repeatable modules, custom fields, and empty-value omission.");
} finally {
  await browser.close();
}
