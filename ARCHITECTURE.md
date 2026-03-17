# CyberSchedule RN — 架构文档

## Related Docs

- Android 构建与打包说明：`BUILD_ANDROID.md`

## 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | Expo + React Native | SDK 55 / RN 0.83 |
| 语言 | TypeScript | 5.9 |
| 路由 | Expo Router (file-based) | 55.0.5 |
| 存储 | AsyncStorage | 2.2.0 |
| 图标 | lucide-react-native | 0.577.0 |
| 字体 | expo-font + Orbitron | 55.0.4 |
| 平台 | Android only | - |

## 目录结构

```
cyberschedule-rn/
├── app/                        # Expo Router 页面
│   ├── _layout.tsx             # 根布局：字体加载 + ThemeProvider + Tab 导航
│   ├── index.tsx               # 首页：TODAY / TOMORROW 日程列表
│   ├── matrix.tsx              # 周视图：7列网格 + 时间轴
│   └── settings.tsx            # 设置页：学期配置 + 主题切换
├── src/
│   ├── features/
│   │   ├── schedule/
│   │   │   ├── components/     # 日程 UI 组件
│   │   │   ├── domain/         # 重复事件、冲突、日历规则
│   │   │   ├── hooks/          # useEvents()
│   │   │   ├── services/       # CRUD 业务流程
│   │   │   ├── storage/        # 事件/学期持久化
│   │   │   ├── index.ts        # feature 出口
│   │   │   └── types.ts        # 日程领域类型
│   │   └── settings/
│   │       ├── hooks/          # 设置表单状态
│   │       ├── services/       # 设置聚合服务
│   │       └── index.ts
│   ├── platform/
│   │   └── storage/            # AsyncStorage 平台封装
│   ├── shared/
│   │   ├── components/         # 跨 feature 通用组件
│   │   └── lib/                # 通用日期/id 工具
│   └── theme/                  # 主题系统
├── assets/
│   └── fonts/
│       ├── Orbitron-Regular.ttf
│       └── Orbitron-Bold.ttf
├── app.json                    # Expo 配置
├── package.json
└── tsconfig.json
```

## 数据流

```
用户操作
  ↓
组件 (EventSheet / HomePage / MatrixPage)
  ↓
features/schedule/services/events.service.ts
  ↓
features/schedule/storage/*.ts
  ↓
platform/storage/async-storage.ts
  ↓
内存缓存 (cachedEvents) + listener 通知
  ↓
features/schedule/hooks/useEvents.ts 触发组件重渲染
```

## 主题系统

```
ThemeProvider (app/_layout.tsx)
  ↓ 读取/保存主题到 AsyncStorage
useTheme() / useThemeSettings()
  ↓ 组件获取色值
StyleSheet + 动态 style
```

**添加新主题：**
1. 在 `src/theme/` 新建主题文件（参考 cyber.ts）
2. 在 `src/theme/index.ts` 注册
3. 通过 `setThemeName()` 切换

**规则：组件内零硬编码色值，所有颜色从 theme 取。**

## 核心逻辑

### 重复事件展开 (`features/schedule/domain/repeat.ts`)
- 输入：事件列表 + 日期范围
- 按 daily/weekly 步进生成虚拟实例
- 每个实例保留原事件 id，调整 start_time/end_time

### 冲突检测 (`features/schedule/domain/conflicts.ts`)
- 将候选事件和所有已有事件都展开为实例
- 逐对比较时间区间是否重叠
- 返回冲突事件列表

### 数据持久化 (`features/schedule/storage/` + `platform/storage/`)
- AsyncStorage JSON 存储
- 内存缓存 + listener 模式避免频繁 IO
- useEvents() hook 自动订阅数据变更

## 页面功能

| 页面 | 功能 |
|------|------|
| Home (index.tsx) | TODAY/TOMORROW 分组列表、空状态、下拉刷新、点击查看详情 |
| Matrix (matrix.tsx) | 7列日期网格、06:00-00:00 时间轴、事件色块、当前时刻线、左右切周、ISO 周数、点击空白新建 |
| Settings (settings.tsx) | 学期开始日期、总周数、主题切换、后续能力预留 |
| EventSheet | 查看/新建/编辑模式、完整表单、冲突提示、时间校验 |

## 已知限制

- 重复事件冲突检测范围为候选事件前后各 1 个月
- 无数据导入导出
- 无通知推送（reminder_minutes 字段已预留）
