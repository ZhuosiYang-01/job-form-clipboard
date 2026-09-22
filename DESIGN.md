---
name: "网申资料夹"
description: "A quiet local application reference index built from warm paper, cool blue ink, and one amber locator."
colors:
  ink: "#15364e"
  ink-strong: "#102b43"
  ink-action: "#175f8e"
  ink-action-hover: "#104d73"
  text-muted: "#60798a"
  paper: "#fbfaf6"
  surface: "#ffffff"
  panel: "#f0f4f5"
  line: "#cad5dc"
  amber-locator: "#d99524"
  amber-soft: "#fff0c7"
  danger: "#a33b34"
typography:
  headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 680
    lineHeight: 1.45
rounded:
  field: "9px"
  control: "10px"
  card: "12px"
  panel: "15px"
  shell: "16px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.ink-action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.ink-action-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 10px"
    typography: "{typography.body}"
  entry-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0 12px 0 0"
    height: "68px"
---

# Design System: 网申资料夹

## Overview

**Creative North Star: "The Application Reference Index"**

网申资料夹像一册维护良好的个人申请资料索引。暖纸色承载长时间阅读，冷蓝墨色建立秩序与可信度，单一琥珀标记只负责指出当前字段及其最佳匹配。界面安静、紧凑、任务导向，视觉注意力始终服务于检索、确认和填入。

资料管理页与网页侧栏共享同一种索引语言：稳定的分类、成组条目、窄色标、短动作词和明确状态。管理页允许更宽松的双栏工作区，侧栏则压缩为 390px 的操作轨道；两者都避免装饰性统计、营销式首屏和不必要的颜色噪声。

**Key Characteristics:**

- 暖纸背景与白色工作面组成低对比、耐看的层次。
- 冷蓝承担文字、主要动作和可交互线索。
- 琥珀只标记置顶、选中、字段就绪或高置信匹配。
- 紧凑圆角卡片、细边框和轻柔阴影形成可扫描的资料索引。
- 状态不仅依靠颜色，还配合位置、轮廓、文字或双线标记。

## Colors

整体色盘是暖纸、冷蓝墨和克制琥珀的组合，危险操作使用独立的暗红色，不与主动作竞争。

### Primary

- **Cool Blue Ink:** 主要按钮、链接、填入动作、选区和交互强调使用 `ink-action`；悬停时使用 `ink-action-hover`。

### Secondary

- **Amber Locator:** `amber-locator` 仅用于当前字段、最佳匹配、置顶条目和选中筛选；`amber-soft` 作为匹配计数与选中标签的浅底。

### Neutral

- **Reference Ink:** `ink` 是正文与大多数标题的基础墨色，`ink-strong` 用于品牌和最高层级标题。
- **Muted Blue Gray:** `text-muted` 用于说明、预览、计数和次级元数据。
- **Warm Paper:** `paper` 是页面与侧栏的基础背景，保持低刺激的阅读环境。
- **White Work Surface:** `surface` 用于输入框、条目卡和编辑主体，提供清晰但不刺眼的前景层。
- **Cool Panel:** `panel` 用于页头、编辑器标题区、导入区和侧栏结构区。
- **Quiet Rule:** `line` 用于分隔线、输入边框和未激活的条目标记。
- **Reserved Danger:** `danger` 只用于删除与错误状态。

**The One Marker Rule.** 琥珀色只表达定位、匹配或置顶，不承担普通主按钮、装饰背景或大面积品牌填充。

**The Cool Ink Rule.** 所有常规交互使用同一冷蓝家族，避免引入新的强调色。

## Typography

**Display Font:** Segoe UI Variable（回退至 Segoe UI、Microsoft YaHei、sans-serif）
**Body Font:** Segoe UI Variable（回退至 Segoe UI、Microsoft YaHei、sans-serif）

**Character:** 统一的系统无衬线字体保持中文界面清晰、原生且快速。层级主要通过字号、字重、间距和颜色建立，不依赖字体混搭。

### Hierarchy

- **Headline**（700，24px，1.2）：管理页产品标题；使用轻微负字距形成紧凑字面。
- **Title**（700，19px，1.3）：资料库与编辑器等主要区块标题。
- **Body**（400，14px，1.45）：控件内容、主要说明与侧栏基础文本；较长输入内容使用 1.6 行高。
- **Label**（650 至 720，11 至 13px，约 1.45）：字段标签、分类标题、动作和元数据；仅短区段标签使用 0.06em 字距。

**The Compact Hierarchy Rule.** 依靠 11、12、13、14、17、19、24px 的小步进建立层级，不使用夸张展示字号。

**The Plain Label Rule.** 标签保持短、实义和正常大小写，不用全大写或装饰字形制造权威感。

## Layout

管理页以最大 1480px 的居中工作区组织内容，桌面端采用最小 440px 的资料库与最小 390px 的编辑器双栏，比例约为 1.25:0.75，栏间距随视口在 18 至 42px 之间变化。编辑器在桌面端距顶部 22px 粘附。1050px 以下收紧栏宽和页边距，800px 以下转为单栏，页头操作铺满宽度，搜索移到标题下方，编辑器取消粘附。

网页侧栏固定在视口右侧，常规宽度为 390px，四周留 12px；520px 以下改为四周 6px 的近全屏面板。侧栏内部是明确的垂直序列：品牌栏、当前字段、搜索、工具、可选快速新建、可滚动条目和固定页脚。

间距以紧凑的 6、8、12、16、22px 节奏为主。条目组之间略大于组内卡片间距，输入区和面板边缘保留 16 至 22px 内边距。横向分类标签允许滚动，不换行挤压。

**The Task-First Rail Rule.** 侧栏首屏必须先显示当前字段、匹配和搜索，不能在其上方加入仪表盘、教学卡或装饰统计。

**The Stable Edge Rule.** 桌面管理页保持居中双栏，网页侧栏始终贴近右缘；响应式变化只改变排列和留白，不改变任务顺序。

## Elevation & Depth

系统结合色调分层、细边框与低透明蓝灰阴影。页面结构主要靠 `paper`、`panel` 与 `surface` 的色差分层；阴影只用于独立编辑器、浮动侧栏、条目卡和短暂通知，不用于普通分隔区。

### Shadow Vocabulary

- **Entry Rest**（`0 2px 10px rgba(22, 49, 68, .08)`）：侧栏条目卡的静止状态。
- **Entry Hover**（`0 5px 16px rgba(22, 49, 68, .14)`）：可点击条目悬停；管理页条目使用同类更宽阴影。
- **Panel Lift**（`0 10px 32px rgba(18, 46, 66, .1)`）：管理页编辑器和通知的轻柔浮起。
- **Right Rail Lift**（`-8px 16px 44px rgba(20, 43, 62, .18)`）：网页侧栏相对宿主页面的方向性分离。
- **Toast Lift**（`0 8px 24px rgba(12, 32, 48, .22)`）：短暂反馈信息的最高局部层级。

**The Layer Before Shadow Rule.** 先用背景色与 1px 规则线建立结构，只在对象需要从周围表面独立出来时使用阴影。

## Shapes

形状语言是温和但克制的矩形。字段使用 8 至 11px 圆角，按钮多为 9 至 10px，条目卡为 12 至 13px，独立面板为 15 至 16px。胶囊形只用于匹配计数等短状态，不用于普通按钮。边框保持 1px，虚线只用于大面积空状态。

窄竖轨是条目与字段状态的标志性轮廓。普通条目使用冷灰轨，匹配条目使用琥珀轨并增加一条浅琥珀副线；管理页置顶条目也以琥珀轨表达身份。

**The Nested Radius Rule.** 容器越大，圆角略大；控件圆角始终小于其所在面板，避免层层胶囊化。

**The Double-Line Match Rule.** 高置信匹配必须使用琥珀主轨加浅色副线，并配合“匹配”文字，不能只改变卡片颜色。

## Components

### Buttons

- **Shape:** 紧凑的柔和矩形，主要与次要按钮均使用约 10px 圆角和至少 38px 高度；侧栏紧凑动作可降至 34px。
- **Primary:** 冷蓝实底、白字、半粗字重，水平内边距 14px；用于“新建资料”“保存到本地”“粘贴新建”等当前主要动作。
- **Hover / Focus:** 悬停进入更深冷蓝；键盘焦点使用 3px 半透明蓝色轮廓和 2px 外偏移。
- **Secondary / Text:** 次要按钮使用白底、冷灰边框与深墨文字；文字按钮无边框，以冷蓝文字和悬停下划线表达可操作性。
- **Danger:** 删除使用透明背景与暗红文字，避免与主要动作形成同等视觉重量。

### Chips

- **Style:** 分类筛选默认为透明背景、透明边框和灰蓝文字；选中后使用浅琥珀底、琥珀边框与深墨文字。
- **State:** 通过 `aria-pressed`、底色和边框共同表达选中；横向空间不足时保持单行滚动。

### Cards / Containers

- **Corner Style:** 条目卡 12 至 13px，编辑器和侧栏 15 至 16px。
- **Background:** 条目与表单主体使用白色，结构区使用冷面板色，外部画布使用暖纸色。
- **Shadow Strategy:** 条目静止时仅轻微浮起，悬停增强；编辑器和侧栏使用稳定的环境阴影。
- **Border:** 面板分区使用 1px 冷灰规则线，条目本体通常无描边。
- **Internal Padding:** 条目内容约 11 至 15px，表单与面板约 18 至 22px。

### Inputs / Fields

- **Style:** 白底、1px 冷灰边框、8 至 11px 圆角，正文墨色；搜索框左侧保留 40px 给线性搜索图标。
- **Focus:** 3px 半透明蓝色外轮廓并外移 2px，不依赖默认浏览器焦点。
- **Error / Disabled:** 已实现的导入错误使用暗红文字；禁用态没有形成独立视觉模式，新增界面不得自行杜撰。

### Navigation

- **Style:** 管理页以可横向滚动的分类标签导航资料；侧栏顶部仅保留管理和关闭两个 36px 图标按钮，底部以文本链接进入“管理与备份”。
- **States:** 图标按钮悬停和按下分别使用两级冷灰底；文本导航悬停加下划线；分类激活态遵循琥珀定位规则。
- **Mobile:** 管理页页头按钮等分整行，分类保持横向滚动；侧栏在窄屏保持原有内容顺序并扩大为近全屏。

### Indexed Entry

资料条目是系统的签名组件。卡片由 5 至 7px 状态轨、可截断的标题与预览、右侧短动作组成。置顶项在标题旁显示 13px 图钉；匹配项增加琥珀双线、“匹配”文字和明确的“填入”动作。点击后卡片仅下移 1px，反馈由页面内通知确认。

### Current Field Strip

侧栏字段条采用 6px 状态标、字段标题和可选匹配计数组成。等待时为冷灰标记，就绪时变为琥珀，并始终显示“当前字段”文字与实际字段名，保证状态不只依赖颜色。

### Toast / Notice

短暂反馈使用深蓝墨底、白字、9 至 10px 圆角和高于面板的阴影。它从下方 8 至 10px 淡入上移，150 至 180ms 完成；系统偏好减少动态时将持续时间压缩至 0.01ms。

## Do's and Don'ts

### Do:

- **Do** 以暖纸、白色工作面和冷面板色组织层次，再决定是否需要阴影。
- **Do** 将琥珀限制在当前字段、最佳匹配、置顶和选中筛选四类定位信息。
- **Do** 在颜色之外同时提供文字、轮廓、位置或双线标记。
- **Do** 保持侧栏操作顺序稳定：当前字段、搜索、快捷动作、资料条目、管理入口。
- **Do** 使用 3px 可见焦点环，并为减少动态偏好提供近乎即时的过渡。

### Don't:

- **Don't** 加入装饰性渐变、彩色统计卡、大面积琥珀或与冷蓝竞争的新强调色。
- **Don't** 把普通按钮做成胶囊；999px 圆角只属于短状态标签。
- **Don't** 仅靠颜色传达匹配、选中、错误或不可用状态。
- **Don't** 用营销式首屏、引导横幅或仪表盘挡住当前字段与资料检索。
- **Don't** 将密度降低为大块留白和超大标题；这是紧凑的工作工具，不是展示页面。
