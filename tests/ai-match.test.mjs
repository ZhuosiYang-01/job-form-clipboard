import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("AI matching sends labels only and accepts only known result indexes", async () => {
  const entries = [
    { id: "name", title: "姓名", category: "基础信息", content: "PRIVATE_NAME_VALUE" },
    { id: "project", title: "项目名称", category: "项目经历", content: "PRIVATE_PROJECT_VALUE" }
  ];
  let requestBody;
  const chrome = {
    action: { onClicked: { addListener() {} } },
    runtime: { id: "test-extension", onMessage: { addListener() {} } },
    permissions: { contains: async () => true },
    storage: {
      local: { get: async () => ({ jobFormClipboardEntries: entries, jobClipboardAiConfig: { endpoint: "https://example.test/v1/chat/completions", model: "mock" } }) },
      session: { get: async () => ({ jobClipboardAiKey: "test-key" }) }
    }
  };
  const context = vm.createContext({
    chrome, URL, AbortController, setTimeout, clearTimeout,
    fetch: async (_url, options) => {
      requestBody = options.body;
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"indexes":[1,99,1,-1]}' } }] }) };
    }
  });
  vm.runInContext(`${readFileSync(new URL("../src/background.js", import.meta.url), "utf8")}\nglobalThis.testMatch = matchEntriesWithAi;`, context);
  const result = await context.testMatch({ context: { label: "项目名称", name: "name" } });
  assert.deepEqual(Array.from(result.entryIds), ["project"]);
  assert.equal(requestBody.includes("PRIVATE_NAME_VALUE"), false);
  assert.equal(requestBody.includes("PRIVATE_PROJECT_VALUE"), false);
  assert.equal(requestBody.includes("项目名称"), true);
});
