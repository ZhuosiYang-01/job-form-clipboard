import assert from "node:assert/strict";
import test from "node:test";
import {
  parseImportContent,
  parseImportFiles,
  parseJsonBackup,
  parseTextImport,
  stableId,
} from "../src/shared/import-parser.js";

test("stableId is deterministic and normalization-aware", () => {
  assert.equal(stableId("  基本信息 ", "姓名"), stableId("基本信息", "姓名"));
  assert.notEqual(stableId("姓名"), stableId("电话"));
});

test("parses Markdown category and title blocks", () => {
  const entries = parseTextImport(`# 基本信息\n## 姓名\n示例用户\n## 邮箱\nuser@example.com\n# 求职材料\n## 个人评价\n第一行\n第二行`, { fileName: "资料.md" });
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map(({ category, title }) => ({ category, title })), [
    { category: "基本信息", title: "姓名" },
    { category: "基本信息", title: "邮箱" },
    { category: "求职材料", title: "个人评价" },
  ]);
  assert.equal(entries[2].content, "第一行\n第二行");
});

test("parses separator blocks with optional metadata", () => {
  const entries = parseTextImport(`分类：教育\n标题：学校\n示例大学\n---\n专业\n示例专业`, { fileName: "个人资料.txt" });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].category, "教育");
  assert.equal(entries[0].title, "学校");
  assert.equal(entries[1].category, "个人资料");
  assert.equal(entries[1].title, "专业");
  assert.equal(entries[1].content, "示例专业");
});

test("uses a whole plain text file as one entry", () => {
  const [entry] = parseImportContent({ name: "自我评价.txt", text: "认真负责，善于协作。" });
  assert.equal(entry.category, "自我评价");
  assert.equal(entry.title, "自我评价");
});

test("parses JSON backup shapes and retains IDs", () => {
  const [entry] = parseJsonBackup(JSON.stringify({ entries: [{ id: "kept", group: "联系", name: "电话", value: "10086", pinned: true }] }));
  assert.deepEqual(entry, { id: "kept", category: "联系", title: "电话", content: "10086", aliases: [], pinned: true });
});

test("batch parsing keeps valid files and reports invalid ones", async () => {
  const result = await parseImportFiles([
    { name: "资料.md", text: async () => "# 基本信息\n## 姓名\n示例用户" },
    { name: "坏备份.json", text: "{" },
    { name: "图片.png", text: "binary" },
  ]);
  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.errors.map((error) => error.fileName), ["坏备份.json", "图片.png"]);
  assert.match(result.errors[0].message, /JSON/);
});

test("empty text produces a useful error", () => {
  assert.throws(() => parseTextImport(" \n "), /为空/);
});
