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

- 一个时段结束后能够录入：**星级评分（1-5）+ 选填一句反思 + 选填"做了什么"**
- 可以浏览最近 N 天的时段评分历史
- 数据本地持久化（AsyncStorage）
- 能导出成 JSON（占位云端同步用，未来接真云端时直接替换）

## 范围（Out，本次不做）

- 桌面小部件
- 云端同步 / 域名 / 服务器
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
  rating: 1 | 2 | 3 | 4 | 5;
  mood?: string;           // 单字段 free text，≤ 20 字
  activity?: string;       // 这段时间做了啥，≤ 50 字
  reflection?: string;     // 一句反思，≤ 200 字
  created_at: string;      // ISO timestamp
}
```

**说明**：
- 独立实体，不改现有 `ScheduleEvent` schema（避免污染课表导入）
- `linked_event_id` 是为将来"课表时段结束 → 自动弹出打分"留的钩子，这次不接
- 所有 mood/activity/reflection 都 optional，降录入阻力

## 存储层

新文件 `src/features/rating/storage/ratings.storage.ts`，pattern 照搬 `events.storage.ts`：
- AsyncStorage key: `cs-rn:time-slot-ratings:v1`
- CRUD + listener 通知
- 内存缓存 + load on demand

新建 `src/features/rating/` 整个 feature 目录：
```
rating/
├── components/
│   ├── RatingInputSheet.tsx     # 底部弹窗：评分 + 三个选填
│   └── RatingHistoryList.tsx    # 列表：按日期倒序
├── hooks/
│   └── useRatings.ts
├── services/
│   └── ratings.service.ts       # CRUD 包装
├── storage/
│   ├── ratings.storage.ts
│   └── ratings.storage.test.ts
├── index.ts
└── types.ts
```

## UI 交互

**入口**（本次做两个）：
1. Tab 导航加一个「RATING」Tab（`app/rating.tsx`），显示历史列表 + 右下 FAB「+ 新增」
2. FAB 打开 `RatingInputSheet`，字段：
   - 时段（默认本小时整点~当前时间，可编辑）
   - 星级（1-5 的横排圆点）
   - 活动（可选，单行）
   - 心情（可选，单行，≤20）
   - 反思（可选，多行，≤200）
   - 保存 / 取消

**历史列表**：
- 按日期分组，最近在上
- 每条展示：时段 · 星级 · 活动摘要
- 点击进详情（v1 先不做编辑，只展示）

**空状态**：一句话 + 箭头指向 FAB。

**主题**：严格走现有 `useTheme()`，零硬编码色值。星级激活色用 `colors.primary`（和首页一致）。

## 导出 JSON

在 settings 页加一个按钮「导出打分数据」：
- 拉全部 ratings → JSON.stringify
- 用 `expo-sharing`（如果没装，先用 `Share.share(string)` 兜底）

## 测试

`ratings.storage.test.ts` 至少覆盖：
- 空初始状态
- 增 → 读
- 改 → 读
- 删 → 读
- JSON 序列化/反序列化对 edge case（空字段、emoji、长字符串）不炸

跳过 UI 测试（Expo 下成本高，本次不做）。

## Architecture 文档更新

Phase 结束后，更新 `ARCHITECTURE.md`：
- 目录结构加 `src/features/rating/`
- 数据流加 rating 分支
- API Contracts 列出 rating service 的 CRUD 签名

## 开放问题（等 Iris 定）

1. **Tab icon**：新 Tab 用哪个 lucide 图标？（建议：`Star` 或 `Gauge`）
2. **星级 vs 百分制**：现在是 1-5 星，你想要 1-10 还是 1-100？
3. **默认时段长度**：新增时默认时段范围是"过去 1 小时"还是"过去一节课（需要查课表）"？
4. **是否把 RATING Tab 放在显眼位置**：今 TODAY / MATRIX / SETTINGS 三个 Tab，加 RATING 就是四个。还是塞到 SETTINGS 下面？
5. **未来接课表自动触发**这条链想走吗？走的话 `linked_event_id` 保留，不走就删掉

## 验收

- [ ] 能在手机上 APK 跑起来
- [ ] 新增一条打分 → 杀进程重开还能看到
- [ ] 导出 JSON 能打开、结构对
- [ ] `npm test` 通过
- [ ] ARCHITECTURE.md 更新了
