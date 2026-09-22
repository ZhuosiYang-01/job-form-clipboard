/**
 * Local, deterministic form-field matcher.
 *
 * Both the form context and the saved entries are treated as untrusted text.
 * No DOM or browser APIs are used, so this module can run in a browser worker,
 * an extension page, or Node.js.
 */

const FIELD_DICTIONARY = Object.freeze({
  name: ['姓名', '名字', '真实姓名', '中文姓名', 'name', 'full name', 'fullname'],
  phone: ['手机号', '手机号码', '联系电话', '电话号码', '电话', '移动电话', 'mobile', 'phone', 'tel'],
  email: ['邮箱', '电子邮箱', '电子邮件', '邮件地址', 'email', 'e-mail'],
  school: ['学校', '院校', '毕业院校', '就读学校', '高校', '大学名称', 'school', 'university', 'college'],
  major: ['专业', '所学专业', '专业名称', '主修专业', '主修', 'major'],
  degree: ['学历', '最高学历', '学位', '最高学位', '教育程度', 'degree', 'education level'],
  graduationDate: ['毕业时间', '毕业日期', '预计毕业时间', '毕业年份', '毕业年月', 'graduation date', 'graduation year'],
  selfEvaluation: ['个人评价', '自我评价', '个人总结', '个人优势', '自我介绍', '个人简介', '综合评价', 'self evaluation', 'summary', 'profile'],
  projectName: ['项目名称', '项目名', 'project name', 'project title'],
  projectRole: ['项目角色', '担任角色', '在项目中担任的角色', 'project role'],
  projectExperience: ['项目经历', '项目经验', 'project experience', 'projects'],
  internshipExperience: ['实习经历', '实习经验', '实习介绍', 'internship experience', 'internship'],
  gender: ['性别', 'gender', 'sex'],
  birthDate: ['出生日期', '出生年月', '出生时间', '生日', 'birth date', 'date of birth', 'dob'],
  idNumber: ['身份证号码', '身份证号', '证件号码', '证件号', 'identity number', 'id card number'],
  ethnicity: ['民族', 'ethnicity'],
  politicalStatus: ['政治面貌'],
  nativePlace: ['籍贯'],
  hukouLocation: ['户口所在地', '户籍所在地', '户籍地址', '户口地址'],
  currentLocation: ['现居住地', '当前所在地', '现住址', '居住地址', '通讯地址', '联系地址'],
  college: ['学院', '院系', '所属学院'],
  gpa: ['绩点', '平均绩点', 'gpa'],
  ranking: ['成绩排名', '专业排名', '排名'],
  company: ['单位名称', '公司名称', '实习单位', '实习公司', '工作单位', '雇主名称', 'company name', 'employer'],
  role: ['岗位名称', '职位名称', '实习岗位', '职务', '担任职务', 'job title', 'position'],
  department: ['所在部门', '部门名称', '实习部门'],
  workContent: ['工作内容', '工作描述', '实习内容', '实习职责', '岗位职责'],
  projectDescription: ['项目描述', '项目内容', '项目简介', '项目介绍', '项目职责', 'project description'],
  projectLink: ['项目链接', '作品链接', '项目地址', 'project link'],
  organization: ['组织名称', '社团名称', '学生组织'],
  awardName: ['奖项名称', '荣誉名称', '所获奖项', '获奖名称'],
  awardLevel: ['奖项级别', '获奖级别'],
  awardDate: ['获奖时间', '获奖日期'],
  awardIssuer: ['颁发单位', '授予单位'],
  interests: ['兴趣爱好', '兴趣特长', '爱好'],
  strengths: ['个人特长', '擅长领域', '特长'],
  familyRelationship: ['与本人关系', '家庭关系', '亲属关系'],
  familyName: ['家庭成员姓名', '亲属姓名', '父亲姓名', '母亲姓名']
});

const CONTEXT_WEIGHTS = Object.freeze({
  label: 1,
  ariaLabel: 0.96,
  placeholder: 0.88,
  name: 0.78,
  id: 0.72,
  nearbyText: 0.58
});

const ENTRY_WEIGHTS = Object.freeze({ title: 1, aliases: 0.92, category: 0.62 });

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\-_/:：|（）()【】\[\].,，。*]+/g, ' ')
    .trim();
}

function compact(value) {
  return normalize(value).replace(/\s+/g, '');
}

function textContainsPhrase(text, phrase) {
  const haystack = compact(text);
  const needle = compact(phrase);
  if (!needle || !haystack) return false;

  // One-character Chinese labels (for example "名") are too ambiguous.
  if (/^[\u3400-\u9fff]$/u.test(needle)) return haystack === needle;

  // Very short Latin aliases must be token matches, so "tel" does not match
  // arbitrary identifiers such as "hotelPreference".
  if (/^[a-z0-9]+$/i.test(needle) && needle.length <= 4) {
    return normalize(text).split(/\s+/).includes(needle);
  }
  return haystack.includes(needle);
}

function phraseSpecificity(phrase) {
  const length = compact(phrase).length;
  if (length >= 6) return 1;
  if (length >= 4) return 0.94;
  if (length >= 2) return 0.84;
  return 0.35;
}

function bestDictionaryMatch(text) {
  let best = null;
  for (const [type, phrases] of Object.entries(FIELD_DICTIONARY)) {
    for (const phrase of phrases) {
      if (!textContainsPhrase(text, phrase)) continue;
      const score = phraseSpecificity(phrase);
      if (!best || score > best.score || (score === best.score && compact(phrase).length > compact(best.phrase).length)) {
        best = { type, phrase, score };
      }
    }
  }
  return best;
}

/** Infer the semantic field type represented by a page field context. */
export function inferFieldType(context = {}) {
  const evidence = [];
  for (const [key, weight] of Object.entries(CONTEXT_WEIGHTS)) {
    const match = bestDictionaryMatch(context[key]);
    if (match) evidence.push({ ...match, source: key, weightedScore: match.score * weight });
  }
  evidence.sort((a, b) => b.weightedScore - a.weightedScore);
  if (!evidence.length) return { type: null, confidence: 0, evidence: [] };

  const winner = evidence[0];
  const corroboration = evidence.filter(item => item.type === winner.type).slice(1);
  const confidence = Math.min(1, winner.weightedScore + corroboration.length * 0.04);
  return { type: winner.type, confidence, evidence };
}

function entryTexts(entry) {
  return {
    title: [entry?.title],
    aliases: Array.isArray(entry?.aliases) ? entry.aliases : [entry?.aliases],
    category: [entry?.category]
  };
}

function scoreEntry(entry, field) {
  let semanticScore = 0;
  let directScore = 0;
  const reasons = [];
  const titleOrAlias = [entry?.title, ...(Array.isArray(entry?.aliases) ? entry.aliases : [entry?.aliases])]
    .filter(Boolean).map(bestDictionaryMatch).filter(Boolean);
  // A broad category such as "项目经历" must not make every field in that
  // category a candidate for "项目名称".
  if (titleOrAlias.length && !titleOrAlias.some(match => match.type === field.type)) return { score: 0, reasons: [] };

  for (const [source, values] of Object.entries(entryTexts(entry))) {
    if (source === 'category' && titleOrAlias.length) continue;
    for (const value of values.filter(Boolean)) {
      const inferred = bestDictionaryMatch(value);
      if (field.type && inferred?.type === field.type) {
        const score = inferred.score * ENTRY_WEIGHTS[source] * field.confidence;
        if (score > semanticScore) semanticScore = score;
        reasons.push(`${source}:${inferred.phrase}`);
      }
      for (const item of field.evidence) {
        if (textContainsPhrase(value, item.phrase) || textContainsPhrase(item.phrase, value)) {
          const score = phraseSpecificity(item.phrase) * ENTRY_WEIGHTS[source] * CONTEXT_WEIGHTS[item.source];
          if (score > directScore) directScore = score;
        }
      }
    }
  }

  const score = Math.min(1, Math.max(semanticScore, directScore) + (semanticScore && directScore ? 0.06 : 0));
  return { score, reasons: [...new Set(reasons)] };
}

/**
 * Return matching saved entries in descending confidence order.
 * Entries below minScore are omitted. Original entry objects are not mutated.
 */
export function matchFieldEntries(context, entries, { minScore = 0.45, limit = 5 } = {}) {
  const field = inferFieldType(context);
  if (!field.type || !Array.isArray(entries)) return [];

  return entries
    .map((entry, index) => ({ entry, index, ...scoreEntry(entry, field), fieldType: field.type }))
    .filter(candidate => candidate.score >= minScore)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ index, ...candidate }) => candidate);
}

export { FIELD_DICTIONARY };
