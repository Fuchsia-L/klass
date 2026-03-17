# Code Review — Round 2 (UX Fixes)

Review the latest changes made to fix 4 user testing issues. Focus on correctness and regressions.

## What changed

1. **Todo completion scroll stability** — completing a todo should not cause scroll jump
2. **Delete confirmation** — Alert.alert before deleting a todo
3. **Todo detail view redesign** — tapping a todo opens read-only detail view, edit button switches to edit mode. Added `notes` field, title maxLength=20
4. **Time picker scroll conflict** — DateTimePicker scroll should not conflict with parent ScrollView

## Review checklist

1. Does the delete confirmation actually prevent accidental deletion?
2. Is the detail view → edit mode transition correct? Can you get stuck?
3. Is the `notes` field properly persisted and loaded?
4. Does `maxLength={20}` work on the TextInput?
5. Is the time picker scroll fix correct? Does `nestedScrollEnabled` or responder handling work?
6. Any regressions to existing todo or schedule functionality?
7. Type safety — any new `any` types or missing types?

## Files to review

Read the git diff of the latest commit, then inspect:
- `src/features/todo/components/TodoSheet.tsx`
- `src/features/todo/components/TodoSection.tsx`
- `src/features/todo/components/TodoItemCard.tsx`
- `src/features/todo/types.ts`
- `src/features/todo/services/todo.service.ts`
- `src/features/todo/storage/todo.storage.ts`
- `src/features/schedule/components/DateTimePicker.tsx`

## Output format

List each issue as:
- **[SEVERITY: critical/major/minor]** File:line — description and suggested fix

Only report real issues.
