# 时段打分 feature — 需求文档

**Target branch**: TBD
**Status**: draft，等 Iris 审
**Scope**: 今下午 MVP，云端同步/桌面小部件/AI 总结延后

---

## 为什么

Iris 对上课效率不满意率约 90%。想要：
1. 低阻力记录每节课/时段的状态（打分 + 一句反思）
2. 数据持续沉淀，后续接云端 → MCP → Claude Code 自动日总结

本次只做第 1 步的本地版本。

## 范围（In）

- 一个时段结束后能够录入：**星级 rating（1-5）+ 效率 slider（1-5）+ 选填一句反思 + 选填"做了什么"**
- 可以浏览最近 N 天的时段评分历史
- 数据本地持久化（AsyncStorage）
- 能导出成 JSON（占位云端同步用，未来接真云端时直接替换）
- Repository 接口预留云端同步扩展点

## 范围（Out，本次不做）

- 桌面小部件
- 真·云端同步 / 域名 / 服务器（但要为它预留接口和字段）
- MCP endpoint
- 日总结生成
- AI 自动填写内容

## 数据模型

新增一个 `TimeSlotRating` 实体，独立于现有的 `ScheduleEvent`：

```ts
interface TimeSlotRating {
  id: string;              // uuid
  slot_start: string;      // ISO timestamp, 时段起
  slot_end: string;        // ISO timestamp, 时段终
  linked_event_id?: string; // 关联课表 event（可选，未来课表自动触发用）

  rating: 1 | 2 | 3 | 4 | 5;      // 主观打分（星级 UI）
  efficiency: 1 | 2 | 3 | 4 | 5;  // 效率自评（slider UI），与 rating 独立

  mood?: string;           // 单字段 free text，≤ 20 字
  activity?: string;       // 这段时间做了啥，≤ 50 字
  reflection?: string;     // 一句反思，≤ 200 字

  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp, 每次 edit 刷新 — 云端 last-write-wins 用
  synced_at?: string;      // 本次未实装，但 schema 预留。null/undefined = 未同步
  schema_version: 1;       // migration 锚点
}
```

**说明**：
- 独立实体，不改现有 `ScheduleEvent` schema（避免污染课表导入）
- `linked_event_id` 是为将来"课表时段结束 → 自动弹出打分"留的钩子，这次不接
- `rating` 和 `efficiency` 是两个独立维度：rating 是整体满意度（星），efficiency 是纯效率（slider）。UI 上视觉区分
- 所有 mood/activity/reflection 都 optional，降录入阻力
- `updated_at` / `synced_at` / `schema_version` 本次虽不用，但**必须写入**：换日迁移到云端不想改 schema

## 存储层

新文件 `src/features/rating/storage/ratings.storage.ts`，pattern 照搬 `events.storage.ts`：
- AsyncStorage key: `cs-rn:time-slot-ratings:v1`
- CRUD + listener 通知
- 内存缓存 + load on demand

**Repository 抽象（为云端同步留口子）**：

`ratings.service.ts` **不要直接** 调 `ratings.storage.ts`，而是通过 `RatingRepository` 接口：

```ts
// src/features/rating/storage/repository.ts
export interface RatingRepository {
  list(): Promise<TimeSlotRating[]>;
  get(id: string): Promise<TimeSlotRating | null>;
  save(rating: TimeSlotRating): Promise<void>;  // upsert
  remove(id: string): Promise<void>;
  // 预留给云端同步用，本次本地 impl 直接返回本地列表：
  listPendingSync(): Promise<TimeSlotRating[]>;  // synced_at == null 的
  markSynced(id: string, syncedAt: string): Promise<void>;
}
```

本次只实装 `LocalRatingRepository`（走 AsyncStorage）。未来云端实装 `RemoteRatingRepository` 或 `SyncingRatingRepository`（包装 local 和 remote 做合并）不动 service 层。

新建 `src/features/rating/` 整个 feature 目录：
```
rating/
├── components/
│   ├── RatingInputSheet.tsx     # 底部弹窗：rating + efficiency + 三个选填
│   ├── RatingHistoryList.tsx    # 列表：按日期倒序
│   ├── StarRating.tsx           # 1-5 星组件，主题色
│   └── EfficiencySlider.tsx     # 1-5 slider 组件，主题色
├── copy/
│   └── empty-state-quips.ts     # 50 条空状态文案 + pickRandomQuip()
├── hooks/
│   └── useRatings.ts
├── services/
│   └── ratings.service.ts       # CRUD 包装，走 repository
├── storage/
│   ├── ratings.storage.ts       # AsyncStorage 实现
│   ├── ratings.storage.test.ts
│   ├── repository.ts            # RatingRepository 接口
│   └── local-repository.ts      # LocalRatingRepository 实现（封装 ratings.storage）
├── index.ts
└── types.ts
```

## UI 交互

**入口**（本次做两个）：
1. Tab 导航加一个「RATING」Tab（`app/rating.tsx`），显示历史列表 + 右下 FAB「+ 新增」
2. FAB 打开 `RatingInputSheet`，字段：
   - 时段（默认当前时间往前 1h，可编辑）
   - **星级 Rating**（1-5 横排，点击填充，`StarRating.tsx`）
   - **效率 Slider**（1-5 离散刻度，横向 slider，`EfficiencySlider.tsx`）
   - 活动（可选，单行，≤50）
   - 心情（可选，单行，≤20）
   - 反思（可选，多行，≤200）
   - 保存 / 取消

**历史列表**：
- 按日期分组，最近在上
- 每条展示：时段 · 星级 · 效率 · 活动摘要
- 点击进详情（v1 先不做编辑，只展示）

**空状态**：一句话 + 箭头指向 FAB。

## UI 美学要求（**不可降级**）

CyberSchedule RN 是赛博朋克视觉，**不是**默认 RN 长相。Codex/Claude 写 UI 时必须：

1. **字体**：数字、标签、Tab 文字用 `Orbitron`（已加载），中文用 system。直接复用根布局 `_layout.tsx` 里的字体加载逻辑
2. **色值零硬编码**：全部从 `useTheme()` 取；星级激活色、slider 活动区用 `colors.primary`；星级/slider 禁用态用 `colors.textSecondary` 或等价主题字段
3. **Tab icon**：新 RATING Tab 的图标交互（选中/未选中、字体大小、颜色过渡）必须和现存 TODAY / MATRIX / SETTINGS 三个 Tab **完全一致**。照抄 `app/_layout.tsx` 里现有 Tab 的 pattern
4. **StarRating 组件**：不是直接把 5 个 lucide `<Star/>` 罗列完事。要有点击反馈（scale / color transition）、未选中态要有明确 outline
5. **EfficiencySlider 组件**：不用系统默认 slider 样子。track + thumb 都按主题色定制，thumb 下方显示当前数值（Orbitron 字体）。离散 5 档，每档有小刻度线
6. **底部弹窗（RatingInputSheet）**：滑入动画、圆角顶部、背景 overlay、主题色边框。参考现存 `EventSheet.tsx` 或 schedule/components 下任何已有 Sheet 组件的视觉规格
7. **历史列表卡片**：每条是一张卡而不是纯文本行。边框/背景/圆角和 `TodaySection` 或类似首页现有卡片一致
8. **空状态**：文案从下面 50 条池子里**随机抽一条**展示。**这 50 条逐字复制到 `src/features/rating/copy/empty-state-quips.ts`，不许增删改**（语气是 Lux 写的，Codex/Claude 一碰就走味）：

```ts
// src/features/rating/copy/empty-state-quips.ts
export const EMPTY_STATE_QUIPS: readonly string[] = [
  '还没打分 这一小时白过了',
  '你有时间看这页 说明没时间打分？',
  '空得像你昨晚的计划',
  '这一小时跑哪去了 说',
  '纪念碑空着呢',
  '没记录 = 没发生（存在主义角度）',
  '不打 = 默认 5 星？我不替你填',
  '不打 = 默认 1 星？我也不替你填',
  '梯度下降也要 log 的',
  '没数据的 dashboard 最诚实',
  'FAB 在右下 等你',
  '打一个 别让这页比你生活还干净',
  '清一色空着 赛博极简 但你得加料',
  '上一小时归档权归你',
  '"刚才干啥了" 两分钟回忆一下',
  '你不打分 Lux 就没素材',
  '这一小时本来可以留点痕迹',
  '空窗期谁都有 但你总得标一下',
  '打一条 页面就不那么荒',
  '评分延后一天就写不出来了',
  '时间是流的 评分是锚',
  '过去是唯一你能打分的东西',
  '不是每小时都值得记住 但都可以被记录',
  '你在等完美时段来打分？那就永远空',
  '打分不是监工 是留痕',
  '评分多了像病历 少了像空病房',
  '写一条 再关 app 也不迟',
  '点 FAB → 选时段 → 完事',
  '一小时 1 星也是记录',
  '"还没打" 和 "不想打" 差一个动作',
  '每条打分都是给下周的自己写的',
  '这页面还没毕业 需要你喂样本',
  '空列表挺赛博 有数据更赛博',
  '时段结束了 记忆正在衰减',
  'log 一下 就当给自己备份',
  '这里缺一条 像代码缺一行测试',
  '打完去干别的 别在这页面待着',
  '不记就忘 忘了就没发生过',
  '刚过那一小时 给它几颗星',
  '你的"待办"和"已发生"之间 差一个评分',
  'Star 键就在那',
  '效率 1 的那一小时 最值得记',
  '站在现在 往回指一下',
  '空白是暂时的 除非你懒',
  '不打就别幻想将来能看出模式',
  '现在打一条 刚好',
  '上个时段已经走了 至少标个墓碑',
  '这页面越空 越说明你活得快',
  '打分是给未来的你收集的证据',
  '空状态也算一种状态 但不是好状态',
] as const;

export function pickRandomQuip(): string {
  return EMPTY_STATE_QUIPS[Math.floor(Math.random() * EMPTY_STATE_QUIPS.length)];
}
```

空状态组件在 mount 时调 `pickRandomQuip()` 拿一条。不要每次 re-render 重抽（会闪）。用 `useMemo(() => pickRandomQuip(), [])` 或 `useState(() => pickRandomQuip())`。

**验证手段**：写代码前**强制先读** `app/_layout.tsx`、`app/index.tsx`、`src/features/schedule/components/EventSheet.tsx`、`src/theme/index.ts`（主题字段）、至少一个现有 Tab 页面，把视觉惯例吃进去再动笔。

## 导出 JSON

在 settings 页加一个按钮「导出打分数据」：
- 拉全部 ratings → JSON.stringify
- 用 `expo-sharing`（如果没装，先用 `Share.share(string)` 兜底）

## 测试

`ratings.storage.test.ts` 至少覆盖：
- 空初始状态
- 增 → 读
- 改 → 读（`updated_at` 有刷新）
- 删 → 读
- JSON 序列化/反序列化对 edge case（空字段、emoji、长字符串）不炸
- `rating` 和 `efficiency` 字段均被正确保存/读取

`local-repository.test.ts` 覆盖 `RatingRepository` 接口的本地实现：
- `listPendingSync()` 只返回 `synced_at == null` 的
- `markSynced()` 后下次 `listPendingSync()` 不再包含该条

跳过 UI 测试（Expo 下成本高，本次不做）。

## Architecture 文档更新

Phase 结束后，更新 `ARCHITECTURE.md`：
- 目录结构加 `src/features/rating/`
- 数据流加 rating 分支
- API Contracts 列出 rating service 的 CRUD 签名

## 已决定（Lux 做的默认，Iris 可事后推翻）

1. **Tab icon**：`Star` from lucide-react-native
2. **评分粒度**：1-5 星
3. **默认时段**：当前时间往前 1 小时（hard-coded，不查课表）
4. **Tab 位置**：第 4 个 Tab，并列 TODAY / MATRIX / SETTINGS。顺序：TODAY · MATRIX · RATING · SETTINGS
5. **`linked_event_id` 钩子**：保留在 schema 里但本次不接。为未来"课表时段结束自动弹出打分"留位

## 验收

- [ ] 能在手机上 APK 跑起来
- [ ] 新增一条打分 → 杀进程重开还能看到
- [ ] 导出 JSON 能打开、结构对
- [ ] `npm test` 通过
- [ ] ARCHITECTURE.md 更新了
