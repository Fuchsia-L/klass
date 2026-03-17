# Fix Review Findings

Another AI (Codex) reviewed the Todo feature you just built. Fix ALL of the following issues.

## Issues to Fix

### [MAJOR] 1. Weekly reset cross-year bug
**File:** `src/features/todo/domain/refresh.ts:37`
**Problem:** Weekly reset compares `getFullYear()` with ISO week numbers, which breaks across year boundaries. A todo completed on 2024-12-31 and reopened on 2025-01-01 resets immediately even though both dates are still in ISO week 1.
**Fix:** Compute and compare ISO week-year together with ISO week number.

### [MAJOR] 2. Cache updated before storage write succeeds
**File:** `src/features/todo/storage/todo.storage.ts:47`
**Problem:** `saveTodosToStorage()` updates `cachedTodos` before `AsyncStorage` write succeeds. If `saveJSON()` throws, the app keeps serving unsaved in-memory data and diverges from disk.
**Fix:** Only swap the cache after a successful write, or restore the previous cache in a catch.

### [MINOR] 3. Loading state ignored
**Files:** `app/index.tsx:14`, `src/features/todo/components/TodoSection.tsx:83`
**Problem:** `useTodos().loading` is ignored, so the todo area renders the empty state while storage is still loading, and pull-to-refresh has no todo-specific loading feedback.
**Fix:** Pass `loading` into `TodoSection`, suppress the empty state until the first load finishes, and drive `RefreshControl` from a combined events+todos refreshing state.

### [MINOR] 4. Blank title saves silently
**File:** `src/features/todo/components/TodoSheet.tsx:47`
**Problem:** Saving with a blank title silently returns without any validation message or disabled button state.
**Fix:** Mirror `EventSheet` by keeping an error state and showing feedback, or disable the save button until `title.trim()` is non-empty.

### [MINOR] 5. Virtualization removed
**File:** `app/index.tsx:74`
**Problem:** Replacing the virtualized `SectionList` with a plain `ScrollView` removes virtualization. With many events and todos, this eagerly renders everything and regresses scrolling performance.
**Fix:** Keep a `SectionList`/`FlatList` and attach the todo module as a header/footer component.

### [MINOR] 6. Hardcoded priority colors
**File:** `src/features/todo/components/TodoItemCard.tsx:14`, architecture rule in `ARCHITECTURE.md:90`
**Problem:** Priority colors are hardcoded inside the component, violating the project's "all colors from theme" rule.
**Fix:** Move priority colors into the theme layer and read them through `useTheme()`.

## Rules
- Fix each issue. Do not skip any.
- Do not break existing functionality.
- Read the relevant files before editing.
- After fixing, run `npx tsc --noEmit` to verify no type errors.
