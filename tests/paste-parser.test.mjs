import assert from "node:assert/strict";
import test from "node:test";
import { parsePastedCard } from "../src/shared/paste-parser.js";

test("splits Chinese colon and space labels", () => {
  assert.deepEqual(parsePastedCard("通讯地址：示例市示例路100号"), {
    title: "通讯地址", content: "示例市示例路100号", titleDetected: true
  });
  assert.deepEqual(parsePastedCard("通讯地址 示例市示例路100号"), {
    title: "通讯地址", content: "示例市示例路100号", titleDetected: true
  });
});

test("preserves multiline content after a detected title", () => {
  assert.deepEqual(parsePastedCard("个人评价：第一行\r\n第二行\n第三行"), {
    title: "个人评价", content: "第一行\n第二行\n第三行", titleDetected: true
  });
});

test("does not misread URLs, email, Windows paths, or times as titles", () => {
  for (const value of ["https://example.com/a", "person@example.com", "C:\\Users\\me\\resume.md", "12:30 开始面试"]) {
    const result = parsePastedCard(value);
    assert.equal(result.titleDetected, false, value);
    assert.equal(result.content, value);
  }
});

test("allows a URL as content when the label is explicit", () => {
  assert.deepEqual(parsePastedCard("作品集：https://example.com/a:b"), {
    title: "作品集", content: "https://example.com/a:b", titleDetected: true
  });
});

test("plain multiline text becomes an untitled card", () => {
  assert.deepEqual(parsePastedCard("第一行\n第二行"), {
    title: "未命名资料", content: "第一行\n第二行", titleDetected: false
  });
});
