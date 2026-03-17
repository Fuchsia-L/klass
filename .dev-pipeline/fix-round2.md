# Fix Round 2 — User Testing Feedback

Read the relevant files before making changes. After fixing, run `npx tsc --noEmit` to verify.

## Bug 1: Scroll to bottom after completing a todo
When a todo is marked as complete, the list should NOT scroll to the bottom. Completed todos should stay in place visually (or move to the bottom of their priority group, but the scroll position should remain stable).

## Bug 2: Delete confirmation dialog
Currently todos are deleted immediately with no confirmation. Add an Alert.alert confirmation dialog before deleting a todo, similar to how destructive actions are typically handled in RN apps. Example: "确认删除" / "确定要删除这个待办吗？" with "取消" and "删除" buttons.

File: `src/features/todo/components/TodoSection.tsx` or `TodoItemCard.tsx` (wherever delete is triggered)

## Bug 3: Todo detail view + edit flow redesign
Current behavior: tapping a todo opens the edit sheet directly.
Required behavior:
1. Todo title max length: 20 characters (enforce in input)
2. Add a "备注" (notes/description) field to todos
3. Tapping a todo opens a **detail view** (read-only) showing title, type, priority, notes, created date
4. The detail view has an "编辑" button that switches to edit mode
5. Edit mode allows modifying title, type, priority, and notes

This requires:
- Update `TodoItem` type in `types.ts` to add `notes?: string` field
- Update `TodoSheet.tsx` to support detail view mode vs edit mode
- Update storage/service layer to handle the new field
- Add maxLength={20} to title TextInput

## Bug 4: Time picker scroll conflict
In the event creation sheet (EventSheet), the time picker scroll wheel (DateTimePicker) doesn't work properly — scrolling inside the time picker scrolls the entire page instead of just the picker values.

File: `src/features/schedule/components/DateTimePicker.tsx` and/or `EventSheet.tsx`

Fix: The ScrollView/modal containing the DateTimePicker needs `nestedScrollEnabled={true}` on the picker's scroll container, or the outer ScrollView needs to not capture scroll events when the user is interacting with the picker. Common fix: wrap the picker in a View and use `onStartShouldSetResponder` / `onMoveShouldSetResponder` to prevent the parent from stealing touch events, or set `nestedScrollEnabled` on the FlatList/ScrollView inside the picker.

## Rules
- Fix each issue. Do not skip any.
- Do not break existing functionality.
- Read the relevant files before editing.
- After fixing, run `npx tsc --noEmit` to verify no type errors.
