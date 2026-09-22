import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));

assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
assert.ok(!manifest.host_permissions, "host_permissions must stay absent");
assert.deepEqual(manifest.optional_host_permissions, ["https://*/*"], "AI network access must remain opt-in and HTTPS-only");
assert.ok(!manifest.content_scripts, "content scripts must be user-triggered");

const requiredFiles = [
  manifest.background.service_worker,
  manifest.options_page,
  "src/content/content-script.js",
  "src/options/options.js",
  "src/options/options.css",
  "src/shared/field-matcher.js",
  "src/shared/import-parser.js",
  "src/shared/paste-parser.js",
  "src/shared/profile-schema.js"
];

for (const file of requiredFiles) await access(path.join(root, file));

const scripts = [
  "src/background.js",
  "src/content/content-script.js",
  "src/options/options.js",
  "src/shared/defaults.js",
  "src/shared/storage.js",
  "src/shared/field-matcher.js",
  "src/shared/import-parser.js",
  "src/shared/paste-parser.js",
  "src/shared/profile-schema.js"
];

for (const file of scripts) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.equal(result.status, 0, `${file} syntax error:\n${result.stderr}`);
  const source = await readFile(path.join(root, file), "utf8");
  if (file !== "src/background.js") assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source), `${file} contains an unexpected network API`);
  else assert.ok(!/\b(XMLHttpRequest|WebSocket)\s*\(/.test(source), `${file} contains an unexpected network API`);
}

console.log("Extension structure, permissions, syntax, and opt-in AI network boundary are valid.");
