# Fix Round 4 — Event Sheet Scroll Regression

## Bug: EventSheet parent ScrollView hard to scroll

**Context:** In the previous fix (round 3), we added `pickerActive` state to EventSheet that sets `scrollEnabled={false}` on the parent ScrollView when a DateTimePicker is being interacted with. The time picker scrolling works correctly now, BUT the overall EventSheet page scrolling has become very difficult/sluggish.

**Likely cause:** The `onTouchStart`/`onTouchEnd` handlers on the DateTimePicker wrapper Views may be too aggressively disabling parent scroll, or the touch area is too large, or the `scrollEnabled` state isn't being properly restored after picker interaction ends.

**Required behavior:**
1. The parent ScrollView in EventSheet should scroll normally and smoothly when the user swipes on non-picker areas
2. The DateTimePicker wheels should scroll their values (not the page) when the user swipes inside the picker
3. These two should not conflict

**Investigation steps:**
1. Read `src/features/schedule/components/EventSheet.tsx` — check how `pickerActive` and `scrollEnabled` are wired
2. Read `src/features/schedule/components/DateTimePicker.tsx` — check touch handler setup
3. Identify why parent scroll is sluggish
4. Fix: ensure `onTouchStart`/`onTouchEnd` only trigger on the picker columns themselves (not a large wrapper area), and make sure `scrollEnabled` is reliably restored to `true`

## Rules
- Do not break the time picker scroll fix
- After fixing, run `npx tsc --noEmit` to verify no type errors
