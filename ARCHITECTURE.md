# CyberSchedule RN — Architecture

Single source of truth for all agents (coders and reviewers). Keep this file in sync with the code: if a symbol exists, it must be listed here; if it is listed here, it must exist.

## Related Docs

- Android build & packaging: `BUILD_ANDROID.md`
- Time-slot rating feature spec: `docs/spec-time-slot-rating.md`

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Expo + React Native | SDK 55 / RN 0.83 |
| Language | TypeScript | 5.9 |
| Routing | Expo Router (file-based) | 55.0.5 |
| Storage | @react-native-async-storage/async-storage | 2.2.0 |
| Icons | lucide-react-native | 0.577.0 |
| Fonts | expo-font + Orbitron | 55.0.4 |
| Test | Jest + jest-expo + @testing-library/react-native | 29 / 55 / 13 |
| Platform | Android only | — |

---

## 1. File Structure

### Root / config
- `app.json` — Expo config (name, icons, splash, Android bundle).
- `package.json` — deps, scripts (`start`, `android`, `ios`, `web`, `test`).
- `tsconfig.json` — TypeScript compiler options.
- `jest.config.js` — Jest config (jest-expo preset).
- `jest.setup.ts` — Jest setup (AsyncStorage / WebView mocks).
- `metro.config.js` — Metro bundler config.
- `index.ts` — Expo Router entry.
- `ARCHITECTURE.md` — this document.
- `BUILD_ANDROID.md` — Android build/packaging guide.
- `docs/spec-time-slot-rating.md` — time-slot rating feature spec.
- `scripts/create-release.js` — release helper.
- `scripts/get-git-cred.js` — git credential helper.
- `scripts/upload-apk.js` — APK upload helper.

### `app/` — Expo Router screens
- `app/_layout.tsx` — root layout: font loading, `ThemeProvider`, `SafeAreaProvider`, bottom Tabs (`HOME`, `MATRIX`, `SETTINGS`).
- `app/index.tsx` — Home page: TODAY / TOMORROW event lists, TodoSection footer, FAB for new event.
- `app/index.test.tsx` — smoke test for Home.
- `app/matrix.tsx` — Matrix page: 7-column weekly grid 06:00–24:00, current-time line, week navigation, ISO/semester week label.
- `app/settings.tsx` — Settings page: theme picker, semester form, WHUT import entry, data management buttons.
- `app/settings.test.tsx` — smoke test for Settings.

### `src/features/schedule/`
- `src/features/schedule/index.ts` — public barrel exporting components, hooks, services, storage, helpers, types, and import helpers.
- `src/features/schedule/types.ts` — `CategoryKey`, `CATEGORIES`, `RepeatType`, `SCHEDULE_EVENT_SOURCES`, `ScheduleEventSource`, `ScheduleEvent`, `SemesterConfig`.
- `src/features/schedule/categoryColors.ts` — `getCategoryColor(theme, category)` resolver.
- `src/features/schedule/categoryColors.test.ts` — tests for category color resolver.

#### `components/`
- `EventCard.tsx` — themed event card (list row).
- `EventCard.test.tsx` — tests for EventCard.
- `MatrixEventBlock.tsx` — matrix cell block with adaptive title/location layout; exports `MATRIX_HOUR_HEIGHT`, `getMatrixEventContentLayout`.
- `MatrixEventBlock.test.tsx` — tests for MatrixEventBlock.
- `EventSheet.tsx` — bottom-sheet modal for view/create/edit of events.
- `EventSheet.test.tsx` — tests for EventSheet.
- `DateTimePicker.tsx` — custom wheel-style date+time picker (default export).

#### `domain/`
- `index.ts` — barrel for domain helpers.
- `calendar.ts` — `WEEKDAY_LABELS`, `getISOWeekNumber`, `getWeekStart`, `getSemesterWeek`.
- `conflicts.ts` — `detectConflicts` — expands repeats in ±1 month window and reports overlaps.
- `repeat.ts` — `expandRepeatingEvents` — emits virtual instances of daily/weekly events within a range.
- `repeat.test.ts` — tests for repeat expansion.
- `validation.ts` — `validateTimeRange`, `validateTimeHour`, `validateEventTimeWindow` (enforces 06:00–24:00 with midnight-end allowance).

#### `hooks/`
- `index.ts` — barrel.
- `useEvents.ts` — loads events, subscribes to service listener.
- `useSemesterConfig.ts` — loads semester config, subscribes to service listener.

#### `services/`
- `index.ts` — barrel.
- `events.service.ts` — in-memory listeners + CRUD orchestration (validation, conflict detect, persistence).
- `events.service.test.ts` — tests for events service.
- `semester.service.ts` — listener-wrapped semester load/save.

#### `storage/`
- `index.ts` — barrel.
- `events.storage.ts` — AsyncStorage cache + load/save/clear for events with schema validation.
- `events.storage.test.ts` — tests for events storage.
- `semester.storage.ts` — AsyncStorage load/save for `SemesterConfig`.

#### `import/` (WHUT course-table import)
- `contracts.ts` — constants (`WHUT_CLASS_PERIOD_TIME_MAP`, etc.) and types; `normalizeRawScheduleItem`, `normalizeArrangedScheduleItem`, `extractArrangedScheduleItems`.
- `contracts.test.ts` — tests for contract helpers.
- `term-code.ts` — term-code resolution: `isValidWhutTermCode`, `deriveWhutTermCodeFromDate`, `deriveWhutTermCodeFromSemesterStart`, `resolveWhutTermCode`.
- `term-code.test.ts` — tests for term-code helpers.
- `whut-import.ts` — `convertWhutArrangedListToEvents`, `importWhutArrangedList` (writes to storage).
- `whut-import.test.ts` — tests for import pipeline.
- `WhutImportModal.tsx` — modal shell wrapping WebView + status UI (`WhutImportStatus`).
- `WhutImportWebViewContainer.tsx` — embeds CAS login WebView, drives probe/fetch scripts, emits schedule detail.
- `WhutImportWebViewContainer.test.tsx` — tests for WebView container.

### `src/features/todo/`
- `src/features/todo/index.ts` — barrel: `TodoSection`, `useTodos`, service CRUD, types.
- `src/features/todo/types.ts` — `TodoType`, `Priority`, `PRIORITY_ORDER`, `PRIORITY_LABELS`, `TODO_TYPE_LABELS`, `TodoItem`.
- `components/TodoSection.tsx` — tabs (daily/weekly/longterm) + list + embedded TodoSheet.
- `components/TodoSection.test.tsx` — tests for TodoSection.
- `components/TodoItemCard.tsx` — themed row with toggle / delete affordances.
- `components/TodoSheet.tsx` — bottom-sheet modal for create/detail/edit of todos.
- `domain/index.ts` — barrel.
- `domain/refresh.ts` — `refreshTodos` resets daily/weekly completion at boundary crossings.
- `domain/sort.ts` — `sortTodosForDisplay` (incomplete first, then priority).
- `domain/sort.test.ts` — tests for sort helper.
- `hooks/index.ts` — barrel.
- `hooks/useTodos.ts` — loads todos, subscribes to service listener.
- `services/index.ts` — barrel including `TodoInput`.
- `services/todo.service.ts` — listener-wrapped CRUD with auto daily/weekly refresh on load.
- `storage/index.ts` — barrel.
- `storage/todo.storage.ts` — AsyncStorage cache + load/save/clear with validation.

### `src/features/settings/`
- `src/features/settings/index.ts` — barrel exporting `useSettingsForm`.
- `hooks/useSettingsForm.ts` — form state for semester + theme, plus `resetAll`.
- `services/settings.service.ts` — `loadSettings`, `saveSemesterSettings`, `clearAllData`.

### `src/features/rating/` — **NEW (Phase 1)**
- `src/features/rating/index.ts` — barrel re-exporting `./storage` and `./types`.
- `src/features/rating/types.ts` — `RatingValue`, `TimeSlotRating` entity.
- `src/features/rating/storage/index.ts` — barrel: `LocalRatingRepository`, `localRatingRepository`, `RatingRepository` (type), plus storage functions.
- `src/features/rating/storage/repository.ts` — `RatingRepository` interface contract.
- `src/features/rating/storage/ratings.storage.ts` — AsyncStorage-backed store (key `cs-rn:time-slot-ratings:v1`) with in-memory cache, validation, listener notifications, and timestamp management (`prepareRatingForSave` refreshes `updated_at` on update).
- `src/features/rating/storage/ratings.storage.test.ts` — storage tests (CRUD, listeners, edge cases).
- `src/features/rating/storage/local-repository.ts` — `LocalRatingRepository` class implementing `RatingRepository` + `localRatingRepository` singleton.
- `src/features/rating/storage/local-repository.test.ts` — repository tests (`listPendingSync`, `markSynced`).

### `src/platform/`
- `src/platform/storage/async-storage.ts` — `STORAGE_KEYS` registry, `loadJSON<T>`, `saveJSON<T>` AsyncStorage wrappers. `STORAGE_KEYS` now includes `ratings: 'cs-rn:time-slot-ratings:v1'`.

### `src/shared/`
- `src/shared/components/AppBar.tsx` — top bar with title, subtitle, optional right slot.
- `src/shared/components/FAB.tsx` — draggable + snappable floating action button.
- `src/shared/components/FAB.test.tsx` — tests for FAB interactions.
- `src/shared/components/fabPosition.ts` — FAB geometry helpers (bounds, default, clamp, snap, drag threshold, constants).
- `src/shared/lib/date.ts` — `formatTime`, `formatLocalDate`, `formatDate`, `isSameDay`.
- `src/shared/lib/id.ts` — `generateId()` (timestamp + random).

### `src/theme/`
- `src/theme/index.ts` — theme registry: `DEFAULT_THEME`, `THEME_OPTIONS`, `isThemeName`, `getTheme`, `getAllThemes`, exports individual theme objects.
- `src/theme/index.test.ts` — registry tests.
- `src/theme/types.ts` — `ThemeConfig` (colors, categoryColors, fonts, radius).
- `src/theme/ThemeContext.tsx` — `ThemeProvider`, `useTheme`, `useThemeSettings` (persists selected theme).
- `src/theme/cyber.ts` — Cyber theme (default, dark neon).
- `src/theme/minimal.ts` — Minimal theme.
- `src/theme/sakura.ts` — Sakura theme.
- `src/theme/hanami.ts` — Hanami / Sakura 桜 theme.
- `src/theme/midnight.ts` — Midnight theme.
- `src/theme/ocean.ts` — Ocean theme.

### `src/test/` / `src/types/`
- `src/test/smoke.test.tsx` — smoke test.
- `src/types/react-native-webview.d.ts` — ambient typings for `react-native-webview`.

### `assets/`
- `assets/fonts/Orbitron-Regular.ttf`, `Orbitron-Bold.ttf` — bundled fonts.
- `assets/icon.png`, `splash-icon.png`, `favicon.png`, `android-icon-*.png` — app icons & splash.

---

## 2. API / Interface Contracts

### Platform storage — `src/platform/storage/async-storage.ts`
- `STORAGE_KEYS` — `{ events, semester, theme, todos, ratings }` string map. Called by every storage module and `settings.service.ts`.
- `loadJSON<T>(key: string): Promise<T | null>` — wraps `AsyncStorage.getItem` + `JSON.parse`. Callers: `events.storage`, `semester.storage`, `todo.storage`, `ratings.storage`, `ThemeContext`.
- `saveJSON<T>(key: string, data: T): Promise<void>` — wraps `JSON.stringify` + `AsyncStorage.setItem`. Callers: same as above.

### Schedule types — `src/features/schedule/types.ts`
- `CategoryKey`, `CategoryInfo`, `CATEGORIES` (record) — used by `EventCard`, `EventSheet`, `events.storage`, `categoryColors`, `matrix.tsx`.
- `RepeatType` — used by `EventSheet`, `events.storage`, `repeat.ts`.
- `SCHEDULE_EVENT_SOURCES`, `ScheduleEventSource` — used by `events.storage`, `events.service`, `whut-import`.
- `ScheduleEvent` — primary domain entity. Used across all schedule modules, home/matrix screens, tests.
- `SemesterConfig` — `{ start_date, total_weeks }`. Used by semester service/storage, `useSettingsForm`, `whut-import`, `matrix.tsx`.

### Schedule storage — `src/features/schedule/storage/`
- `loadEventsFromStorage(): Promise<ScheduleEvent[]>` — cached read + schema filter. Callers: `events.service`, tests.
- `saveEventsToStorage(events: ScheduleEvent[]): Promise<void>` — writes + updates cache. Caller: `events.service`.
- `clearEventsCache(): void` — reset in-memory cache. Callers: `events.service.resetEventsState`, tests.
- `loadSemesterConfig(): Promise<SemesterConfig | null>` — Callers: `semester.service`, `schedule` barrel.
- `saveSemesterConfig(config: SemesterConfig): Promise<void>` — Callers: `semester.service`.

### Schedule services — `src/features/schedule/services/`
- `loadEvents(): Promise<ScheduleEvent[]>` — thin delegator. Callers: `useEvents`, `matrix.tsx` (indirectly).
- `replaceImportedEvents(importedEvents: ScheduleEvent[]): Promise<void>` — replaces all `source === 'whut-import'` events; validates invariants. Caller: `whut-import.importWhutArrangedList`.
- `subscribeToEvents(listener: () => void): () => void` — Callers: `useEvents`.
- `addEvent(event: Omit<ScheduleEvent,'id'|'is_completed'>): Promise<{ success; conflicts?; error? }>` — Callers: `EventSheet`.
- `updateEvent(event: ScheduleEvent): Promise<{ success; conflicts?; error? }>` — Callers: `EventSheet`.
- `deleteEvent(id: string): Promise<void>` — Callers: `EventSheet`.
- `toggleComplete(id: string): Promise<void>` — Callers: `EventSheet`.
- `resetEventsState(): void` — Callers: `settings.service.clearAllData`.
- `loadSemester(): Promise<SemesterConfig | null>` — Callers: `useSemesterConfig`, `settings.service`.
- `saveSemester(config: SemesterConfig): Promise<void>` — Callers: `settings.service.saveSemesterSettings`.
- `subscribeToSemester(listener: () => void): () => void` — Callers: `useSemesterConfig`.
- `resetSemesterState(): void` — Callers: `settings.service.clearAllData`.

### Schedule hooks — `src/features/schedule/hooks/`
- `useEvents(): { events, loading, refresh }` — Callers: `app/index.tsx`, `app/matrix.tsx`.
- `useSemesterConfig(): { semester, loading, refresh }` — Callers: `app/matrix.tsx`.

### Schedule domain — `src/features/schedule/domain/`
- `WEEKDAY_LABELS: string[]` (7) — Callers: `matrix.tsx`.
- `getISOWeekNumber(date: Date): number` — Callers: `matrix.tsx`.
- `getWeekStart(date: Date): Date` — Callers: `matrix.tsx`.
- `getSemesterWeek(semesterStart: string, date: Date): number | null` — Callers: `matrix.tsx`.
- `detectConflicts(candidate: ScheduleEvent, all: ScheduleEvent[]): ScheduleEvent[]` — Callers: `events.service.addEvent/updateEvent`.
- `expandRepeatingEvents(events: ScheduleEvent[], rangeStart: Date, rangeEnd: Date): ScheduleEvent[]` — Callers: `app/index.tsx`, `app/matrix.tsx`, `conflicts`, tests.
- `validateTimeRange(start: string, end: string): boolean` — internal to `validateEventTimeWindow`; re-exported via domain barrel.
- `validateTimeHour(iso: string, options?: { allowMidnight?: boolean }): boolean` — re-exported via domain barrel.
- `validateEventTimeWindow(start: string, end: string): boolean` — Callers: `events.service.addEvent/updateEvent/replaceImportedEvents`.

### Schedule components — `src/features/schedule/components/`
- `EventCard({ event, onPress? })` — Callers: `app/index.tsx`.
- `MatrixEventBlock({ event, height, style, onPress, titleColor, locationColor, testID? })` + `MATRIX_HOUR_HEIGHT`, `getMatrixEventContentLayout({ height, hasLocation, titleLineCount? })` — Callers: `app/matrix.tsx`.
- `EventSheet({ visible, mode, event?, defaultStart?, defaultEnd?, onClose })` — Callers: `app/index.tsx`, `app/matrix.tsx`.
- `DateTimePicker` (default export) `({ value, onChange, theme, mode?, minimumHour?, allowMidnight24?, onPickerActive?, testID? })` — Callers: `EventSheet`.
- `getCategoryColor(theme: ThemeConfig, category: CategoryKey): string` — Callers: `EventCard`, `MatrixEventBlock` consumers, `app/matrix.tsx`.

### Schedule import — `src/features/schedule/import/`
- `WHUT_CLASS_PERIOD_TIME_MAP`, `WHUT_IMPORT_PRESENTATION`, `WHUT_IMPORT_DEPENDENCIES`, `WHUT_TERM_CODE_RESOLUTION_ORDER` — constants used by import implementation + callers.
- `WhutClassPeriod`, `WhutArrangedScheduleItem`, `WhutArrangedScheduleItemRaw`, `WhutCourseScheduleItemRaw`, `WhutCourseTableResponseRaw` — types used by WebView container, modal, `whut-import.ts`, `settings.tsx`.
- `normalizeRawScheduleItem(raw)` / `normalizeArrangedScheduleItem(raw)` / `extractArrangedScheduleItems(scheduleDetail)` — Callers: `whut-import`, `app/settings.tsx`.
- `isValidWhutTermCode(v)`, `deriveWhutTermCodeFromDate(date)`, `deriveWhutTermCodeFromSemesterStart(start)`, `resolveWhutTermCode({ currentTermCode?, semesterStartDate?, now? })` — Callers: import logic and tests.
- `convertWhutArrangedListToEvents({ arrangedList, semesterConfig, classPeriodTimeMap? }): ScheduleEvent[]` — pure conversion.
- `importWhutArrangedList({ arrangedList, semesterConfig, classPeriodTimeMap? }): Promise<ScheduleEvent[]>` — persists via `replaceImportedEvents`. Callers: `app/settings.tsx`.
- `WhutImportModal({ visible, status, errorMessage?, importedCount?, importedTermCode?, semesterConfig?, onBeginImport, onImportError, onImportStatusChange, onScheduleDetailReady, onRequestClose })` + `WhutImportStatus` — Callers: `app/settings.tsx`.
- `WhutImportWebViewContainer({ enabled, semesterStartDate, onLoggedIn, onError, onScheduleDetailReady })` + `WhutImportWebViewContainerProps` — Callers: `WhutImportModal`.

### Todo types & services — `src/features/todo/`
- `TodoType`, `Priority`, `PRIORITY_ORDER`, `PRIORITY_LABELS`, `TODO_TYPE_LABELS`, `TodoItem` — used across todo feature.
- `loadTodos(): Promise<TodoItem[]>` — auto refreshes daily/weekly. Callers: `useTodos`.
- `subscribeToTodos(listener): () => void` — Callers: `useTodos`.
- `addTodo(input: TodoInput): Promise<void>` / `updateTodo(id, input): Promise<void>` / `deleteTodo(id): Promise<void>` / `toggleTodoComplete(id): Promise<void>` — Callers: `TodoSheet`, `TodoSection`, `TodoItemCard`.
- `resetTodosState(): void` — Callers: `settings.service.clearAllData` (indirect, via keys wipe; not currently called directly but exported for parity).
- `TodoInput` — Callers: `TodoSheet`.
- `loadTodosFromStorage()` / `saveTodosToStorage(todos)` / `clearTodosCache()` — storage-level; used by `todo.service`.
- `refreshTodos(todos: TodoItem[], now?: Date): TodoItem[]` — Callers: `todo.service.loadTodos`, tests.
- `sortTodosForDisplay(todos: TodoItem[]): TodoItem[]` — Callers: `TodoSection`.
- `useTodos(): { todos, loading, refresh }` — Callers: `app/index.tsx`.
- `TodoSection({ todos, loading? })` — Callers: `app/index.tsx`.
- `TodoItemCard({ todo, onToggle, onPress, onDelete })` — Callers: `TodoSection`.
- `TodoSheet({ visible, mode: 'create'|'detail', todo, onClose })` — Callers: `TodoSection`.

### Settings — `src/features/settings/`
- `useSettingsForm(): { form, loading, saving, message, themeName, updateField, save, setThemeName, resetAll }` — Callers: `app/settings.tsx`.
- `loadSettings(): Promise<{ semester: SemesterConfig | null }>` — Callers: `useSettingsForm`.
- `saveSemesterSettings(config: SemesterConfig): Promise<void>` — Callers: `useSettingsForm`.
- `clearAllData(): Promise<void>` — wipes all `STORAGE_KEYS` and resets schedule+semester listeners. Callers: `useSettingsForm.resetAll`.

### Rating — `src/features/rating/` **(new in Phase 1)**
Types — `src/features/rating/types.ts`:
- `RatingValue = 1 | 2 | 3 | 4 | 5`.
- `TimeSlotRating` — `{ id; slot_start; slot_end; linked_event_id?; rating: RatingValue; efficiency: RatingValue; mood?; activity?; reflection?; created_at; updated_at; synced_at?: string|null; schema_version: 1 }`.

Repository contract — `src/features/rating/storage/repository.ts`:
- `interface RatingRepository { list(): Promise<TimeSlotRating[]>; get(id: string): Promise<TimeSlotRating | null>; save(rating: TimeSlotRating): Promise<void>; remove(id: string): Promise<void>; listPendingSync(): Promise<TimeSlotRating[]>; markSynced(id: string, syncedAt: string): Promise<void> }`. Implementers: `LocalRatingRepository`. Future consumers (Phase 2+): `ratings.service.ts`.

Storage — `src/features/rating/storage/ratings.storage.ts`:
- `loadRatingsFromStorage(): Promise<TimeSlotRating[]>` — cached read with schema validation.
- `listRatings(): Promise<TimeSlotRating[]>` — alias used by repository.
- `getRating(id: string): Promise<TimeSlotRating | null>` — cached lookup.
- `saveRating(rating: TimeSlotRating): Promise<void>` — upsert; on update refreshes `updated_at` to `new Date().toISOString()` and preserves original `created_at`; always writes `schema_version: 1`.
- `removeRating(id: string): Promise<void>` — delete by id.
- `subscribeToRatings(listener: () => void): () => void` — fires on every successful mutation.
- `clearRatingsCache(): void` — test/reset hook.
- Callers: `LocalRatingRepository`, `ratings.storage.test.ts`, `local-repository.test.ts`. No UI code reaches these directly per spec — the service layer (Phase 2) goes through `RatingRepository`.

Local repository — `src/features/rating/storage/local-repository.ts`:
- `class LocalRatingRepository implements RatingRepository` — wraps storage; `listPendingSync()` filters `synced_at == null`; `markSynced(id, syncedAt)` saves with updated `synced_at`.
- `localRatingRepository` — default singleton instance for injection.
- Callers: `local-repository.test.ts`; intended consumer from Phase 2 onward is `ratings.service.ts`.

### Shared — `src/shared/`
- `AppBar({ title, subtitle?, right? })` — Callers: `app/index.tsx`, `app/matrix.tsx`, `app/settings.tsx`.
- `FAB({ onPress })` — draggable floating action button. Callers: `app/index.tsx`, `app/matrix.tsx`.
- `FAB_SIZE`, `FAB_EDGE_MARGIN`, `FAB_BOTTOM_MARGIN`, `FAB_DRAG_ACTIVE_OPACITY`, `FAB_IDLE_OPACITY`, `FAB_DRAG_THRESHOLD`, `FabPosition`, `FabScreenSize`, `FabBounds`, `getFabBounds(screen)`, `clampFabPosition(pos, screen)`, `getDefaultFabPosition(screen)`, `snapFabPosition(pos, screen)`, `hasExceededDragThreshold(dx, dy)` — Callers: `FAB.tsx`, tests.
- `formatTime(date)`, `formatLocalDate(date)`, `formatDate(date)`, `isSameDay(a, b)` — Callers: `EventCard`, `EventSheet`, `app/matrix.tsx`, `whut-import`, etc.
- `generateId(): string` — Callers: `events.service`, `todo.service`, `whut-import`, (future: `ratings.service`).

### Theme — `src/theme/`
- `ThemeConfig` — Callers: every component that styles via theme; `categoryColors` resolver.
- `DEFAULT_THEME`, `THEME_OPTIONS`, `isThemeName(name)`, `getTheme(name?)`, `getAllThemes()` — Callers: `ThemeContext`, `app/settings.tsx`, `useSettingsForm`.
- `<ThemeProvider>` — Callers: `app/_layout.tsx`.
- `useTheme(): ThemeConfig` — Callers: nearly all UI components.
- `useThemeSettings(): { themeName, setThemeName }` — Callers: `useSettingsForm`.

---

## 3. Data Flow

### Event / Schedule flow
```
User action (HomePage / MatrixPage / EventSheet)
  → features/schedule/services/events.service.ts
      (validateEventTimeWindow → detectConflicts → persist)
  → features/schedule/storage/events.storage.ts
  → platform/storage/async-storage.ts  (cs-rn events key)
  → in-memory cache (cachedEvents) + service listeners
  → features/schedule/hooks/useEvents.ts re-renders screens
```

### Semester / Settings flow
```
SettingsScreen ↔ useSettingsForm
  → features/settings/services/settings.service.ts
      → schedule/services/semester.service.ts → schedule/storage/semester.storage.ts → AsyncStorage
      → schedule/services/events.service.ts (resetEventsState on clearAllData)
  → schedule/hooks/useSemesterConfig.ts triggers re-render on matrix.tsx
```

### WHUT import flow
```
SettingsScreen opens WhutImportModal
  → WhutImportWebViewContainer (CAS login + probe scripts)
  → postMessage with scheduleDetail
  → settings.tsx.handleScheduleDetailReady
      → extractArrangedScheduleItems → importWhutArrangedList
      → replaceImportedEvents (schedule events.service)
      → AsyncStorage + listeners
  → Home / Matrix refresh via useEvents
```

### Todo flow
```
TodoSection / TodoSheet / TodoItemCard
  → features/todo/services/todo.service.ts (addTodo / updateTodo / deleteTodo / toggleTodoComplete)
      (loadTodos auto-runs refreshTodos for daily/weekly rollover)
  → features/todo/storage/todo.storage.ts → AsyncStorage
  → service listeners → useTodos → HomePage re-renders TodoSection footer
```

### Theme flow
```
ThemeProvider (app/_layout.tsx)
  ↔ AsyncStorage (cyberschedule_theme)
  → useTheme() / useThemeSettings()
  → components read colors/fonts/radius
```

### Rating flow (established in Phase 1; UI/service wiring arrives in Phases 2–5)
```
[Phase 2+] UI / useRatings
  → features/rating/services/ratings.service.ts   (not yet implemented)
  → RatingRepository   (interface, storage-independent)
  → LocalRatingRepository (Phase 1, implemented)
      → features/rating/storage/ratings.storage.ts
      → platform/storage/async-storage.ts  (key: cs-rn:time-slot-ratings:v1)
      → in-memory cache (cachedRatings) + subscribeToRatings listeners
```

The repository interface is the seam that keeps service code decoupled from AsyncStorage. A future `RemoteRatingRepository` or `SyncingRatingRepository` can replace `LocalRatingRepository` without touching the service/UI layers.

---

## 4. Dependencies

Runtime:
- `expo`, `expo-constants`, `expo-font`, `expo-linking`, `expo-router`, `expo-status-bar` — Expo SDK 55 runtime + file-based routing + font loading + status bar.
- `react`, `react-native` — core.
- `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-web` — navigation / layout primitives and web fallback.
- `react-native-webview` — CAS login flow inside `WhutImportWebViewContainer`.
- `@react-native-async-storage/async-storage` — persistence backend for events, semester, theme, todos, and ratings.
- `lucide-react-native` — icon set used across tabs, cards, sheets.

Dev / test:
- `typescript` — static typing.
- `jest`, `jest-expo`, `@testing-library/react-native`, `react-test-renderer`, `@types/jest`, `@types/react` — test harness.

Future (not yet installed, referenced in rating spec):
- `expo-sharing` (optional) — preferred for JSON export; fallback to RN `Share.share` if unavailable (wired in Phase 5).

---

## 5. Changelog

- **Phase 1 — Domain Model & Storage Foundation (time-slot-rating)**: added `src/features/rating/` with `TimeSlotRating` type, `RatingRepository` contract, AsyncStorage-backed `ratings.storage.ts` (key `cs-rn:time-slot-ratings:v1`) following the `events.storage` cache+listener pattern, `LocalRatingRepository` implementation with `listPendingSync` / `markSynced` semantics, barrel exports, plus storage and repository Jest suites. Registered the new storage key in `src/platform/storage/async-storage.ts`. No UI, service, or hook layer yet — those arrive in Phases 2–5.
