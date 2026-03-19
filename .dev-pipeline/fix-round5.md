# Fix Round 5 — Todo completion sink animation

## Bug: Completed todos should sink to bottom with smooth animation

**Current behavior:** Completed todos stay in place (sort by priority only, is_completed removed from comparator in round 3).

**Expected behavior:** When a todo is marked complete, it should smoothly animate down to the bottom of its priority group. When uncompleted, it should animate back up.

**Implementation:**
1. Re-add `is_completed` to the sort comparator in `TodoSection.tsx`, but sort **within** priority groups only (priority first, then completion status)
2. Wrap the list re-render with `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before updating state, so the reorder is animated instead of jumping
3. Import `LayoutAnimation` from `react-native` and `UIManager`/`Platform` for Android setup
4. On Android, enable LayoutAnimation: `if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);`

## Sort order (within same tab/type):
1. Priority: high → medium → low
2. Completion: incomplete first, complete last (within same priority)
3. This means a completed high-priority todo stays above all medium-priority todos

## Rules
- Use LayoutAnimation for smooth transitions
- After fixing, run `npx tsc --noEmit` to verify no type errors
