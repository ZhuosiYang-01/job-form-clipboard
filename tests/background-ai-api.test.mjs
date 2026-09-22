import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/background.js", import.meta.url), "utf8");
const endpoint = "https://api.example.test/v1/chat/completions";
const fakeKey = "sk-test-never-use-this-key";
const original = "参与风险工作台建设，开展需求分析和产品设计，推动测试流程落地。";

function makeHarness({ entries, config, key = fakeKey, fetchImpl } = {}) {
  const calls = { requests: [], writes: [] };
  const chrome = {
    action: { onClicked: { addListener() {} } },
    runtime: { id: "test-extension", getURL: (path) => `chrome-extension://test-extension/${path}`, onMessage: { addListener() {} } },
    permissions: { contains: async () => true },
    storage: {
      local: {
        get: async () => ({
          jobFormClipboardEntries: entries ?? [{ id: "work-1", title: "实习经历", category: "实习经历", content: original }],
          jobClipboardAiConfig: config ?? { endpoint, model: "test-model" }
        }),
        set: async (value) => { calls.writes.push(value); }
      },
      session: { get: async () => ({ jobClipboardAiKey: key }) }
    }
  };
  const context = vm.createContext({
    chrome, URL, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      calls.requests.push({ url, options });
      return fetchImpl?.(url, options) ?? {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "参与风险工作台产品设计，推动测试流程落地。" } }] })
      };
    }
  });
  vm.runInContext(`${source}\nglobalThis.testCompress = compressEntry; globalThis.testMatch = matchEntriesWithAi; globalThis.testConnection = testAiConnection;`, context);
  return { context, calls };
}

test("compression sends a valid Chat Completions request and returns a draft without overwriting source", async () => {
  const { context, calls } = makeHarness();
  const result = await context.testCompress({ entryId: "work-1", limit: 100 });
  assert.equal(calls.requests.length, 1);
  const { url, options } = calls.requests[0];
  assert.equal(url, endpoint);
  assert.equal(options.method, "POST");
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "omit");
  assert.equal(options.headers.Authorization, `Bearer ${fakeKey}`);
  assert.equal(options.headers["Content-Type"], "application/json");
  const body = JSON.parse(options.body);
  assert.equal(body.model, "test-model");
  assert.deepEqual(body.messages.map((message) => message.role), ["system", "user"]);
  assert.match(body.messages[1].content, /风险工作台建设/);
  assert.match(body.messages[0].content, /尽量接近上限，不要过度压缩/);
  assert.match(body.messages[0].content, /个人评价、能力及特长/);
  assert.match(body.messages[0].content, /不能把独立事项拼成原文没有的因果关系/);
  assert.match(body.messages[0].content, /若明显低于上限且原文仍有重要事实/);
  assert.match(body.messages[1].content, /字符上限：100/);
  assert.equal(result.original, original);
  assert.equal(result.candidate, "参与风险工作台产品设计，推动测试流程落地。");
  assert.equal(JSON.stringify(result).includes(fakeKey), false);
  assert.deepEqual(calls.writes, []);
});

test("compression retries an over-limit answer and returns only a compliant first draft", async () => {
  let attempt = 0;
  const { context, calls } = makeHarness({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: ++attempt === 1 ? "超".repeat(116) : "合格短版。" } }] })
    })
  });
  const result = await context.testCompress({ entryId: "work-1", limit: 100 });
  assert.equal(calls.requests.length, 2);
  assert.equal(result.candidate, "合格短版。");
  const retry = JSON.parse(calls.requests[1].options.body);
  assert.match(retry.messages.at(-1).content, /116个字符/);
  assert.match(retry.messages.at(-1).content, /100个字符/);
});

test("compression never returns a draft when all three responses exceed the limit", async () => {
  const { context, calls } = makeHarness({
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "超".repeat(101) } }] }) })
  });
  await assert.rejects(context.testCompress({ entryId: "work-1", limit: 100 }), /连续三次超出100字上限/);
  assert.equal(calls.requests.length, 3);
  assert.deepEqual(calls.writes, []);
});

test("AI matching sends labels only, valid Chat Completions schema, and no card contents", async () => {
  const entries = [
    { id: "person", title: "姓名", category: "基础信息", content: "SENSITIVE_NAME_VALUE" },
    { id: "project", title: "项目名称", category: "项目经历", content: "SENSITIVE_PROJECT_VALUE" }
  ];
  const { context, calls } = makeHarness({
    entries,
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"indexes":[1]}' } }] }) })
  });
  const result = await context.testMatch({ context: { label: "项目名称", nearbyText: "请填写项目" } });
  assert.deepEqual(Array.from(result.entryIds), ["project"]);
  const { options } = calls.requests[0];
  const body = JSON.parse(options.body);
  assert.equal(body.model, "test-model");
  assert.deepEqual(body.messages.map((message) => message.role), ["system", "user"]);
  assert.equal(options.body.includes("SENSITIVE_NAME_VALUE"), false);
  assert.equal(options.body.includes("SENSITIVE_PROJECT_VALUE"), false);
  assert.equal(options.body.includes(fakeKey), false);
  assert.deepEqual(calls.writes, []);
});

test("a 429 response explains quota or rate limiting without exposing the key", async () => {
  const { context, calls } = makeHarness({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: "insufficient_quota", message: `secret ${fakeKey}` } })
    })
  });
  await assert.rejects(
    context.testCompress({ entryId: "work-1", limit: 100 }),
    (error) => {
      assert.match(error.message, /额度|余额|配额|频率|限流|429/);
      assert.doesNotMatch(error.message, /检查地址、密钥和模型/);
      assert.equal(error.message.includes(fakeKey), false);
      return true;
    }
  );
  assert.deepEqual(calls.writes, []);
});

test("missing session key blocks compression and matching before any network request", async () => {
  const { context, calls } = makeHarness({ key: "" });
  await assert.rejects(context.testCompress({ entryId: "work-1", limit: 100 }), /配置.*密钥/);
  await assert.rejects(context.testMatch({ context: { label: "工作内容" } }), /配置.*密钥/);
  assert.equal(calls.requests.length, 0);
  assert.deepEqual(calls.writes, []);
});

test("connection check calls the model without sending saved profile text", async () => {
  const { context, calls } = makeHarness();
  await context.testConnection();
  assert.equal(calls.requests.length, 1);
  const body = JSON.parse(calls.requests[0].options.body);
  assert.equal(body.model, "test-model");
  assert.equal(body.messages.length, 1);
  assert.equal(calls.requests[0].options.body.includes(original), false);
});

test("compression blocks sensitive data found in the card body", async () => {
  const { context, calls } = makeHarness({ entries: [{ id: "work-1", title: "补充说明", category: "粘贴资料", content: "我的通讯地址：示例市示例路" }] });
  await assert.rejects(context.testCompress({ entryId: "work-1", limit: 100 }), /敏感信息/);
  assert.equal(calls.requests.length, 0);
});
