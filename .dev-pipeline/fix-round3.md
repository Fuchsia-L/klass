# Fix Round 3 — Codex Review Findings

## Issue 1: Todo list reorders on completion (scroll jump)

**File:** `src/features/todo/components/TodoSection.tsx:27`
**Problem:** The sorted list puts completed items after incomplete ones across priority groups. When a user toggles completion, the row moves in the list, causing a visual scroll jump.
**Fix:** Remove `is_completed` from the sort comparator. Sort only by priority. Completed items stay in their priority group at the same visual position. Users can still see completion state via the checkbox UI.

## Issue 2: DateTimePicker scroll fix is broken

**File:** `src/features/schedule/components/DateTimePicker.tsx:145`
**Problem:** `onStartShouldSetResponder={() => true}` and `onMoveShouldSetResponder={() => true}` on the wheel wrapper View captures gestures BEFORE the inner FlatList can handle them, potentially breaking the picker's own scrolling. The `nestedScrollEnabled` alone is also insufficient.
**Fix:** 
1. Remove `onStartShouldSetResponder` and `onMoveShouldSetResponder` from the wheel wrapper View
2. Instead, in `EventSheet.tsx`, add state tracking for when the user is interacting with a picker
3. When a picker is being dragged, set `scrollEnabled={false}` on the parent ScrollView
4. Use `onTouchStart`/`onTouchEnd` on the DateTimePicker wrapper to toggle this state
5. This way the parent stops competing for scroll gestures while the user is in the picker

## Rules
- Fix each issue. Do not skip any.
- Do not break existing functionality.
- After fixing, run `npx tsc --noEmit` to verify no type errors.
