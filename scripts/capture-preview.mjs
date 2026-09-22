import { chromium } from "file:///C:/Users/46117/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(".impeccable/review");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});

const addChromePreview = (page) => page.addInitScript(() => {
  window.chrome = {
    storage: {
      local: {
        get: async () => ({ jobFormClipboardEntries: [] }),
        set: async () => undefined
      }
    }
  };
});

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await addChromePreview(desktop);
await desktop.goto("http://127.0.0.1:8765/src/options/options.html", { waitUntil: "networkidle" });
await desktop.locator("#ai-settings summary").click();
await desktop.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await addChromePreview(mobile);
await mobile.goto("http://127.0.0.1:8765/src/options/options.html", { waitUntil: "networkidle" });
await mobile.locator("#ai-settings summary").click();
await mobile.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });

const form = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await form.goto("http://127.0.0.1:8765/tests/fixtures/form-playground.html", { waitUntil: "networkidle" });
await form.locator("#self-evaluation").click();
await form.locator("#job-form-clipboard-root").evaluate((host) => {
  const button = [...host.shadowRoot.querySelectorAll("[data-entry-id]")].find((item) => item.textContent.includes("个人评价"));
  button.click();
});
await form.screenshot({ path: path.join(output, "form-sidebar.png"), fullPage: true });

await browser.close();
console.log(`Screenshots written to ${output}`);
