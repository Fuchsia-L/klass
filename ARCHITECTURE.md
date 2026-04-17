The doc is largely accurate. I'll output the complete updated version with the section labels promoted from "Phases 1–2" to "Phases 1–3" to reflect Phase 3's contribution.

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
- `app/_layout.tsx` — root layout: font loading, `ThemeProvider`, `SafeAreaProvider`, bottom Tabs (`TODAY`, `MATRIX`, `RATING`, `SETTINGS`).
- `app/index.tsx` — Home page: TODAY / TOMORROW event lists, TodoSection footer, FAB for new event.
- `app/index.test.tsx` — smoke test for Home.
- `app/matrix.tsx` — Matrix page: 7-column weekly grid 06:00–24:00, current-time line, week navigation, ISO/semester week label.
- `app/rating.tsx` — Rating page: loads local ratings through `useRatings`, renders `RatingHistoryList`, opens `RatingInputSheet` from the FAB with a default one-hour slot ending now, and shows a read-only detail modal on history-card press.
- `app/rating.test.tsx` — screen tests for empty state/FAB indicator, default slot orchestration, save refresh, AsyncStorage-backed persistence, and read-only detail behavior.
- `app/settings.tsx` — Settings page: theme picker, semester form, WHUT import entry, rating JSON export action, data management buttons.
- `app/settings.test.tsx` — settings tests for WHUT import and rating export action wiring.

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
- `services/rating-export.service.ts` — rating JSON export helper: loads via `ratings.service.exportRatings()`, serializes complete `TimeSlotRating[]` records, uses optional `expo-sharing` + `expo-file-system` when available, and falls back to React Native `Share.share`.
- `services/rating-export.service.test.ts` — export serialization and share-path tests.

### `src/features/rating/` — **NEW (Phases 1–3)**
- `src/features/rating/index.ts` — public barrel exporting rating components (`EfficiencySlider`, `RatingHistoryList`, `RatingInputSheet`, `StarRating`), `useRatings` hook, rating service APIs (`createRating`, `createRatingService`, `exportRatings`, `getRating`, `listPendingSyncRatings`, `listRatings`, `markRatingSynced`, `removeRating`, `subscribeToRatingChanges`, `updateRating`), service input/export types (`RatingInput`, `RatingUpdateInput`, `RatingsExportData`), repository class/singleton (`LocalRatingRepository`, `localRatingRepository`), `RatingRepository` type, and rating domain types.
- `src/features/rating/types.ts` — `RatingValue`, `TimeSlotRating` entity.
- `src/features/rating/components/index.ts` — component barrel.
- `src/features/rating/components/StarRating.tsx` — themed 1–5 star input with active fill, inactive outline, and press scale feedback.
- `src/features/rating/components/EfficiencySlider.tsx` — themed discrete 1–5 custom slider with track, active range, tick marks, thumb, and Orbitron numeric value.
- `src/features/rating/components/RatingInputSheet.tsx` — bottom-sheet rating form with editable slot start/end, rating, efficiency, activity, mood, reflection, save, and cancel.
- `src/features/rating/components/RatingHistoryList.tsx` — grouped history list, date descending, with themed rating cards and random-on-mount empty state.
- `src/features/rating/components/rating-components.test.tsx` — component smoke tests for rating inputs, sheet payload/field caps, grouped history, and empty state stability.
- `src/features/rating/copy/empty-state-quips.ts` — exact 50 empty-state quips plus `pickRandomQuip`.
- `src/features/rating/copy/empty-state-quips.test.ts` — asserts quip count and random picker membership.
- `src/features/rating/hooks/index.ts` — barrel exporting `useRatings`.
- `src/features/rating/hooks/useRatings.ts` — loads ratings via the service, exposes `loading` / `error` state plus `refresh` / `save` (create or update) / `remove` helpers, and subscribes to rating service changes (which forward repository mutations) for auto-refresh.
- `src/features/rating/services/index.ts` — barrel exporting rating service APIs and input/export types.
- `src/features/rating/services/ratings.service.ts` — `createRatingService(repository)` factory plus default singleton bound to `localRatingRepository`. Generates UUID ids (uses `globalThis.crypto.randomUUID` when available), defaults `slot_end` to now and `slot_start` to one hour earlier when omitted, validates rating/efficiency as integers in 1–5, enforces optional field length caps (mood ≤20, activity ≤50, reflection ≤200), refreshes `updated_at` and resets `synced_at` on update, always writes `schema_version: 1`, exposes `exportRatings()` returning JSON-ready payload, and bridges repository listener notifications to subscribers (only emits direct mutation notifications when the repository does not provide its own listener).
- `src/features/rating/services/ratings.service.test.ts` — service tests using a fake `RatingRepository`.
- `src/features/rating/storage/index.ts` — barrel: `LocalRatingRepository`, `localRatingRepository`, `RatingRepository` (type), plus storage functions.
- `src/features/rating/storage/repository.ts` — `RatingRepository` interface contract, including optional listener subscription.
- `src/features/rating/storage/ratings.storage.ts` — AsyncStorage-backed store (key `cs-rn:time-slot-ratings:v1`) with in-memory cache, validation, listener notifications, and timestamp management (`prepareRatingForSave` refreshes `updated_at` on update).
- `src/features/rating/storage/ratings.storage.test.ts` — storage tests (CRUD, listeners, edge cases).
- `src/features/rating/storage/local-repository.ts` — `LocalRatingRepository` class implementing `RatingRepository` (delegates `list`/`get`/`save`/`remove`, computes `listPendingSync` by filtering `synced_at == null`, implements `markSynced` via load+save, and forwards `subscribe` to `subscribeToRatings`) + `localRatingRepository` singleton.
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
- `DateTimePicker` (default export) `({ value, onChange, theme, mode?, minimumHour?, allowMidnight24?, onPickerActive?, testID? })` — Callers: `EventSheet`, `RatingInputSheet`.
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
- `serializeRatingRecords(ratings: readonly TimeSlotRating[]): string` — JSON stringifier for complete rating records. Callers: `rating-export.service.test.ts`, `serializeRatingsExportData`.
- `serializeRatingsExportData(exportData: RatingsExportData): string` — serializes the service export payload's `ratings` records as JSON. Caller: `exportLocalRatingsAsJson`.
- `shareRatingsJson(json, adapters?)` — shares rating JSON through optional Expo Sharing + file cache when available; otherwise falls back to React Native `Share.share({ message: json })`. Callers: `exportLocalRatingsAsJson`, tests.
- `exportLocalRatingsAsJson(adapters?): Promise<{ count; json; method }>` — loads ratings through `ratings.service.exportRatings()`, serializes them, shares them, and returns export metadata. Caller: `app/settings.tsx`.

### Rating — `src/features/rating/` **(established in Phases 1–3)**

Types — `src/features/rating/types.ts`:
- `RatingValue = 1 | 2 | 3 | 4 | 5`.
- `TimeSlotRating` — `{ id; slot_start; slot_end; linked_event_id?; rating: RatingValue; efficiency: RatingValue; mood?; activity?; reflection?; created_at; updated_at; synced_at?: string|null; schema_version: 1 }`.

Repository contract — `src/features/rating/storage/repository.ts`:
- `interface RatingRepository { list(): Promise<TimeSlotRating[]>; get(id: string): Promise<TimeSlotRating | null>; save(rating: TimeSlotRating): Promise<void>; remove(id: string): Promise<void>; listPendingSync(): Promise<TimeSlotRating[]>; markSynced(id: string, syncedAt: string): Promise<void>; subscribe?(listener: () => void): () => void }`. Implementers: `LocalRatingRepository`. Consumer: `ratings.service.ts`.

Service — `src/features/rating/services/ratings.service.ts`:
- `RatingInput` — `{ slot_start?: string; slot_end?: string; linked_event_id?: string; rating: number; efficiency: number; mood?: string; activity?: string; reflection?: string }`.
- `RatingUpdateInput` — `Partial<Omit<RatingInput, 'rating' | 'efficiency'>> & { rating?: number; efficiency?: number }`.
- `RatingsExportData` — `{ exported_at: string; schema_version: 1; ratings: TimeSlotRating[] }` JSON-ready export payload.
- `createRatingService(repository: RatingRepository): RatingsService` — factory used directly by `ratings.service.test.ts` and bound to `localRatingRepository` for the default singleton exports.
- `listRatings(): Promise<TimeSlotRating[]>` — delegates to `repository.list`. Callers: `useRatings`, future rating screens.
- `getRating(id: string): Promise<TimeSlotRating | null>` — delegates to `repository.get`. Callers: future detail screens / tests.
- `createRating(input: RatingInput): Promise<TimeSlotRating>` — generates UUID id, defaults `slot_end = now`, `slot_start = now − 1h` when omitted, validates rating/efficiency (1–5), enforces optional length caps (mood ≤20, activity ≤50, reflection ≤200), stamps `created_at`/`updated_at`, sets `synced_at = null`, writes `schema_version: 1`, persists via `repository.save`, then notifies subscribers (when repository lacks its own listener). Callers: `useRatings.save`.
- `updateRating(id: string, input: RatingUpdateInput): Promise<TimeSlotRating>` — loads existing rating (throws if missing), merges fields, refreshes `updated_at`, resets `synced_at` to null, persists, notifies. Callers: `useRatings.save`.
- `removeRating(id: string): Promise<void>` — delegates to `repository.remove`, notifies. Callers: `useRatings.remove`.
- `listPendingSyncRatings(): Promise<TimeSlotRating[]>` — delegates to `repository.listPendingSync`. Callers: future sync code / tests.
- `markRatingSynced(id: string, syncedAt?: string): Promise<void>` — defaults `syncedAt` to `new Date().toISOString()`, delegates to `repository.markSynced`, notifies. Callers: future sync code / tests.
- `exportRatings(): Promise<RatingsExportData>` — wraps `repository.list()` with `exported_at` + `schema_version: 1`. Callers: `rating-export.service.ts`, tests.
- `subscribeToRatingChanges(listener: () => void): () => void` — registers listener; lazily subscribes to `repository.subscribe` when available so storage-level mutations propagate to UI. Callers: `useRatings`.

Hook — `src/features/rating/hooks/useRatings.ts`:
- `useRatings(): { ratings: TimeSlotRating[]; loading: boolean; error: string | null; refresh: () => Promise<void>; save: (input: RatingInput, id?: string) => Promise<TimeSlotRating>; remove: (id: string) => Promise<void> }` — initial load via `listRatings`, subscribes to `subscribeToRatingChanges` for auto-refresh, mounts/unmount-safe state updates via `isMountedRef`, surfaces errors as strings, and routes `save` to `createRating` or `updateRating` based on optional `id`. Callers: future rating screens/components.

Components — `src/features/rating/components/`:
- `StarRating({ value: RatingValue, onChange?: (v: RatingValue) => void, size?: number, disabled?: boolean, testID?: string })` — themed interactive 1–5 star control with active fill, inactive outline, and press scale feedback. Callers: `RatingInputSheet`, `RatingHistoryList`, future rating screens.
- `EfficiencySlider({ value: RatingValue, onChange?: (v: RatingValue) => void, disabled?: boolean, testID?: string })` — themed discrete 1–5 selector with track, active range, tick marks, thumb, and Orbitron numeric value. Callers: `RatingInputSheet`, future rating screens.
- `RatingInputSheet({ visible: boolean, rating?: TimeSlotRating | null, defaultStart?: Date, defaultEnd?: Date, onSave: (input: RatingInput, id?: string) => Promise<void> | void, onClose: () => void })` — themed bottom sheet with editable slot start/end (via shared `DateTimePicker`), rating, efficiency, activity, mood, reflection inputs (enforces local trims/caps before producing the `RatingInput` payload + optional rating id). Callers: future rating tab / event-completion prompts.
- `RatingHistoryList({ ratings: TimeSlotRating[], onPressItem?: (rating: TimeSlotRating) => void, refreshing?: boolean, onRefresh?: () => void })` — groups records by local date descending into themed cards; renders empty state with a single mount-time quip from `pickRandomQuip`. Callers: future rating tab.

Copy — `src/features/rating/copy/empty-state-quips.ts`:
- `EMPTY_STATE_QUIPS: readonly string[]` — exact 50-item empty-state copy pool (verbatim, Lux voice locked).
- `pickRandomQuip(): string` — returns one member from `EMPTY_STATE_QUIPS`. Callers: `RatingHistoryList`.

Storage — `src/features/rating/storage/ratings.storage.ts`:
- `loadRatingsFromStorage(): Promise<TimeSlotRating[]>` — cached read with schema validation.
- `listRatings(): Promise<TimeSlotRating[]>` — alias used by repository.
- `getRating(id: string): Promise<TimeSlotRating | null>` — cached lookup.
- `saveRating(rating: TimeSlotRating): Promise<void>` — upsert; on update refreshes `updated_at` to `new Date().toISOString()` and preserves original `created_at`; always writes `schema_version: 1`.
- `removeRating(id: string): Promise<void>` — delete by id.
- `subscribeToRatings(listener: () => void): () => void` — fires on every successful mutation.
- `clearRatingsCache(): void` — test/reset hook.
- Callers: `LocalRatingRepository`, `ratings.storage.test.ts`, `local-repository.test.ts`. No UI code reaches these directly per spec — the service layer goes through `RatingRepository`.

Local repository — `src/features/rating/storage/local-repository.ts`:
- `class LocalRatingRepository implements RatingRepository` — wraps storage; `listPendingSync()` filters `synced_at == null`; `markSynced(id, syncedAt)` loads via `getRating`, no-ops if missing, otherwise saves with updated `synced_at`; `subscribe(listener)` delegates to `subscribeToRatings`.
- `localRatingRepository` — default singleton instance for injection (used by `ratings.service.ts`).
- Callers: `local-repository.test.ts`, `ratings.service.ts`.

### Shared — `src/shared/`
- `AppBar({ title, subtitle?, right? })` — Callers: `app/index.tsx`, `app/matrix.tsx`, `app/settings.tsx`.
- `FAB({ onPress })` — draggable floating action button. Callers: `app/index.tsx`, `app/matrix.tsx`.
- `FAB_SIZE`, `FAB_EDGE_MARGIN`, `FAB_BOTTOM_MARGIN`, `FAB_DRAG_ACTIVE_OPACITY`, `FAB_IDLE_OPACITY`, `FAB_DRAG_THRESHOLD`, `FabPosition`, `FabScreenSize`, `FabBounds`, `getFabBounds(screen)`, `clampFabPosition(pos, screen)`, `getDefaultFabPosition(screen)`, `snapFabPosition(pos, screen)`, `hasExceededDragThreshold(dx, dy)` — Callers: `FAB.tsx`, tests.
- `formatTime(date)`, `formatLocalDate(date)`, `formatDate(date)`, `isSameDay(a, b)` — Callers: `EventCard`, `EventSheet`, `RatingInputSheet`, `RatingHistoryList`, `app/matrix.tsx`, `whut-import`, etc.
- `generateId(): string` — Callers: `events.service`, `todo.service`, `whut-import`, (future: rating UI flows that need short ids; service uses UUIDs internally).

### Theme — `src/theme/`
- `ThemeConfig` — Callers: every component that styles via theme; `categoryColors` resolver.
- `DEFAULT_THEME`, `THEME_OPTIONS`, `isThemeName(name)`, `getTheme(name?)`, `getAllThemes()` — Callers: `ThemeContext`, `app/settings.tsx`, `useSettingsForm`.
- `<ThemeProvider>` — Callers: `app/_layout.tsx`.
- `useTheme(): ThemeConfig` — Callers: nearly all UI components, including all rating components.
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

### Rating flow
```
RatingTab / event-completion entry
  → RatingInputSheet (StarRating + EfficiencySlider + DateTimePicker)
      → onSave(input, id?)
  → features/rating/hooks/useRatings.ts
      (refresh / save / remove)
  → features/rating/services/ratings.service.ts
      (validate input, default slot/timestamps, UUID id, schema_version: 1)
  → RatingRepository   (interface, storage-independent)
  → LocalRatingRepository
      → features/rating/storage/ratings.storage.ts
      → platform/storage/async-storage.ts  (key: cs-rn:time-slot-ratings:v1)
      → in-memory cache (cachedRatings) + subscribeToRatings listeners
          → repository.subscribe → subscribeToRatingChanges → useRatings.refresh
              → RatingHistoryList re-render

History card press in `app/rating.tsx`
  → read-only detail modal
  → no edit affordance in v1
```

The repository interface is the seam that keeps service code decoupled from AsyncStorage. A future `RemoteRatingRepository` or `SyncingRatingRepository` can replace `LocalRatingRepository` without touching the service / hook / UI layers. The service-level `subscribeToRatingChanges` lazily attaches to `repository.subscribe` so storage mutations from any source (e.g. background sync) propagate to UI.

### Rating export flow
```
SettingsScreen "导出打分数据"
  → features/settings/services/rating-export.service.ts
      → features/rating/services/ratings.service.ts exportRatings()
      → RatingRepository.list()
      → serialize complete TimeSlotRating[] records as JSON
      → expo-sharing + expo-file-system when installed and available
      → React Native Share.share fallback
```

---

## 4. Dependencies

Runtime:
- `expo`, `expo-constants`, `expo-font`, `expo-linking`, `expo-router`, `expo-status-bar` — Expo SDK 55 runtime + file-based routing + font loading + status bar.
- `react`, `react-native` — core.
- `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-web` — navigation / layout primitives and web fallback.
- `react-native-webview` — CAS login flow inside `WhutImportWebViewContainer`.
- `@react-native-async-storage/async-storage` — persistence backend for events, semester, theme, todos, and ratings.
- `lucide-react-native` — icon set used across tabs, cards, sheets (including `X` close icon in `RatingInputSheet`).

Dev / test:
- `typescript` — static typing.
- `jest`, `jest-expo`, `@testing-library/react-native`, `react-test-renderer`, `@types/jest`, `@types/react` — test harness.

Optional:
- `expo-sharing` + `expo-file-system` — preferred file-based JSON export when installed and available; `rating-export.service.ts` falls back to RN `Share.share` when either module is unavailable.

---

## 5. Changelog

- **Phase 1 — Domain Model & Storage Foundation (time-slot-rating)**: added `src/features/rating/` with `TimeSlotRating` type, `RatingRepository` contract, AsyncStorage-backed `ratings.storage.ts` (key `cs-rn:time-slot-ratings:v1`) following the `events.storage` cache+listener pattern, `LocalRatingRepository` implementation with `listPendingSync` / `markSynced` semantics, barrel exports, plus storage and repository Jest suites. Registered the new storage key in `src/platform/storage/async-storage.ts`. No UI, service, or hook layer yet — those arrive in Phases 2–5.
- **Phase 2 — Rating Service & Hook**: added repository-injected `ratings.service.ts` exposing `createRatingService` factory + default singleton (UUID id generation, default slot window, ISO timestamps, rating/efficiency 1–5 validation, optional field length caps, sync helpers, `exportRatings()` JSON payload, listener bridging via `repository.subscribe`). Added `useRatings` hook (loading/error/refresh/save/remove with mount-safety and auto-refresh on service notifications). Extended `LocalRatingRepository` with a `subscribe` method that forwards storage listeners. Updated `src/features/rating/index.ts` to export the new hook and service surface, and added service tests backed by a fake `RatingRepository`.
- **Phase 3 — Core Rating UI Components**: added `StarRating`, `EfficiencySlider`, `RatingInputSheet` (reuses shared `DateTimePicker` from the schedule feature), and `RatingHistoryList` under `src/features/rating/components`, plus the locked 50-item `EMPTY_STATE_QUIPS` copy pool and `pickRandomQuip` helper under `src/features/rating/copy`. Promoted the rating section heading from "Phases 1–2" to "Phases 1–3" and re-exported the new components from rating barrels. Added component smoke tests and quip contract tests covering input interaction, sheet field caps/payload shape, grouped-by-date history rendering, mount-stable empty-state quip, quip count, and picker membership.
- **Phase 4 — Rating Tab Integration**: added `app/rating.tsx` and wired it into Expo Router tabs between `MATRIX` and `SETTINGS` using the lucide `Star` icon and existing tab style options. The rating screen uses `useRatings` + `RatingHistoryList`, opens `RatingInputSheet` from the shared FAB with a current-time-minus-one-hour default slot, saves through the hook so history updates immediately, reads persisted AsyncStorage ratings on mount, and opens a read-only detail modal from history cards. Added layout and rating screen tests for tab order/icon, empty state, default slot orchestration, save refresh, persistence reload, and read-only details.
- **Phase 5 — JSON Export from Settings**: replaced the placeholder settings export action with `导出打分数据`, backed by `src/features/settings/services/rating-export.service.ts`. The helper loads records through `ratings.service.exportRatings()` rather than storage, serializes complete `TimeSlotRating[]` records including rating/efficiency/timestamps/schema/sync fields, prefers optional Expo Sharing + file cache when available, and falls back to React Native `Share.share`. Added settings action tests plus helper tests for empty arrays, optional fields/emoji/long strings, service-backed loading, Expo Sharing, and fallback sharing.
