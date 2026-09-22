import test from "node:test";
import assert from "node:assert/strict";

import { createEntry, normalizeEntry } from "../src/shared/defaults.js";
import {
  PROFILE_MODULES,
  createProfileGroupEntries,
  getProfileField,
  getProfileModule,
  groupStructuredEntries,
  isStructuredEntry
} from "../src/shared/profile-schema.js";

test("defines the nine requested profile modules", () => {
  assert.deepEqual(PROFILE_MODULES.map((module) => module.label), [
    "基础信息", "教育经历", "实习经历", "项目经历", "校园经历",
    "获奖信息", "个人评价", "兴趣特长", "家庭关系"
  ]);
  assert.equal(getProfileModule("basic").repeatable, false);
  assert.equal(getProfileModule("internship").repeatable, true);
  assert.ok(getProfileField("education", "school"));
  assert.ok(getProfileField("education", "college"));
  assert.ok(getProfileField("education", "major"));
  assert.ok(getProfileField("education", "gpa"));
  assert.ok(getProfileField("internship", "company"));
  assert.ok(getProfileField("internship", "role"));
  assert.ok(getProfileField("internship", "workContent"));
});

test("creates structured entries only for non-empty form values", () => {
  const entries = createProfileGroupEntries("education", {
    school: "示例大学",
    college: "  ",
    major: "示例专业",
    gpa: null
  }, { groupId: "education-1", groupLabel: "教育经历 1" });

  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.title), ["学校", "专业"]);
  assert.equal(entries[0].metadata.groupId, "education-1");
  assert.equal(entries[0].metadata.moduleId, "education");
  assert.equal(entries[1].metadata.sortOrder, 2);
});

test("normalizes optional metadata while remaining compatible with legacy entries", () => {
  const legacy = normalizeEntry({ id: "old", title: "旧资料", category: "其他", content: "内容" });
  assert.equal(legacy.metadata, undefined);

  const structured = createEntry({
    title: "单位名称",
    category: "实习经历",
    content: "示例单位",
    metadata: {
      moduleId: " internship ",
      category: "实习经历",
      groupId: "group-1",
      fieldKey: "company",
      fieldLabel: "单位名称",
      sortOrder: "2",
      sourceType: "form",
      unexpected: "discarded"
    }
  });
  assert.equal(isStructuredEntry(structured), true);
  assert.equal(structured.metadata.moduleId, "internship");
  assert.equal(structured.metadata.sortOrder, 2);
  assert.equal(structured.metadata.unexpected, undefined);
});

test("groups repeatable records independently and sorts fields", () => {
  const first = createProfileGroupEntries("internship", {
    company: "单位甲",
    role: "岗位甲"
  }, { groupId: "internship-1" }).map(createEntry);
  const second = createProfileGroupEntries("internship", {
    company: "单位乙"
  }, { groupId: "internship-2" }).map(createEntry);
  const legacy = createEntry({ title: "旧卡片", content: "仍应保留" });

  const groups = groupStructuredEntries([first[1], legacy, second[0], first[0]]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].map((entry) => entry.content), ["单位甲", "岗位甲"]);
  assert.deepEqual(groups[1].map((entry) => entry.content), ["单位乙"]);
});
