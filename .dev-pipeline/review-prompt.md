# Code Review Task

You are a senior React Native / Expo / TypeScript engineer. Review the following code changes with a critical eye.

## Context

This is a course schedule app (klass). A new Todo feature was just added by another AI (Claude Code). The project uses:
- Expo + React Native + TypeScript
- AsyncStorage for local persistence
- Feature-based module structure: domain / hooks / services / storage / components

## What was added

A new `src/features/todo/` module with:
- Three todo types: daily (auto-refresh daily), weekly (auto-refresh weekly), long-term (manual)
- Priority levels (high/medium/low) with sorted display
- CRUD operations + completion toggle
- Home page integration with tab-based display

## Your Review Checklist

1. **Correctness**: Logic errors, edge cases, off-by-one errors
2. **Type safety**: Are TypeScript types used properly? Any `any` leaking?
3. **State management**: Race conditions, stale closures, listener cleanup
4. **Storage**: Data integrity, migration concerns, error handling
5. **Auto-refresh logic**: Is the daily/weekly reset logic correct? Timezone issues?
6. **UI**: Missing loading states, error boundaries, accessibility
7. **Architecture**: Does it follow the existing patterns correctly? Any coupling issues?
8. **Performance**: Unnecessary re-renders, missing memoization

## Files to review

First, read ARCHITECTURE.md to understand the project structure.
Then read all files in src/features/todo/ directory.
Then read the modified app/index.tsx.

## Output format

List each issue as:
- **[SEVERITY: critical/major/minor]** File: description of issue and suggested fix

Only report real issues. Don't nitpick formatting.
