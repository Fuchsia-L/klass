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
- `app/_layout.tsx` — root layout: font loading, `SafeAreaProvider`, `ThemeProvider`, `RatingServiceProvider` (wires rating service through `SyncingRatingRepository` + shared `SyncScheduler` singleton, starts the scheduler on boot when a sync token exists, and pulls on `AppState` active transitions), bottom Tabs (`TODAY`, `MATRIX`, `RATING`, `SETTINGS`).
- `app/_layout.test.tsx` — layout tests: tab order/icons, plus RatingServiceProvider boot wiring (token-present calls `scheduler.start()` once and transitions `unconfigured` → `idle`).
- `app/index.tsx` — Home page: TODAY / TOMORROW event lists, TodoSection footer, FAB for new event.
- `app/index.test.tsx` — smoke test for Home.
- `app/matrix.tsx` — Matrix page: 7-column weekly grid 06:00–24:00, current-time line, week navigation, ISO/semester week label.
- `app/rating.tsx` — Rating page: loads local ratings through `useRatings`, renders `RatingHistoryList`, opens `RatingInputSheet` from the FAB with a default one-hour slot ending now, and shows a read-only detail modal on history-card press with a bottom-of-modal destructive 删除 button that triggers a two-step `Alert.alert` confirm and routes through `useRatings.remove` on confirm.
- `app/rating.test.tsx` — screen tests for empty state/FAB indicator, default slot orchestration, save refresh, AsyncStorage-backed persistence, read-only detail behavior, and the detail-modal delete flow (button render, Alert copy/destructive style, cancel preserves record, confirm removes + closes + refreshes).
- `app/settings.tsx` — Settings page: theme picker, semester form, WHUT import entry, 云端同步 section (secure token input, save button persisting via `saveSyncToken` + starting the scheduler + pulling, status row subscribed to scheduler with 30s relative-time refresh, 立即同步 debug button), rating JSON export action, data management buttons.
- `app/settings.test.tsx` — settings tests for WHUT import, rating export wiring, and the cloud-sync section (token persistence + scheduler start/pullNow, empty-token AsyncStorage removal, 立即同步 debug button, status copy for unconfigured/syncing/idle/error, 30s relative-time refresh with fake timers).

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

### `src/features/rating/` — **NEW (Phases 1–5 + cloud-sync Phases 1–6)**
- `src/features/rating/index.ts` — public barrel exporting rating components (`EfficiencySlider`, `RatingHistoryList`, `RatingInputSheet`, `StarRating`), `useRatings` hook, rating service APIs (`configureRatingsService`, `createRating`, `createRatingService`, `exportRatings`, `getRating`, `getRatingsService`, `listPendingSyncRatings`, `listRatings`, `markRatingSynced`, `removeRating`, `subscribeToRatingChanges`, `updateRating`), service input/export types (`RatingInput`, `RatingUpdateInput`, `RatingsExportData`, `RatingsService`), repository class/singleton (`LocalRatingRepository`, `localRatingRepository`), `RatingRepository` type, the `RatingServiceProvider` component + `useRatingService` hook + `RatingServiceContextValue` type, rating domain types, and the cloud-sync surface (`CloudRatingApiClient`, `DEFAULT_CLOUD_RATING_BASE_URL`, `DEFAULT_CLOUD_RATING_TIMEOUT_MS`, `SYNC_TOKEN_STORAGE_KEY`, `SyncError`, `SyncStateEmitter`, `SyncingRatingRepository`, `SyncScheduler`, `clearSyncToken`, `getConfiguredSyncScheduler`, `getSyncScheduler`, `loadSyncToken`, `resetSyncSchedulerForTests`, `saveSyncToken`, plus `CloudRatingApiClientOptions`, `CloudRatingListResponse`, `CloudRatingRecord`, `CloudRatingSyncErrorEntry`, `CloudRatingSyncRequest`, `CloudRatingSyncResponse`, `FetchLike`, `SyncApiClient`, `SyncErrorOptions`, `SyncSchedulerContract`, `SyncSchedulerOptions`, `SyncSchedulerStatus`, `SyncSchedulerStatusListener`, `SyncStatus`, `SyncStatusListener`, `TokenProvider` types).
- `src/features/rating/RatingServiceProvider.tsx` — app-level React context that synchronously constructs the shared `SyncScheduler` singleton (via `getSyncScheduler({ repository: localRatingRepository, apiClient: new CloudRatingApiClient({ getToken: loadSyncToken }), initialStatus: { kind: 'unconfigured' } })`), wraps `localRatingRepository` in `SyncingRatingRepository`, builds a fresh `RatingsService` via `createRatingService`, and calls `configureRatingsService` to swap the module-level singleton so existing `createRating` / `removeRating` / etc. exports route every mutation through the scheduler-notifying wrapper. On mount the effect reads `cs-rn:sync-token` from AsyncStorage and calls `scheduler.start()` when a non-empty token is found (leaving the status as `unconfigured` otherwise), subscribes to `AppState.addEventListener('change', …)` and calls `scheduler.pullNow()` on transitions to `active`, and removes the AppState subscription on unmount. Exports `RatingServiceProvider`, `useRatingService` (throws when used outside the provider), and the `RatingServiceContextValue` type.
- `src/features/rating/RatingServiceProvider.test.tsx` — provider tests covering save-through-service → `scheduler.notifyLocalChange` fan-out, boot-with-token start-once + boot-without-token unconfigured status, AppState active-only `pullNow` wiring, AppState listener cleanup on unmount, `getToken` per-request AsyncStorage freshness, and `useRatingService` context exposure of the service + scheduler.
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
- `src/features/rating/services/ratings.service.ts` — `createRatingService(repository)` factory plus a mutable module-level singleton initialized to `createRatingService(localRatingRepository)`. Exports forwarder functions (`listRatings`, `createRating`, `removeRating`, …) that delegate to the current singleton so `RatingServiceProvider.configureRatingsService(service)` can swap in a `SyncingRatingRepository`-backed service at app boot without refactoring consumers. `getRatingsService()` returns the current singleton. Generates UUID ids (uses `globalThis.crypto.randomUUID` when available), defaults `slot_end` to now and `slot_start` to one hour earlier when omitted, validates rating/efficiency as integers in 1–5, enforces optional field length caps (mood ≤20, activity ≤50, reflection ≤200), refreshes `updated_at` and resets `synced_at` on update, always writes `schema_version: 1`, exposes `exportRatings()` returning JSON-ready payload, and bridges repository listener notifications to subscribers (only emits direct mutation notifications when the repository does not provide its own listener).
- `src/features/rating/services/ratings.service.test.ts` — service tests using a fake `RatingRepository`.
- `src/features/rating/storage/index.ts` — barrel: `LocalRatingRepository`, `localRatingRepository`, `RatingRepository` (type), plus storage functions.
- `src/features/rating/storage/repository.ts` — `RatingRepository` interface contract, including optional listener subscription.
- `src/features/rating/storage/ratings.storage.ts` — AsyncStorage-backed store (key `cs-rn:time-slot-ratings:v1`) with in-memory cache, validation, listener notifications, and timestamp management (`prepareRatingForSave` refreshes `updated_at` on update).
- `src/features/rating/storage/ratings.storage.test.ts` — storage tests (CRUD, listeners, edge cases).
- `src/features/rating/storage/local-repository.ts` — `LocalRatingRepository` class implementing `RatingRepository` (filters tombstones from `list`/`get`, soft-deletes via `remove` by writing a tombstone with `deleted_at`/`updated_at = now` and `synced_at = null` while preserving rating/efficiency/mood/etc., no-ops `remove` on missing or already-tombstoned records, computes `listPendingSync` by filtering `synced_at == null` (tombstones included), implements `markSynced` via load+save, and forwards `subscribe` to `subscribeToRatings`) + `localRatingRepository` singleton.
- `src/features/rating/storage/local-repository.test.ts` — repository tests (`listPendingSync`, `markSynced`, tombstone soft-delete semantics, ms-precision timestamps).

#### `src/features/rating/sync/`
- `src/features/rating/sync/index.ts` — barrel re-exporting `SyncStateEmitter`, `SyncStatus`, `SyncStatusListener`, `CloudRatingApiClient`, `DEFAULT_CLOUD_RATING_BASE_URL`, `DEFAULT_CLOUD_RATING_TIMEOUT_MS`, `SyncError`, `SyncingRatingRepository`, the Phase 3 scheduler contract (as `SyncSchedulerContract`), the concrete `SyncScheduler` class, `getSyncScheduler` / `resetSyncSchedulerForTests`, the `SyncApiClient` / `SyncSchedulerOptions` / `SyncSchedulerStatus` / `SyncSchedulerStatusListener` types (plus existing request/response/option types), and the cloud-sync Phase 5 wiring surface (`SYNC_TOKEN_STORAGE_KEY`, `getConfiguredSyncScheduler`, `loadSyncToken`, `saveSyncToken`, `clearSyncToken`).
- `src/features/rating/sync/sync-state.ts` — `SyncStatus` union (`'idle' | 'syncing' | 'error' | 'unconfigured'`), `SyncStatusListener` type, and `SyncStateEmitter` class (`getStatus` / `setStatus` / `subscribe`; no-op on unchanged status).
- `src/features/rating/sync/sync-state.test.ts` — emitter tests for defaults, initial status override, notify-on-change, no-notify-on-same, and unsubscribe.
- `src/features/rating/sync/api-client.ts` — `CloudRatingApiClient` wrapping `fetch` for `POST /v1/ratings/sync` and `GET /v1/ratings?since=`. Fetches the token per request, scrubs `expected_updated_at` from outgoing records, enforces a 10s AbortController timeout, maps non-2xx to `SyncError(statusCode)`, surfaces `isTimeout` / `isMissingToken` flags, and accepts an injectable `baseUrl` / `timeoutMs` / `fetchImpl`.
- `src/features/rating/sync/api-client.test.ts` — client tests covering URL/method/headers/body, injected baseUrl, per-request token freshness, `expected_updated_at` scrubbing, partial-success errors[] pass-through, missing/empty-string token handling, 401/500 status mapping, and timeout behavior with fake timers.
- `src/features/rating/sync/syncing-repository.ts` — `SyncScheduler` interface (`notifyLocalChange(): void`) and `SyncingRatingRepository` class that wraps an injected local `RatingRepository`: `save` / `remove` forward to local then call `scheduler.notifyLocalChange()` exactly once, `list` / `get` / `listPendingSync` / `markSynced` pass through unchanged, and `subscribe` forwards to `local.subscribe` when available or returns a no-op teardown otherwise. No direct network calls — sync orchestration is entirely scheduler-driven (Phase 4).
- `src/features/rating/sync/syncing-repository.test.ts` — repository wrapper tests covering save/remove call order, single scheduler notification per write, pass-through semantics for read/markSynced, null return for tombstoned `get`, absence of fetch calls, and subscribe delegation with/without `local.subscribe`.
- `src/features/rating/sync/sync-scheduler.ts` — `SyncApiClient` structural interface (satisfied by `CloudRatingApiClient`), `SyncSchedulerStatus` discriminated union, and `SyncScheduler` class implementing the Phase 3 scheduler contract. Provides `start` / `stop` / `notifyLocalChange` (5s debounce) / `pullNow` (immediate) / `getStatus` / `onStatusChange`, LWW-merges pulled records into the injected repository, marks pushed records synced via `server_time`, and retries network / timeout / 5xx failures at `5s, 30s, 2m, 5m, 5m…` capped at 5 minutes with unlimited attempts (401/403/missing-token emit `token 无效` with no retry). Exposes `getSyncScheduler(options?)` singleton and `resetSyncSchedulerForTests()`.
- `src/features/rating/sync/sync-scheduler.test.ts` — scheduler tests covering singleton identity, start/stop idempotency + timer cleanup, 5s debounce collapsing, `pullNow` bypass, successful doSync status emission + `markSynced(server_time)` fan-out, LWW merge (skip older remote / accept newer / upsert tombstone hidden by `list`), backoff schedule `5s, 30s, 2m, 5m, 5m`, 401 no-retry, `notifyLocalChange` during backoff canceling the retry and restarting the 5s debounce, countdown-formatted error messages, partial `errors[]` logging without backoff, and `onStatusChange` subscribe/unsubscribe.
- `src/features/rating/sync/wiring.ts` — cloud-sync Phase 5 wiring: `SYNC_TOKEN_STORAGE_KEY = 'cs-rn:sync-token'`, `loadSyncToken` / `saveSyncToken` / `clearSyncToken` AsyncStorage helpers (empty/whitespace token routes through `clearSyncToken`), and `getConfiguredSyncScheduler()` that lazily calls `getSyncScheduler({ repository: localRatingRepository, apiClient: new CloudRatingApiClient({ getToken: loadSyncToken }) })` for the shared singleton.

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

### Rating — `src/features/rating/` **(established in Phases 1–5 + cloud-sync Phases 1–6)**

Types — `src/features/rating/types.ts`:
- `RatingValue = 1 | 2 | 3 | 4 | 5`.
- `TimeSlotRating` — `{ id; slot_start; slot_end; linked_event_id?; rating: RatingValue; efficiency: RatingValue; mood?; activity?; reflection?; created_at; updated_at; synced_at?: string|null; deleted_at?: string|null; schema_version: 1 }`. `deleted_at != null` marks the record as a tombstone (soft delete); all timestamps are millisecond-precision ISO (`new Date().toISOString()`).

Repository contract — `src/features/rating/storage/repository.ts`:
- `interface RatingRepository { list(): Promise<TimeSlotRating[]>; listAll(): Promise<TimeSlotRating[]>; get(id: string): Promise<TimeSlotRating | null>; save(rating: TimeSlotRating): Promise<void>; remove(id: string): Promise<void>; listPendingSync(): Promise<TimeSlotRating[]>; markSynced(id: string, syncedAt: string): Promise<void>; subscribe?(listener: () => void): () => void }`. `list()` / `get()` hide tombstones for UI consumers; `listAll()` returns every record including tombstones and is consumed by sync code (cursor computation + LWW merge). Implementers: `LocalRatingRepository`, `SyncingRatingRepository`. Consumer: `ratings.service.ts`, `SyncScheduler`.

Service — `src/features/rating/services/ratings.service.ts`:
- `RatingInput` — `{ slot_start?: string; slot_end?: string; linked_event_id?: string; rating: number; efficiency: number; mood?: string; activity?: string; reflection?: string }`.
- `RatingUpdateInput` — `Partial<Omit<RatingInput, 'rating' | 'efficiency'>> & { rating?: number; efficiency?: number }`.
- `RatingsExportData` — `{ exported_at: string; schema_version: 1; ratings: TimeSlotRating[] }` JSON-ready export payload.
- `RatingsService` — `{ listRatings; getRating; createRating; updateRating; removeRating; listPendingSyncRatings; markRatingSynced; exportRatings; subscribeToRatingChanges }` object type returned by `createRatingService`. Exposed so `RatingServiceProvider` can type the context value.
- `createRatingService(repository: RatingRepository): RatingsService` — factory used directly by `ratings.service.test.ts`, by `RatingServiceProvider` (with a `SyncingRatingRepository`), and bound to `localRatingRepository` for the default module-level singleton.
- `configureRatingsService(service: RatingsService): void` — swaps the module-level `ratingsService` holder so the exported forwarders (`createRating`, `removeRating`, etc.) route through the new service. Called by `RatingServiceProvider` during first render to install the `SyncingRatingRepository`-backed service. Callers: `RatingServiceProvider`.
- `getRatingsService(): RatingsService` — returns the currently installed service. Callers: `RatingServiceProvider` tests asserting the context value matches the module singleton.
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
- `class LocalRatingRepository implements RatingRepository` — wraps storage; `list()` and `get(id)` filter out records with `deleted_at != null`; `listAll()` returns every record straight from storage including tombstones (used by sync to compute the `since` cursor and to LWW-merge without accidentally overwriting a newer local delete); `remove(id)` is a soft delete that loads the raw record, no-ops if it is missing or already tombstoned, otherwise calls `saveRating` with `deleted_at`/`updated_at = new Date().toISOString()` and `synced_at = null` while preserving every other field; `listPendingSync()` filters `synced_at == null` over all records (tombstones included so deletes propagate to sync); `markSynced(id, syncedAt)` loads via `getRating`, no-ops if missing, otherwise saves with updated `synced_at`; `subscribe(listener)` delegates to `subscribeToRatings`.
- `localRatingRepository` — default singleton instance for injection (used by `ratings.service.ts`).
- Callers: `local-repository.test.ts`, `ratings.service.ts`.

Sync — `src/features/rating/sync/` **(cloud-sync Phases 2–6)**:
- `SyncStatus` — `'idle' | 'syncing' | 'error' | 'unconfigured'`. Used by future scheduler + UI indicators.
- `SyncStatusListener` — `(status: SyncStatus) => void`.
- `class SyncStateEmitter` — `constructor(initialStatus?: SyncStatus = 'idle')`, `getStatus(): SyncStatus`, `setStatus(next: SyncStatus): void` (no-op if unchanged; otherwise notifies subscribers), `subscribe(listener): () => void`. Callers: future scheduler (Phase 4) + UI status consumers.
- `SyncError` (extends `Error`) — `{ name: 'SyncError'; statusCode?: number; isTimeout: boolean; isMissingToken: boolean; body?: unknown; cause?: unknown }`. Constructed with `SyncErrorOptions`.
- `SyncErrorOptions` — `{ statusCode?: number; isTimeout?: boolean; isMissingToken?: boolean; body?: unknown; cause?: unknown }`.
- `CloudRatingRecord` — `TimeSlotRating & { expected_updated_at?: string }`. Client-side hint for optimistic-concurrency that is scrubbed before the wire send.
- `CloudRatingSyncRequest` — `{ records: readonly CloudRatingRecord[]; since?: string | null }`.
- `CloudRatingSyncErrorEntry` — `{ id?: string; error?: string; [key: string]: unknown }` partial-success entry.
- `CloudRatingSyncResponse` — `{ records?: TimeSlotRating[]; errors?: CloudRatingSyncErrorEntry[]; server_time?: string; [key: string]: unknown }`. `records` carries server-accepted rows that the scheduler will `markSynced(id, server_time)`.
- `CloudRatingListResponse` — `{ records?: TimeSlotRating[]; server_time?: string; [key: string]: unknown }`.
- `TokenProvider` — `() => string | null | undefined | Promise<string | null | undefined>`. Called per request; empty-string and nullish values produce `SyncError(isMissingToken: true)` without hitting the network.
- `FetchLike` — minimal fetch shape (`string`, `{ method?, headers?, body?, signal? }` → `Promise<{ ok; status; json(); text?() }>`). Injectable seam for tests.
- `CloudRatingApiClientOptions` — `{ getToken: TokenProvider; baseUrl?: string; timeoutMs?: number; fetchImpl?: FetchLike }`.
- `class CloudRatingApiClient` — `constructor(options: CloudRatingApiClientOptions)` (requires `getToken` + `fetchImpl` or `globalThis.fetch`); `sync({ records, since? }): Promise<CloudRatingSyncResponse>` (POST `/v1/ratings/sync`, scrubs `expected_updated_at`); `list(since: string): Promise<CloudRatingListResponse>` (GET `/v1/ratings?since=<encoded>`). Both attach `Authorization: Bearer <token>`, enforce a 10s AbortController timeout, and map non-2xx to `SyncError(statusCode)`. Callers: future scheduler (Phase 4).
- `DEFAULT_CLOUD_RATING_BASE_URL` — `'https://api.epoch0.org'` (trailing slashes stripped).
- `DEFAULT_CLOUD_RATING_TIMEOUT_MS` — `10_000`.
- `interface SyncScheduler { notifyLocalChange(): void }` — minimal seam the syncing repository depends on. Re-exported as `SyncSchedulerContract` from `src/features/rating/sync/index.ts` and `src/features/rating/index.ts` so the concrete `SyncScheduler` class can also carry that export name.
- `class SyncingRatingRepository implements RatingRepository` — `constructor(local: RatingRepository, scheduler: SyncScheduler)`. `save(rating)` and `remove(id)` delegate to `local` first, then call `scheduler.notifyLocalChange()` exactly once. `list` / `listAll` / `get` / `listPendingSync` / `markSynced` pass through untouched. `subscribe` forwards to `local.subscribe` if present, otherwise returns a no-op teardown. No network calls inside the wrapper; all sync work is scheduler-driven. Callers: future app wiring (Phase 5+).
- `interface SyncApiClient` — structural contract `{ sync(request): Promise<CloudRatingSyncResponse>; list(since): Promise<CloudRatingListResponse> }` consumed by the scheduler. `CloudRatingApiClient` satisfies this shape.
- `SyncSchedulerStatus` — discriminated union `{ kind: 'idle'; lastSyncAt: string | null } | { kind: 'syncing'; lastSyncAt: string | null } | { kind: 'error'; message: string; lastSyncAt: string | null } | { kind: 'unconfigured' }`. Emitted by the scheduler's `getStatus` / `onStatusChange`.
- `SyncSchedulerStatusListener` — `(status: SyncSchedulerStatus) => void`.
- `SyncSchedulerOptions` — `{ repository: RatingRepository; apiClient: SyncApiClient; initialStatus?: SyncSchedulerStatus }`. `repository` must be the **unwrapped local** repository (e.g. `localRatingRepository`); wiring a `SyncingRatingRepository` here would turn the scheduler's own merge-phase writes into `notifyLocalChange()` calls and loop on every pull.
- `class SyncScheduler implements SyncSchedulerContract` — `constructor(options: SyncSchedulerOptions)`. `start(): void` (no-op when already started; transitions the status from `unconfigured` to `idle { lastSyncAt: null }` so boot-time wiring with an attached token reports an honest state without having to trigger a sync; still kicks off a `runSync` when the prior status was the `token 无效` error so that a fresh token recovers automatically), `stop(): void` (clears debounce + retry timers, resets retry counter), `notifyLocalChange(): void` (5s debounce; rapid calls collapse; during backoff it cancels the retry and restarts the 5s debounce), `pullNow(): Promise<void>` (fires doSync immediately, bypasses debounce), `getStatus(): SyncSchedulerStatus`, `onStatusChange(listener): () => void`. Internal `doSync`: emits `syncing`, collects `listPendingSync`, computes `since` as max local `updated_at`, calls `api.sync`, LWW-merges returned records by `updated_at`, calls `markSynced(id, server_time)` for every pushed record whose id is not in `response.errors[]`, emits `idle { lastSyncAt: server_time }` on success. Retries on network / timeout / 5xx at `5s, 30s, 2m, 5m, 5m…` capped at 5 minutes, unlimited attempts; 401/403/missing-token sets `error { message: 'token 无效' }` with no retry. Error messages carry retry countdowns (`网络异常 · {n}s 后重试`, `服务端异常 · {n}s 后重试`, `超时 · {n}s 后重试`). Per-record `errors[]` are logged via `console.warn` and do not trigger backoff.
- `getSyncScheduler(options?: SyncSchedulerOptions): SyncScheduler` — returns the singleton instance; the first call must supply options, later calls ignore them. `resetSyncSchedulerForTests(): void` disposes the singleton (intended for tests only). Callers: `RatingServiceProvider` (first-call initializer with `initialStatus: { kind: 'unconfigured' }`), `getConfiguredSyncScheduler`, `app/settings.tsx`.
- `SYNC_TOKEN_STORAGE_KEY` — `'cs-rn:sync-token'` AsyncStorage key used by the Settings cloud-sync section and the wiring module.
- `loadSyncToken(): Promise<string | null>` — reads `SYNC_TOKEN_STORAGE_KEY` from AsyncStorage; swallows read errors and returns `null`. Callers: `CloudRatingApiClient` token provider (via `getConfiguredSyncScheduler`).
- `saveSyncToken(token: string): Promise<void>` — trims the argument; when the trimmed value is empty, delegates to `clearSyncToken`; otherwise writes the trimmed token to AsyncStorage. Callers: `app/settings.tsx` cloud-sync save button.
- `clearSyncToken(): Promise<void>` — removes `SYNC_TOKEN_STORAGE_KEY` from AsyncStorage. Callers: `saveSyncToken` when given an empty/whitespace token.
- `getConfiguredSyncScheduler(): SyncScheduler` — lazily returns `getSyncScheduler({ repository: localRatingRepository, apiClient: new CloudRatingApiClient({ getToken: loadSyncToken }) })`; idempotent. Because `getSyncScheduler` is a singleton whose options are honored only on first construction, `RatingServiceProvider` owns the first initialization (using `initialStatus: { kind: 'unconfigured' }`); subsequent `getConfiguredSyncScheduler()` calls from `app/settings.tsx` return that same instance. Callers: `app/settings.tsx` for `start` / `pullNow` / `notifyLocalChange` / `getStatus` / `onStatusChange`.

Rating service provider — `src/features/rating/RatingServiceProvider.tsx`:
- `<RatingServiceProvider>{children}</RatingServiceProvider>` — mounted once in `app/_layout.tsx` inside `ThemeProvider`. Synchronously (on first render) builds `apiClient = new CloudRatingApiClient({ getToken: loadSyncToken })`, `scheduler = getSyncScheduler({ repository: localRatingRepository, apiClient, initialStatus: { kind: 'unconfigured' } })`, `syncingRepo = new SyncingRatingRepository(localRatingRepository, scheduler)`, `service = createRatingService(syncingRepo)`, and calls `configureRatingsService(service)` so the module-level `ratings.service.ts` exports route every mutation through the wrapper. On mount the effect reads `cs-rn:sync-token` from AsyncStorage once and calls `scheduler.start()` when a non-empty token is present; no token leaves the status as `unconfigured` and skips `start()`. The same effect subscribes to `AppState.addEventListener('change', …)` and calls `scheduler.pullNow()` only on transitions to `active`; the subscription is removed on unmount so the app doesn't leak AppState listeners in hot reload / test remount scenarios.
- `useRatingService(): RatingServiceContextValue` — returns `{ service, scheduler }`. Throws `'useRatingService must be used inside a RatingServiceProvider'` when called outside the tree. Intended for any future code that needs to reach the wrapped service or the scheduler directly (for example, an offline indicator). `useRatings` intentionally keeps its existing singleton-import shape — the provider's `configureRatingsService` swap is sufficient to route it through `SyncingRatingRepository`.
- `RatingServiceContextValue` — `{ service: RatingsService; scheduler: SyncScheduler }`.

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
  → features/rating/services/ratings.service.ts        (module-level singleton
      swapped at boot by RatingServiceProvider)
      (validate input, default slot/timestamps, UUID id, schema_version: 1)
  → RatingRepository   (interface, storage-independent)
  → SyncingRatingRepository (installed by RatingServiceProvider)
      → save/remove → localRatingRepository.save/remove
                   → scheduler.notifyLocalChange()   (5s debounced push)
      → list/get/listPendingSync/markSynced → pass through
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

The repository interface is the seam that keeps service code decoupled from AsyncStorage. `RatingServiceProvider` composes `SyncingRatingRepository` over `LocalRatingRepository` at app boot so every write auto-notifies the `SyncScheduler` singleton without the service / hook / UI layers having to know about sync. The service-level `subscribeToRatingChanges` lazily attaches to `repository.subscribe` so storage mutations from any source (local writes, scheduler pull merges) propagate to UI.

### Rating lifecycle flow (Cloud-sync Phase 6)
```
app/_layout.tsx  →  <RatingServiceProvider>
  useMemo (first render):
    apiClient = new CloudRatingApiClient({ getToken: loadSyncToken })
    scheduler = getSyncScheduler({
      repository: localRatingRepository,
      apiClient,
      initialStatus: { kind: 'unconfigured' },
    })
    syncingRepo = new SyncingRatingRepository(localRatingRepository, scheduler)
    service = createRatingService(syncingRepo)
    configureRatingsService(service)        // module-level exports now route
                                           // through the wrapper

  useEffect (on mount):
    loadSyncToken() → token ? scheduler.start() : (leave as unconfigured)
    AppState.addEventListener('change', nextState =>
      nextState === 'active' && scheduler.pullNow()
    )
    cleanup → subscription.remove()
```

### Cloud sync module overview

The cloud sync module lives entirely under `src/features/rating/sync/` plus the `RatingServiceProvider`. It is a single-user, LWW (last-write-wins) sync layer that keeps the local AsyncStorage-backed rating set in step with `https://api.epoch0.org`. It is intentionally:

- **Layered**: UI / hook / service never touch `fetch` or `AsyncStorage` sync state. All network work is owned by `SyncScheduler`, and all I/O is injected through `RatingRepository` + `SyncApiClient` seams.
- **Token-fetched per request**: `CloudRatingApiClient` calls `getToken()` on every request; editing the token in Settings takes effect on the very next sync without rebuilding the scheduler or client.
- **Tombstone-based soft delete**: `LocalRatingRepository.remove(id)` writes a tombstone (`deleted_at`/`updated_at = now`, `synced_at = null`) instead of physically deleting. `list()` / `get()` hide tombstones from the UI, while `listAll()` and `listPendingSync()` expose them to the sync layer so deletes propagate up and newer local deletes are not clobbered by older remote rows during LWW merges.
- **Debounced push + scheduler-triggered pull**: Writes fan out through `SyncingRatingRepository`, which fires `scheduler.notifyLocalChange()` exactly once per write. The scheduler debounces `doSync` by 5 s; `pullNow()` on `AppState` `active` and the Settings `立即同步` debug button bypass the debounce.
- **Always default LWW, never optimistic concurrency**: Outgoing records are scrubbed of any `expected_updated_at` hint before the wire send, and the server is trusted to resolve conflicts by `updated_at`.

Module layout:

| Concern | Symbol / file |
|---|---|
| Status emitter (unused by scheduler; kept for standalone consumers) | `SyncStateEmitter`, `SyncStatus` — `sync/sync-state.ts` |
| Typed error | `SyncError` (`statusCode`, `isTimeout`, `isMissingToken`, `body`, `cause`) — `sync/api-client.ts` |
| HTTP client | `CloudRatingApiClient.sync` / `.list` — `sync/api-client.ts` |
| Repository wrapper (write fan-out) | `SyncingRatingRepository` — `sync/syncing-repository.ts` |
| Scheduler (debounce + retry + merge) | `SyncScheduler`, `getSyncScheduler`, `resetSyncSchedulerForTests` — `sync/sync-scheduler.ts` |
| AsyncStorage token + singleton builder | `SYNC_TOKEN_STORAGE_KEY`, `loadSyncToken`, `saveSyncToken`, `clearSyncToken`, `getConfiguredSyncScheduler` — `sync/wiring.ts` |
| App lifecycle wiring | `RatingServiceProvider`, `useRatingService` — `RatingServiceProvider.tsx` |
| Settings UI (token input, status row, debug button) | `app/settings.tsx` 云端同步 section |
| Detail-modal delete | `app/rating.tsx` detail modal destructive `删除` |

### Cloud sync — write path (local mutation → cloud)

```
UI (RatingInputSheet / detail-modal 删除)
  → useRatings.save | useRatings.remove
  → ratings.service.ts forwarder (module-level singleton swapped at boot)
  → SyncingRatingRepository.save | .remove
      → LocalRatingRepository.save | .remove
          (soft delete → tombstone with deleted_at/updated_at = now,
           synced_at = null)
        → ratings.storage → AsyncStorage (cs-rn:time-slot-ratings:v1)
        → subscribeToRatings listeners → useRatings.refresh → history re-render
      → scheduler.notifyLocalChange()         (exactly once)
          → debounce 5s (collapses burst writes)
          → doSync():
              emit { kind: 'syncing', lastSyncAt }
              pending = localRepo.listPendingSync()     // tombstones included
              since   = max(localRepo.listAll().updated_at) ?? null
              resp    = api.sync({ records: pending, since })
                        POST /v1/ratings/sync
                        Authorization: Bearer <loadSyncToken()>
                        (expected_updated_at scrubbed; 10s AbortController timeout)
              LWW-merge resp.records into localRepo (save when remote updated_at
                 is strictly newer than local, or record is missing locally;
                 tombstones upsert and are auto-hidden by list())
              for each accepted pushed record:
                 localRepo.markSynced(id, resp.server_time)
              log resp.errors[] via console.warn (no backoff)
              emit { kind: 'idle', lastSyncAt: resp.server_time }
```

### Cloud sync — pull path (cloud → local)

```
AppState 'change' → next === 'active'
  → scheduler.pullNow()                       (bypasses 5s debounce)
  → doSync()                                  (same body as write path)
      emit { kind: 'syncing', lastSyncAt }
      // note: there may still be pending records; doSync always does a
      //       sync({ records, since }) round trip rather than a bare GET.
      //       The shared body is intentional — one request reconciles push + pull.
      ... (same as write path) ...
      emit { kind: 'idle', lastSyncAt: resp.server_time }

Manual entry points:
  Settings → "立即同步" button
    → scheduler.notifyLocalChange() + scheduler.pullNow()
  Settings → "保存 token" button
    → saveSyncToken(trimmedInput) → scheduler.start() → scheduler.pullNow()
```

### Cloud sync — error / retry table

Trigger is the classification of the `SyncError` (or generic `Error`) thrown from `api.sync` / `api.list`. Backoff schedule is fixed per attempt index and caps at 5 minutes with unlimited attempts. A `notifyLocalChange()` during backoff cancels the pending retry and restarts the 5 s debounce instead. All error-state emissions carry the last successful `lastSyncAt` so the UI can still render relative time.

| Trigger | Example | Emitted status | Auto-retry schedule | User-visible copy |
|---|---|---|---|---|
| Network error / offline | `fetch` rejects, DNS fail, server unreachable | `{ kind: 'error', message }` | 5 s → 30 s → 2 min → 5 min → 5 min … (capped, unlimited) | `网络异常 · {n}s 后重试` |
| Server 5xx | VPS returns 500/502/503/504 | `{ kind: 'error', message }` | 5 s → 30 s → 2 min → 5 min → 5 min … | `服务端异常 · {n}s 后重试` |
| Request timeout | 10 s AbortController fires | `{ kind: 'error', message }` | 5 s → 30 s → 2 min → 5 min → 5 min … | `超时 · {n}s 后重试` |
| Missing / empty token | `getToken()` returns `null` / `''` | `{ kind: 'error', message }` | **No retry** — waits for `start()` / `notifyLocalChange()` after a token is saved | `token 无效` |
| 401 / 403 | Wrong or revoked token | `{ kind: 'error', message }` | **No retry** — same as missing token | `token 无效` |
| Partial record `errors[]` | `response.errors` lists per-record failures | Scheduler stays `idle` after the batch; offending records are still `console.warn`’d | No retry triggered by per-record errors | Not surfaced in UI — the batch as a whole is considered successful |
| Success | 2xx with `records` + `server_time` | `{ kind: 'idle', lastSyncAt: server_time }` | — | `已同步 · {relative-time}` / `刚刚同步` |

Status lifecycle:

```
unconfigured ──(token saved → start())──▶ idle (lastSyncAt: null)
     │                                        │
     │                                        ▼
     │                                   syncing
     │                                        │
     │                            ┌───────────┼───────────┐
     │                            ▼           ▼           ▼
     │                          idle        error      error (token 无效)
     │                            │           │           │
     │                            │           │           │
     │                            │    ┌──────┘           │
     │                            │    ▼                  │
     │                            │  retry (5s/30s/2m/…)  │  no auto retry
     │                            │    │                  │
     │                            │    ▼                  │
     │                            └── syncing ◀───────────┘  (manual start()/
     │                                                        notifyLocalChange()
     │                                                        after saving a
     │                                                        new token)
     │
     └── status stays `unconfigured` until start() is called
```

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
- **Phase 6 — Documentation & Final Verification**: updated this architecture document to describe the final local-first rating file tree, API contracts, data flow through `RatingRepository` / `LocalRatingRepository` / `ratings.storage.ts`, export behavior, and v1 limitations. Final acceptance requires `npm test`, TypeScript validation, Expo start/bundling validation, Android APK validation via the documented Gradle command, and the manual rating persistence/export checklist below.
- **Cloud-sync Phase 1 — Tombstone schema + local soft delete**: extended `TimeSlotRating` with optional `deleted_at: string | null`, taught `ratings.storage.ts` to validate the new field, and refactored `LocalRatingRepository` so `remove(id)` writes a tombstone (preserving rating/efficiency/mood/etc., setting `deleted_at`/`updated_at` to `new Date().toISOString()` and `synced_at` to `null`) instead of physically deleting. `LocalRatingRepository.list()` and `get(id)` now hide tombstones from UI consumers, while `listPendingSync()` still surfaces them so they push when sync arrives. `remove` is a no-op for missing or already-tombstoned records. All new timestamps remain millisecond-precision ISO; no `.slice(0, 19)` constructions exist anywhere in `src/`.
- **Cloud-sync Phase 2 — CloudRatingApiClient + sync types**: introduced `src/features/rating/sync/` with `SyncStateEmitter` + `SyncStatus` union, `CloudRatingApiClient` wrapping `fetch` for `POST /v1/ratings/sync` and `GET /v1/ratings?since=` (per-request `getToken`, `expected_updated_at` scrubbing, 10s AbortController timeout, `SyncError` with `statusCode` / `isTimeout` / `isMissingToken`, injectable `baseUrl` / `timeoutMs` / `fetchImpl`), and `DEFAULT_CLOUD_RATING_BASE_URL` / `DEFAULT_CLOUD_RATING_TIMEOUT_MS` constants. Re-exported from `src/features/rating/index.ts`. No scheduler or UI wiring yet — those arrive in Phases 3–4.
- **Cloud-sync Phase 3 — SyncingRatingRepository wrapper**: added `src/features/rating/sync/syncing-repository.ts` with a minimal `SyncScheduler` interface (`notifyLocalChange(): void`) and a `SyncingRatingRepository` that implements `RatingRepository` by delegating to an injected local repository and calling `scheduler.notifyLocalChange()` after every `save` / `remove` (and exactly once per call). `list` / `get` / `listPendingSync` / `markSynced` remain pure pass-throughs, and `subscribe` forwards to the local repository when it offers one. No network or fetch work happens inside the wrapper — all sync orchestration stays in the scheduler (Phase 4). Re-exported through `src/features/rating/sync/index.ts` and `src/features/rating/index.ts`; covered by a new Jest suite in `syncing-repository.test.ts`.
- **Cloud-sync Phase 4 — SyncScheduler singleton**: added `src/features/rating/sync/sync-scheduler.ts` with a `SyncApiClient` structural interface (`sync` / `list`) that `CloudRatingApiClient` satisfies, a discriminated `SyncSchedulerStatus` union (`idle` / `syncing` / `error` / `unconfigured` — carrying `lastSyncAt` and error `message` where applicable), and a `SyncScheduler` class implementing the Phase 3 scheduler contract. Extended the `RatingRepository` contract with `listAll(): Promise<TimeSlotRating[]>` (implemented by `LocalRatingRepository` straight from storage including tombstones, passed through by `SyncingRatingRepository`) so the scheduler can compute `since` and LWW-merge without letting tombstones get clobbered by older remote rows. `start` flips the scheduler active (no-op when already started); `stop` clears debounce + retry timers and resets retry state. `notifyLocalChange` debounces doSync by 5s (rapid calls collapse into one fire). `pullNow` bypasses the debounce and runs doSync immediately. `doSync` emits `syncing`, collects `listPendingSync` + max local `updated_at` for `since`, calls `api.sync`, LWW-merges returned records by `updated_at` (older remote skipped; tombstones upsert and are auto-hidden by `LocalRatingRepository.list`), then `markSynced(id, server_time)` on each accepted record. Per-record `errors[]` are logged via `console.warn` without triggering backoff. Network / timeout / 5xx failures emit `{ kind: 'error', message, lastSyncAt }` and schedule retries at `5s, 30s, 2m, 5m, 5m…` capped at 5 minutes (unlimited attempts); error messages include countdown formatting (`网络异常 · {n}s 后重试`, `服务端异常 · {n}s 后重试`, `超时 · {n}s 后重试`). `401` / `403` / missing-token failures emit `token 无效` and never auto-retry — waiting for an explicit `start()` / `notifyLocalChange()`; a `notifyLocalChange` during backoff cancels the pending retry and restarts the 5s debounce. Exposes `getSyncScheduler(options?)` singleton plus `resetSyncSchedulerForTests()` for tests. Re-exported from `src/features/rating/sync/index.ts` and `src/features/rating/index.ts`; covered by `sync-scheduler.test.ts`.
- **Cloud-sync Phase 5 — Settings cloud-sync section + detail-modal delete**: added `src/features/rating/sync/wiring.ts` with `SYNC_TOKEN_STORAGE_KEY = 'cs-rn:sync-token'`, `loadSyncToken` / `saveSyncToken` (empty/whitespace token triggers `clearSyncToken`) / `clearSyncToken` AsyncStorage helpers, and `getConfiguredSyncScheduler()` that lazily builds the `getSyncScheduler` singleton with `localRatingRepository` and a `CloudRatingApiClient` whose `getToken` reads the AsyncStorage key. Re-exported through the sync and rating barrels. Extended `app/settings.tsx` with a 云端同步 section above 数据管理: lucide `Cloud` icon (themed), secure `TextInput` for the token, save button that persists via `saveSyncToken` then calls `scheduler.start()` + `scheduler.pullNow()`, a status row subscribed to `scheduler.onStatusChange` with 30s `setInterval` refresh for relative `lastSyncAt` copy, and a 立即同步 debug button that calls `scheduler.notifyLocalChange()` + `scheduler.pullNow()`. Status copy covers unconfigured / idle (never or relative) / syncing / error (rendering the scheduler's message verbatim — network / server / timeout / `token 无效`). Added `onDelete` support to the rating detail modal in `app/rating.tsx` (destructive-styled button at the bottom of the card, `Alert.alert('删除这条打分？', '删除后本地列表和云端都不再显示，可通过同步协议恢复。', …)` with cancel + destructive-style `删除` confirm routing through `useRatings.remove` and closing the modal before refresh) — no list-level swipe/long-press delete introduced. Added Jest coverage in `app/settings.test.tsx` (section render, secure input, AsyncStorage write/remove, scheduler start+pullNow/notifyLocalChange+pullNow, status copy variants, 30s relative-time refresh with fake timers) and `app/rating.test.tsx` (delete button render + Alert copy/destructive style, cancel leaves record, destructive confirm removes + closes modal + refreshes list).
- **Cloud-sync Phase 7 — Docs, manual verification, release build**: documented the cloud sync module end-to-end in Section 3 (module overview + layout table, separate write-path and pull-path diagrams, full error/retry table, and a status-lifecycle ASCII diagram) and extended Section 6 with the five-case manual test matrix (push visible via curl, VPS down → error → recovery, bad token → `token 无效` → fresh token push, 5-record fresh-token first-sync push, tombstone round-trip). Refreshed `Known v1 limitations` to call out encryption-at-rest posture for the Bearer token, single-user scope, and LWW-only conflict resolution. Fixed a residual TypeScript strict-mode error in `syncing-repository.test.ts` (`createMockLocal` returned `jest.Mocked<RatingRepository>`, which preserved the optional `subscribe?` property and broke `.mockReturnValue` on `local.subscribe!`) by widening the mock factory to `jest.Mocked<Required<RatingRepository>>` so every method is a concrete `jest.Mock`. After that, `npx tsc --noEmit` reports zero errors and the full Jest suite (31 suites, 187 tests) is green. The release APK is produced from this branch via the existing `android/gradlew.bat assembleRelease` flow documented in `BUILD_ANDROID.md` and the manual test matrix above is run against it before merge. No production code changes.
- **Cloud-sync Phase 6 — Scheduler wired into app lifecycle + RatingServiceProvider**: added `src/features/rating/RatingServiceProvider.tsx` — a React context provider that synchronously constructs the shared `SyncScheduler` singleton (via `getSyncScheduler({ repository: localRatingRepository, apiClient: new CloudRatingApiClient({ getToken: loadSyncToken }), initialStatus: { kind: 'unconfigured' } })`), wraps `localRatingRepository` with `SyncingRatingRepository`, creates a fresh service via `createRatingService`, and calls `configureRatingsService` so the module-level `createRating` / `removeRating` / etc. exports route every write through the wrapper (and therefore through `scheduler.notifyLocalChange`). Refactored `src/features/rating/services/ratings.service.ts` to hold the service behind a mutable `ratingsService` variable and re-exposed the bound functions as forwarders plus a new `configureRatingsService(service)` / `getRatingsService()` pair (also re-exported from the rating feature barrel, along with the `RatingsService` type and `RatingServiceProvider` / `useRatingService` / `RatingServiceContextValue`). Extended `SyncScheduler.start()` so that calling it from the `unconfigured` state transitions the status to `idle { lastSyncAt: null }` — the boot-wiring flow needs an honest status once a token is attached, without having to also trigger a sync. On mount the provider effect reads `cs-rn:sync-token` from AsyncStorage and, if a non-empty token is present, calls `scheduler.start()` exactly once; otherwise the status stays `unconfigured`. The effect also subscribes to `AppState.addEventListener('change', …)` and calls `scheduler.pullNow()` only on transitions to `active`, with the subscription removed on unmount to prevent leaks. `apiClient.getToken = loadSyncToken` continues to read AsyncStorage on every request, so token edits from the Settings cloud-sync section take effect on the very next sync without rebuilding the scheduler. Integrated `RatingServiceProvider` into `app/_layout.tsx` (wrapping `TabLayout` inside `ThemeProvider`), so local saves/deletes auto-notify the scheduler and cloud sync is now end-to-end for the whole app. Added `src/features/rating/RatingServiceProvider.test.tsx` (save-through-service → `notifyLocalChange`, boot-with-token start-once, boot-without-token unconfigured + no-start, AppState active-only `pullNow`, AppState unmount cleanup, per-request AsyncStorage token freshness, context exposure via `useRatingService`) and extended `app/_layout.test.tsx` with a boot-wiring test confirming that rendering `RootLayout` with a stored token calls `scheduler.start()` once and lands in `idle { lastSyncAt: null }`.

---

## 6. MVP Acceptance Notes

### Manual rating checklist
- Add a rating from the `RATING` tab FAB using rating, efficiency, optional activity, mood, and reflection fields.
- Kill the app process and reopen it.
- Confirm the saved rating still appears in recent history.
- Open `SETTINGS` and run `导出打分数据`.
- Verify the shared JSON is an array of complete `TimeSlotRating` records with `id`, `slot_start`, `slot_end`, `rating`, `efficiency`, `created_at`, `updated_at`, `synced_at`, and `schema_version: 1` fields, plus any optional `activity`, `mood`, `reflection`, or `linked_event_id` values that were saved.

### Cloud sync manual test matrix

Run on a real device with the release APK. Replace `<TOKEN>` with the configured Bearer token and `<BASE>` with the deployed VPS URL (default `https://api.epoch0.org`).

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Push visible via curl | In `SETTINGS` → `云端同步`, paste a valid token → save. Go to `RATING`, save a new rating. Wait ~5s. Run `curl -H "Authorization: Bearer <TOKEN>" "<BASE>/v1/ratings?since="`. | `GET /v1/ratings` returns the new record within ~5 s of the save. Settings status row reads `已同步 · 刚刚同步` (or relative seconds). |
| 2 | VPS down → error → recovery | Stop the VPS (or point `<BASE>` at an unreachable URL). Save a rating. Watch the Settings status row cycle through `网络异常 · {n}s 后重试` countdowns. Restart the VPS. Pull the app to background then foreground (triggers `AppState` `active` → `pullNow`). | Status recovers to `已同步 · 刚刚同步` / relative `lastSyncAt`. The previously pending record is now visible via the `curl` probe from #1. |
| 3 | Bad token | In `SETTINGS` → `云端同步`, paste an intentionally wrong token → save. Try `立即同步`. | Status reads `token 无效`. No background retries happen. After pasting the correct token and saving, the next push succeeds and status flips to `已同步 · 刚刚同步`. |
| 4 | First-sync full push | Clear app data (or wipe `cs-rn:sync-token`). Create 5 local ratings while unauthenticated. Paste a fresh token → save. Foreground-activate the app. | All 5 local records push to the server on the first scheduler run. `GET /v1/ratings` returns all 5. Every pushed record now has a non-null `synced_at` (verifiable via `导出打分数据`). |
| 5 | Tombstone round-trip | Open a rating from history → `删除` → confirm. Wait ~5 s for the 5 s debounce + push. `curl` the server to confirm the tombstone propagated. Trigger `立即同步` / foreground activate. | The record disappears locally and never resurrects after the next pull, even though the tombstone is still on the server. `curl <BASE>/v1/ratings?since=` continues to include the tombstone with `deleted_at` set. |

### Known v1 limitations
- Cloud sync is end-to-end through cloud-sync Phase 6: `RatingServiceProvider` swaps the module-level rating service to a `SyncingRatingRepository`-backed one at app boot, so every local save/delete auto-notifies the `SyncScheduler` (5 s debounce), and `AppState` active transitions trigger a `pullNow`. The `立即同步` debug button and the Settings token save still exist as manual paths. What remains out of scope: no conflict-resolution UI for LWW collisions, and scheduler-triggered merges still flow through `LocalRatingRepository` directly (not the wrapper) — wiring the scheduler through the wrapper would loop merge-phase writes back into `notifyLocalChange`.
- No encryption at rest for the AsyncStorage-stored Bearer token beyond what the OS provides — treat the token as a device-bound secret.
- Single-user only — no multi-account switching, and the server is expected to namespace by token.
- LWW conflict resolution only — concurrent edits on two devices collapse by `updated_at`, with no user-facing conflict UI or merge affordance.
- No MCP endpoint or server API beyond `POST /v1/ratings/sync` and `GET /v1/ratings?since=` for rating records.
- No widget entry point for creating or viewing ratings.
- No AI summary or analysis of rating history.
- No edit flow exposed in the v1 UI; history card details are read-only apart from the destructive `删除` action.
