export const PROFILE_MODULES = [
  {
    id: "basic",
    label: "基础信息",
    repeatable: false,
    fields: [
      field("name", "姓名", ["姓名", "名字"]),
      field("gender", "性别"),
      field("birthDate", "出生日期", ["出生日期", "生日"]),
      field("phone", "手机号码", ["手机号码", "联系电话", "手机号"]),
      field("email", "电子邮箱", ["电子邮箱", "邮箱"]),
      field("idNumber", "身份证号码", ["身份证号码", "身份证号"]),
      field("ethnicity", "民族"),
      field("politicalStatus", "政治面貌"),
      field("nativePlace", "籍贯"),
      field("hukouLocation", "户口所在地", ["户口所在地", "户籍所在地"]),
      field("currentLocation", "现居住地", ["现居住地", "当前所在地"])
    ]
  },
  {
    id: "education",
    label: "教育经历",
    repeatable: true,
    groupLabel: "教育经历",
    fields: [
      field("school", "学校", ["学校", "学校名称", "毕业院校"]),
      field("college", "学院", ["学院", "院系"]),
      field("major", "专业", ["专业", "所学专业"]),
      field("educationLevel", "学历", ["学历", "最高学历"]),
      field("degree", "学位"),
      field("startDate", "开始时间", ["开始时间", "入学时间"]),
      field("endDate", "结束时间", ["结束时间", "毕业时间"]),
      field("gpa", "绩点", ["绩点", "GPA"]),
      field("ranking", "成绩排名", ["成绩排名", "专业排名"])
    ]
  },
  {
    id: "internship",
    label: "实习经历",
    repeatable: true,
    groupLabel: "实习经历",
    fields: [
      field("company", "单位名称", ["单位名称", "公司名称", "实习单位"]),
      field("role", "岗位名称", ["岗位名称", "职位名称", "实习岗位"]),
      field("department", "所在部门", ["所在部门", "部门"]),
      field("startDate", "开始时间"),
      field("endDate", "结束时间"),
      field("workContent", "工作内容", ["工作内容", "工作描述", "实习内容"], "textarea")
    ]
  },
  {
    id: "project",
    label: "项目经历",
    repeatable: true,
    groupLabel: "项目经历",
    fields: [
      field("projectName", "项目名称"),
      field("role", "担任角色", ["担任角色", "项目角色"]),
      field("startDate", "开始时间"),
      field("endDate", "结束时间"),
      field("description", "项目描述", ["项目描述", "项目内容"], "textarea"),
      field("link", "项目链接", ["项目链接", "作品链接"])
    ]
  },
  {
    id: "campus",
    label: "校园经历",
    repeatable: true,
    groupLabel: "校园经历",
    fields: [
      field("organization", "组织名称", ["组织名称", "社团名称", "学生组织"]),
      field("role", "职务", ["职务", "担任职务"]),
      field("startDate", "开始时间"),
      field("endDate", "结束时间"),
      field("description", "经历描述", ["经历描述", "工作内容"], "textarea")
    ]
  },
  {
    id: "award",
    label: "获奖信息",
    repeatable: true,
    groupLabel: "获奖信息",
    fields: [
      field("awardName", "奖项名称", ["奖项名称", "荣誉名称"]),
      field("level", "奖项级别", ["奖项级别", "获奖级别"]),
      field("date", "获奖时间", ["获奖时间", "取得时间"]),
      field("issuer", "颁发单位", ["颁发单位", "授予单位"]),
      field("description", "奖项说明", ["奖项说明", "获奖说明"], "textarea")
    ]
  },
  {
    id: "selfEvaluation",
    label: "个人评价",
    repeatable: false,
    fields: [field("selfEvaluation", "个人评价", ["个人评价", "自我评价"], "textarea")]
  },
  {
    id: "interests",
    label: "兴趣特长",
    repeatable: false,
    fields: [
      field("interests", "兴趣爱好", ["兴趣爱好", "爱好"], "textarea"),
      field("strengths", "个人特长", ["个人特长", "特长"], "textarea")
    ]
  },
  {
    id: "family",
    label: "家庭关系",
    repeatable: true,
    groupLabel: "家庭成员",
    fields: [
      field("name", "姓名"),
      field("relationship", "与本人关系", ["与本人关系", "关系"]),
      field("employer", "工作单位", ["工作单位", "所在单位"]),
      field("jobTitle", "职务", ["职务", "职业"]),
      field("phone", "联系电话", ["联系电话", "手机号码"])
    ]
  }
];

function field(key, label, aliases = [label], inputType = "text") {
  return { key, label, aliases, inputType };
}

export function getProfileModule(moduleId) {
  return PROFILE_MODULES.find((module) => module.id === moduleId) || null;
}

export function getProfileField(moduleId, fieldKey) {
  return getProfileModule(moduleId)?.fields.find((item) => item.key === fieldKey) || null;
}

export function isStructuredEntry(entry) {
  return Boolean(entry?.metadata?.moduleId && entry?.metadata?.fieldKey);
}

export function createProfileGroupEntries(moduleId, values = {}, options = {}) {
  const module = getProfileModule(moduleId);
  if (!module) throw new Error(`Unknown profile module: ${moduleId}`);

  const groupId = options.groupId || crypto.randomUUID();
  const groupLabel = String(options.groupLabel || module.groupLabel || module.label).trim();
  const sourceType = String(options.sourceType || "form").trim();

  return module.fields.flatMap((profileField, index) => {
    const content = String(values[profileField.key] ?? "").trim();
    if (!content) return [];
    return [{
      title: profileField.label,
      category: module.label,
      aliases: profileField.aliases,
      content,
      metadata: {
        moduleId: module.id,
        category: module.label,
        groupId,
        groupLabel,
        fieldKey: profileField.key,
        fieldLabel: profileField.label,
        sortOrder: index,
        sourceType
      }
    }];
  });
}

export function groupStructuredEntries(entries = []) {
  const groups = new Map();
  for (const entry of entries) {
    if (!isStructuredEntry(entry)) continue;
    const { moduleId, groupId } = entry.metadata;
    const key = `${moduleId}:${groupId || "default"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.values()].map((group) => group.sort(
    (a, b) => (a.metadata.sortOrder ?? 0) - (b.metadata.sortOrder ?? 0)
  ));
}
