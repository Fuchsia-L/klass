# Cloud Sync — CyberSchedule RN ↔ api.epoch0.org

**Target branch**: `feat/cloud-sync`
**Status**: draft，等 Iris 审
**Depends on**: `spec-time-slot-rating.md` 已落地（`src/features/rating/` 已存在）

## 为什么

手机上打的分要能上云。v1 只解决：单用户、单 app、推拉打分数据。MCP / web 端后续做。

## 范围（In）

- 新建 `src/features/rating/sync/` 子模块
- `CloudRatingApiClient`：封装 `POST /v1/ratings/sync` / `GET /v1/ratings`，Bearer token 认证
- `SyncingRatingRepository`：包装现有 `LocalRatingRepository`，实现同 `RatingRepository` 接口；所有 save/remove 后触发推送
- `SyncScheduler`：单例，**debounce 5 秒推送** + **app 前台激活时拉取** + **失败排队重试**
- 设置页加"云端同步"区域：token 输入 + 状态显示（"xx 秒前同步 / 正在同步 / 失败：msg / 未配置"）
- App 启动时如果 token 已配置就初始化 scheduler
- `RatingServiceProvider` 切换成使用 `SyncingRatingRepository`
- 所有新生成的 `created_at` / `updated_at` / `synced_at` **必须** 毫秒精度 ISO（`new Date().toISOString()`），不允许秒级精度

## 范围（Out，v1 不做）

- **`expected_updated_at` 字段**：server 已支持，但 **app 侧绝对不带**。app 走默认 LWW 路径。MCP/Lux 才带（未来做 MCP 时的客户端职责）
- 多设备同步冲突 UI（单 app 无冲突）
- 离线队列的用户可见提示（只做静默重试）
- 数据迁移工具（旧数据首次启动时全部推云即可）
- Tombstone GC（超过 N 天的已删除记录物理清理）—— 未来单独做
- 任何 MCP endpoint
- 多租户 / 多用户

## 软删除（必做）

`TimeSlotRating` schema 新增字段：

```ts
deleted_at?: string | null;  // ISO timestamp 表示已删除，null = 活跃
```

**为什么做**：本地删 + 云端留 + 下次 pull 回来 = 数据复活 bug。而且未来 AI（Lux MCP）也需要删除能力，必须从 v1 就把删除语义对齐好。

**语义规则**：
- `LocalRatingRepository.remove(id)` **不真删**，改为 `save({ ...existing, deleted_at: now, updated_at: now })`
- `LocalRatingRepository.list()` 默认 **filter 掉** `deleted_at != null` 的记录
- `LocalRatingRepository.get(id)` 对已删除 record 返回 `null`（当作不存在）
- `LocalRatingRepository.listPendingSync()` 仍返回 tombstone（要推上去）
- Sync 时 tombstone 和普通 record 一样走 `POST /v1/ratings/sync`；server 侧已支持（见 `deleted_at` 字段）
- Pull 回来的 tombstone：正常 upsert 到本地（本地 list filter 会自动隐藏）
- UI 层（`useRatings` hook、`RatingHistoryList`）直接消费 `list()` 结果，看不到软删 record，无需感知

**字段校验**：`deleted_at` 非空时必须是合法 ISO 字符串；其他字段（rating/efficiency 等）即使记录被软删也要保留原值，**不要置空**（将来恢复删除 or 审计时需要）。

**`remove` 行为约束**：只能对当前非软删 record 调用；对已软删的 record 再调 remove 是 no-op（或 throw 看实现偏好，倾向 no-op）。

### 删除 UI（必做，在 RATING tab 上）

v1 必须有删除入口。接入点：现有详情 modal（历史列表 item press 打开的只读 modal）。

- modal 里底部加一个 `删除` 按钮，样式用主题 danger/destructive 色（若无现成主题字段，用 `colors.primary` 的低饱和处理，或复用设置页"清除所有数据"按钮的样式）
- 点击后 `Alert.alert('删除这条打分？', '删除后本地列表和云端都不再显示，可通过同步协议恢复。', [取消, 删除])`；二次确认走 destructive 样式
- 确认后调 `ratings.service.remove(id)`（走 tombstone 流程），关闭 modal，刷新列表
- 列表侧不需要加"左滑删除"或"长按菜单"；详情 modal 入口一处足够，避免误触
- 列表项上若已有任何 tap 反馈，保持一致——不新增视觉

不做：批量删除、回收站、恢复 UI（schema 支持，但 v1 无入口）。

## 错误与重试策略（指数退避）

| 错误类型 | 退避 | 最大次数 |
|---------|------|---------|
| 网络不通 / 超时 / 5xx | `5s, 30s, 2m, 5m, 5m, 5m...` | 无限（cap 在 5min 间隔） |
| 401/403 | **不退避、不自动重试** | 必须用户更新 token 后由设置页触发 `scheduler.start()` |
| 部分 rejected（`errors` 非空） | 不退避，继续下次正常流程 | — |

**触发逻辑**：每次退避结束后 fire 一次 `doSync()`；期间如果 `notifyLocalChange()` 被调用，立即 reset 退避并 debounce 5s 重新跑（优先响应用户操作）。

**状态文案（短）**：
- `idle` + `lastSyncAt`: `"{n} 秒前同步"` / `"{n} 分钟前同步"`
- `idle` + never: `"从未同步"`
- `syncing`: `"同步中"`
- `error` (网络): `"网络异常 · {n}s 后重试"`
- `error` (server): `"服务端异常 · {n}s 后重试"`
- `error` (token): `"token 无效"`（无倒计时，等重填）
- `error` (timeout): `"超时 · {n}s 后重试"`
- `unconfigured`: `"未配置"`

## 设计

### API 合约（server 已上线 `https://api.epoch0.org`）

**POST `/v1/ratings/sync`**

请求：
```json
{
  "records": [TimeSlotRating, ...],
  "since": "2026-04-18T00:00:00.000Z"   // optional
}
```
- `records`：需要推送的本地记录数组（可空）。**app 侧发送时不带 `expected_updated_at` 字段。**
- `since`：期望服务器回推 `updated_at > since` 的记录。app 应传 **本地已知最大 `updated_at`**（首次同步传 `null` / 省略，拉全量）

响应：
```json
{
  "applied": 1,
  "rejected": 0,
  "errors": [],
  "records": [TimeSlotRating, ...],
  "server_time": "..."
}
```
- `records`：从 server 拉回的新/更新记录
- `rejected > 0` 时 `errors` 里可能包含 `{ id, error: 'stale' | 'mood must be string <= 20' | ... }`。app 只需记录到日志，不弹 UI

**GET `/v1/ratings?since=<ISO>`**

纯拉取，响应格式同上（无 `applied`/`rejected`）。调试用。

**Bearer 认证**：
```
Authorization: Bearer <SYNC_TOKEN>
```

### 文件结构

```
src/features/rating/
  sync/
    api-client.ts              # CloudRatingApiClient
    api-client.test.ts
    syncing-repository.ts      # SyncingRatingRepository
    syncing-repository.test.ts
    sync-scheduler.ts          # SyncScheduler 单例
    sync-scheduler.test.ts
    sync-state.ts              # SyncStatus type + event emitter
    index.ts
  (existing) storage/local-repository.ts   # 保持不变
  (existing) services/ratings.service.ts   # 保持不变（通过 RatingRepository 注入切换）
```

### 类型

```ts
// src/features/rating/sync/sync-state.ts
export type SyncStatus =
  | { kind: 'idle'; lastSyncAt: string | null }
  | { kind: 'syncing' }
  | { kind: 'error'; message: string; lastSyncAt: string | null }
  | { kind: 'unconfigured' };
```

### CloudRatingApiClient

```ts
interface CloudRatingApiClient {
  sync(payload: { records: TimeSlotRating[]; since?: string | null }): Promise<SyncResponse>;
  list(since?: string | null): Promise<SyncResponse>;
}
```

- 构造参数：`{ baseUrl: string; getToken: () => Promise<string | null> }`
- baseUrl 默认 `https://api.epoch0.org`，可注入（测试用 mock fetch）
- 每次请求临时拿 token（不缓存，token 变更立即生效）
- 请求超时：10s
- 非 2xx：抛 `SyncError`，`error.statusCode` 记原始 HTTP code
- 响应体里的 `errors: [...]` **不当作** request 失败，当 partial success 处理

### SyncingRatingRepository

- 实现 `RatingRepository` 接口（与 `LocalRatingRepository` 同接口）
- 构造参数：`{ local: RatingRepository; scheduler: SyncScheduler }`
- `list` / `get` / `listPendingSync` → 转发到 `local`
- `save(r)`：`local.save(r)` → `scheduler.notifyLocalChange()`
- `remove(id)`：`local.remove(id)` → `scheduler.notifyLocalChange()`（v1 不跨端删除，只清本地；本地删了 local.list 就不返回，下一次 push 也不含）
- `markSynced(id, syncedAt)` → 转发到 `local`

### SyncScheduler

**单例**（`getSyncScheduler()` 获取）。构造参数：`{ repository: RatingRepository; apiClient: CloudRatingApiClient; statusEmitter: SyncStateEmitter }`。

**对外 API**：
```ts
class SyncScheduler {
  start(): void;                       // app 启动时调一次
  stop(): void;                        // app 卸载/token 清空时
  notifyLocalChange(): void;           // 本地 save/remove 后触发，启动 debounce
  pullNow(): Promise<void>;            // 前台激活时调
  getStatus(): SyncStatus;
  onStatusChange(cb: (s: SyncStatus) => void): () => void;
}
```

**Debounce**：`notifyLocalChange` 调用后 5 秒窗口内后续调用不重开定时器，到点 fire 一次 `doSync()`。

**doSync 流程**：
1. emit `{ kind: 'syncing' }`
2. `pending = await local.listPendingSync()`（所有 `synced_at == null` 的）
3. `since = 本地最大 updated_at`（空库时传 `null`）
4. `res = await api.sync({ records: pending, since })`
5. merge `res.records` 到本地（每条 upsert；如果本地已有同 id，比较 `updated_at` 决定是否覆盖——本地侧也做一次 LWW）
6. 对 **推上去没 rejected** 的每条本地 record，调 `local.markSynced(id, serverTime)`
7. emit `{ kind: 'idle', lastSyncAt: serverTime }`
8. 失败（网络/500）：emit `{ kind: 'error', message, lastSyncAt: prev }`，入重试队列（下次 app 前台或 notifyLocalChange 触发时重试；不做指数退避，最简 retry-on-next-event）
9. 失败 401/403：emit `{ kind: 'error', message: 'token 无效', ... }`，**不重试**（等用户重填 token）

**token 变更**：设置页保存 token 后调 `scheduler.start()`（如果已 started，是 no-op；scheduler 内部通过 `apiClient.getToken()` 动态拿最新 token）。

### 设置页"云端同步"区域

**位置**：现有 `app/settings.tsx` 加新 section，放在"数据管理"上方（早于"导出打分数据"）。

**UI**：
- 标题 `云端同步` + 主题色小图标（`Cloud` from lucide-react-native）
- token 输入框（`TextInput`，`secureTextEntry`）
- 保存按钮：写 AsyncStorage key `cs-rn:sync-token`；写完调 `scheduler.start()` + `scheduler.pullNow()`
- 状态行（从 `SyncScheduler.getStatus()` 订阅）：
  - `unconfigured` → "未配置 token"
  - `idle` + `lastSyncAt === null` → "从未同步"
  - `idle` + `lastSyncAt` → "xx 秒前同步"（相对时间，每 30s 刷新）
  - `syncing` → "正在同步..."
  - `error` → "失败：{message}"
- "立即同步"按钮（debug 用，调 `scheduler.pullNow()` + `scheduler.notifyLocalChange()`）

**视觉**：完全照抄现有 settings 其他 section 的卡片/字体/色号，不硬编码颜色。

### Token 存储

AsyncStorage key：`cs-rn:sync-token`，value 纯 token 字符串。清空 token = remove key。

### API baseUrl 配置

默认 `https://api.epoch0.org`，写死在 `api-client.ts` 常量里。不做 per-user 可配（单用户无意义）。

## Repository 注入切换

当前 `ratings.service.ts` 接收 `RatingRepository`。主 provider（`RatingServiceProvider`）改为构造 `SyncingRatingRepository` 包装 `LocalRatingRepository`，并传入 scheduler 单例。

```ts
// pseudo-code
const local = new LocalRatingRepository();
const scheduler = getSyncScheduler({ local, apiClient });
const repo = new SyncingRatingRepository({ local, scheduler });
const service = createRatingsService(repo);
```

## 数据流（写）

```
User taps save in RatingInputSheet
  → ratings.service.ts create/update
  → SyncingRatingRepository.save
    → LocalRatingRepository.save (AsyncStorage)
    → SyncScheduler.notifyLocalChange
      → 5s debounce → doSync
        → CloudRatingApiClient.sync({records, since})
        → POST https://api.epoch0.org/v1/ratings/sync
        → markSynced(id, server_time) for each applied record
```

## 数据流（读）

```
App becomes active (AppState change to 'active')
  → SyncScheduler.pullNow
    → CloudRatingApiClient.list(since = max local updated_at)
    → merge records into LocalRatingRepository (LWW by updated_at)
```

## 时间戳约束（重要）

- 所有 `created_at` / `updated_at` / `synced_at` 必须是 `new Date().toISOString()` 的格式：`YYYY-MM-DDTHH:mm:ss.sssZ`（**带毫秒**）
- 原因：server 对 `expected_updated_at` 做字符串 `===` 比较，毫秒精度防止同秒写入冲突；app LWW 也依赖字符串字典序 + 毫秒区分
- 如果发现代码里有 `.slice(0, 19)` 或手搓的 `YYYY-MM-DDTHH:mm:ssZ` 组合，**必须改掉**

## 错误处理策略

见上方"错误与重试策略（指数退避）"一节，此处合并。

## 测试

### 单元测试
- `api-client.test.ts`：mock fetch，测 auth header 正确传递；测 sync/list URL 构造；测 401 映射为 SyncError
- `syncing-repository.test.ts`：mock local + scheduler，测 save 后 scheduler.notifyLocalChange 被调
- `sync-scheduler.test.ts`：
  - 5s debounce：快速多次 notifyLocalChange 只触发一次 doSync
  - 成功路径：markSynced 对应 id
  - 网络失败：status 切 error，下次 notifyLocalChange 会再试
  - 401：status 切 error，**不**自动重试
  - pullNow：不 debounce，立即 fire

### 手动测试
- 打一条分 → 5 秒后 `curl -H 'Authorization: Bearer $TOKEN' https://api.epoch0.org/v1/ratings` 看到该条
- 手动停 VPS service → 打分 → 观察状态"失败" → 重启 service → 前台激活 → 状态恢复"xx 秒前同步"
- token 乱填 → 状态"token 无效"，改成正确 token → 重推成功
- 本地已有 5 条，装新 token → 前台激活 → 5 条全推云（首次同步全量）
- 删除本地一条 → 同步 → 服务器那条还在（v1 不做跨端删除，已知限制）

### 目标可跑命令
- `npm test` 绿
- `npx tsc --noEmit` 零错误
- `npm run build:apk-release`（或现有打包命令）能出 APK

## 已知限制 / 未来 TODO

- Tombstone GC（超过 N 天的已删除记录物理清理）
- Token 存 AsyncStorage 明文（Expo SecureStore 是更好选择，v1 先不加复杂度）
- 没有"同步历史"页，只显示最后一次状态
- 恢复删除（undelete）—— v1 不做 UI，但 schema 支持（只需写一条 `deleted_at: null` 的 update）

## Phases

1. **Tombstone schema + local 软删除**：`TimeSlotRating` 加 `deleted_at` 字段；`LocalRatingRepository` 改造（remove 改 tombstone、list filter、get 返 null）；`listPendingSync` 涵盖 tombstone；相关 unit test 覆盖
2. **API client + types**：`api-client.ts` + `sync-state.ts` + unit tests
3. **SyncingRatingRepository**：包装 local，触发 scheduler + unit tests
4. **SyncScheduler**：debounce + 指数退避 retry + pullNow + unit tests
5. **Settings 页集成 + 删除 UI**：
   - 设置页 "云端同步" section（token 输入、状态显示、保存按钮、重启 scheduler）
   - 详情 modal 加"删除"按钮 + Alert 二次确认
6. **接入主流程**：启动时 start scheduler（如果已配置 token），AppState 激活时 pullNow，RatingServiceProvider 切到 SyncingRatingRepository
7. **文档 + 手动测试 + APK**：ARCHITECTURE.md 更新 sync 模块、npm test 绿、打 APK

---

## UI 美学要求（继承自 spec-time-slot-rating.md）

设置页"云端同步"区域的所有色号必须通过 `useTheme()` 取；图标用 lucide-react-native；按钮样式跟现有 settings 其他按钮一致（不自创新样式）。状态文本字体跟现有一致。
