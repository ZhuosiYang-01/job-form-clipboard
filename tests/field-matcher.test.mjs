import test from 'node:test';
import assert from 'node:assert/strict';
import { inferFieldType, matchFieldEntries } from '../src/shared/field-matcher.js';

const entries = [
  { title: '个人评价（互联网）', category: '求职材料', aliases: ['自我评价', '个人总结'], content: '善于分析问题' },
  { title: '姓名', category: '基本信息', content: '张三' },
  { title: '手机号', aliases: ['联系电话'], category: '基本信息', content: '13800000000' },
  { title: '电子邮箱', category: '基本信息', content: 'a@example.com' },
  { title: '毕业院校', category: '教育经历', content: '示例大学' },
  { title: '主修专业', category: '教育经历', content: '计算机科学' },
  { title: '最高学历', category: '教育经历', content: '硕士研究生' },
  { title: '毕业年月', category: '教育经历', aliases: ['毕业时间'], content: '2027-06' },
  { title: '项目经历', category: '经历', content: '项目内容' },
  { title: '实习经历', category: '经历', content: '实习内容' }
];

test('recognises common field aliases from the strongest context', () => {
  assert.equal(inferFieldType({ label: '自我评价（500字以内）' }).type, 'selfEvaluation');
  assert.equal(inferFieldType({ ariaLabel: '联系电话' }).type, 'phone');
  assert.equal(inferFieldType({ placeholder: '请输入毕业院校' }).type, 'school');
  assert.equal(inferFieldType({ name: 'graduation_year' }).type, 'graduationDate');
});

test('returns matching entries ordered by confidence', () => {
  const matches = matchFieldEntries(
    { label: '个人总结', placeholder: '请简要介绍个人优势' },
    entries
  );
  assert.equal(matches[0].entry.title, '个人评价（互联网）');
  assert.equal(matches[0].fieldType, 'selfEvaluation');
  assert.ok(matches[0].score > 0.8);
});

test('supports the requested Chinese field families', () => {
  const cases = [
    ['姓名', '姓名'], ['手机号码', '手机号'], ['邮箱地址', '电子邮箱'], ['就读学校', '毕业院校'],
    ['所学专业', '主修专业'], ['教育程度', '最高学历'], ['预计毕业时间', '毕业年月'],
    ['项目经验', '项目经历'], ['实习经验', '实习经历']
  ];
  for (const [label, expectedTitle] of cases) {
    assert.equal(matchFieldEntries({ label }, entries)[0]?.entry.title, expectedTitle, label);
  }
});

test('does not let short substrings create false positives', () => {
  assert.equal(inferFieldType({ id: 'hotelPreference' }).type, null);
  assert.equal(inferFieldType({ nearbyText: '知名企业' }).type, null);
  assert.deepEqual(matchFieldEntries({ label: '报名信息' }, entries), []);
});

test('project name does not fall back to generic name field', () => {
  const projectEntries = [
    { title: '姓名', category: '基础信息', content: '示例姓名' },
    { title: '项目名称', category: '项目经历', content: '示例项目' }
  ];
  const context = { label: '项目名称', name: 'name', id: 'name' };
  assert.equal(inferFieldType(context).type, 'projectName');
  assert.equal(matchFieldEntries(context, projectEntries)[0]?.entry.title, '项目名称');
});

test('uses aliases and category without inspecting private content', () => {
  const candidates = [
    { title: '版本 A', aliases: ['个人简介'], category: '文案', content: '正文不参与字段推断' },
    { title: '版本 B', category: '个人评价', content: '另一段正文' }
  ];
  const matches = matchFieldEntries({ label: '自我介绍' }, candidates);
  assert.equal(matches[0].entry.title, '版本 A');
  assert.equal(matches.length, 2);
});

test('honours limit and minScore options', () => {
  const matches = matchFieldEntries({ label: '个人评价' }, entries, { limit: 1, minScore: 0.7 });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].entry.title, '个人评价（互联网）');
});

test('matches common structured profile fields using labels and aliases', () => {
  const cases = [
    ['身份证号', '身份证号码'], ['通讯地址', '现居住地'], ['平均绩点', '绩点'],
    ['实习单位', '单位名称'], ['职位名称', '岗位名称'], ['工作描述', '工作内容'],
    ['项目简介', '项目描述'], ['获奖名称', '奖项名称'], ['兴趣特长', '兴趣爱好']
  ];
  const candidates = cases.map(([, title]) => ({ title, category: '资料', content: '示例' }));
  for (const [label, title] of cases) {
    assert.equal(matchFieldEntries({ label }, candidates)[0]?.entry.title, title, label);
  }
});

test('does not suggest unrelated cards merely because they share a module category', () => {
  const candidates = [
    { title: '姓名', category: '基础信息', content: '示例姓名' },
    { title: '项目名称', category: '项目经历', content: '示例项目' },
    { title: '项目描述', category: '项目经历', content: '示例项目描述' },
    { title: '项目链接', category: '项目经历', content: 'https://example.test' }
  ];
  assert.deepEqual(matchFieldEntries({ label: '项目名称' }, candidates).map(item => item.entry.title), ['项目名称']);
  assert.deepEqual(matchFieldEntries({ label: '姓名' }, candidates).map(item => item.entry.title), ['姓名']);
});

test('does not confuse family member names with the applicant name', () => {
  const candidates = [
    { title: '姓名', category: '基础信息', content: '申请人' },
    { title: '姓名', category: '家庭关系', content: '家属' }
  ];
  assert.equal(inferFieldType({ label: '父亲姓名' }).type, 'familyName');
  assert.deepEqual(matchFieldEntries({ label: '父亲姓名' }, candidates), []);
});
