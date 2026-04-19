# CyberSchedule RN — Project Conventions

React Native + Expo app（Android primary）for 课表 + 时段打分，含云同步。TypeScript。

## Stack & layout

- **Framework**: Expo SDK 55, React Native 0.83, expo-router
- **Language**: TypeScript (strict)
- **Test**: Jest (`npm test`)
- **Build**: `cd android && ./gradlew.bat assembleRelease` — 详见 `BUILD_ANDROID.md`
- **Web dev**: `npm run web` (localhost:8081, Metro hot-reload) — UI 可在浏览器预览

## Directory

```
app/                    # expo-router pages (tabs)
  matrix.tsx            # 周视图
  rating.tsx            # 打分页（日视图 + 列表 tab）
  settings.tsx
  index.tsx             # today 页
src/
  features/
    schedule/           # 事件 / 课表 feature
    rating/             # 打分 feature（含 sync）
    todo/
  theme/                # 主题（见下）
  platform/storage/     # AsyncStorage 封装
  shared/components/    # AppBar, FAB 等
```

架构综述见 `ARCHITECTURE.md`。

## Theme 系统

7 个主题文件在 `src/theme/`（cyber、hanami、midnight、minimal、ocean、sakura…）。每个主题实现 `ThemeConfig`（`src/theme/types.ts`）。

**必须用 `theme.colors.X`，禁止硬编码 hex**。完整 color 列表：

`bg / card / cardBorder / primary / accent / success / ratingFill / danger / warning? / textMain / textSub / overlay / inputBg / divider / priorityHigh/Medium/Low`

字体：`theme.fonts.heading`（Orbitron）+ `theme.fonts.body`（System）。
圆角：`theme.radius.card / button / sheet`。

Category 色在 `src/features/schedule/types.ts`（`CategoryKey` 6 类），主题级别可覆盖 `categoryColors`。

## RN-specific rules

- 组件只用 RN：`View` / `Text` / `Pressable` / `TouchableOpacity` / `ScrollView` / `Modal` / `TextInput`——**禁止** `<div> <span> <button>`
- 样式用 `StyleSheet.create` + 内联 `style` prop；**禁止** className / Tailwind / styled-components
- 间距用 number（dp/sp 单位，不写 px）
- 图标用 `lucide-react-native`（`Plus` / `X` / `ChevronLeft/Right` / `Star` 等已用过）
- 动画优先 `react-native-reanimated`，已安装

## Feature-level invariants（**设计改动不能破的接口**）

### Rating feature（`src/features/rating/`）

- `RatingInput` / `TimeSlotRating` 类型（`types.ts`）— 字段结构不能改，云同步 schema 绑定
- `linked_event_id` 字段—rating 绑事件的关键
- `sync/`、`storage/`、`services/`、`hooks/useRatings.ts`—**全部不动**（云同步逻辑 + 本地持久化，已和 VPS 服务端对齐）
- UI 层可自由重构：`components/RatingInputSheet.tsx` / `DayView.tsx` / `EventPicker.tsx` / `StarRating.tsx` / `EfficiencySlider.tsx` / `RatingHistoryList.tsx` 等

### Schedule feature

- `ScheduleEvent` 类型不动
- `storage/` + `domain/repeat.ts`（事件重复展开逻辑）不动
- `MatrixEventBlock` 组件可改内部样式，保留 props 接口
- `components/DateTimePicker.tsx`：rating sheet 的自定义时段模式用它

### Sync layer — **完全 off-limits for UI 改动**

`src/features/rating/sync/` 整个目录是云同步基础设施，和 VPS `api.epoch0.org/v1/ratings` 绑定。**UI 设计工作不应接触**。

## 图标与交互约定

- 打分：★ 星级 1-5 + EFF 效率 1-5
- 事件块 + rating：绑定事件显示 `★×N EFF×N` strip
- 事件未打分：右下角 `Plus` 图标暗示可 tap 打分
- 日视图 tap 分派：rated 事件 → `RatingDetailModal`；unrated 事件 → `RatingInputSheet` 事件模式；自定义 rating → `RatingDetailModal`

## 出工作区的边界

- ❌ 服务端代码（`D:\_PROJECTS\ratings-api\`，另一个 repo）
- ❌ 云同步协议与数据 schema
- ❌ gradle / Android native 配置（`android/` 下除非明确说要改打包）
- ❌ Test file 删测试——可以改断言匹配新 UI，但不能减少覆盖
- ✅ UI 重构、主题扩展、新增 `ratingFill` 式色槽、组件拆分
- ✅ 新增纯 UI 组件到 `src/features/<feature>/components/` 或 `src/shared/components/`
