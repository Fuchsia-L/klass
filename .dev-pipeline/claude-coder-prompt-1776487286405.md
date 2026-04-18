You are fixing issues found during code review for Phase 4: SyncScheduler singleton.

## Review Feedback

{
  "approved": false,
  "issues": [
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "167-173",
      "severity": "major",
      "issue": "LWW merge uses `repository.get(remote.id)`, which returns null for any locally tombstoned record (LocalRatingRepository.get filters `deleted_at != null`). When the server returns an older record for an id that is locally a newer tombstone, the scheduler proceeds to `save(remote)` and overwrites the newer tombstone — deleted records can resurrect. There is no test covering this path.",
      "suggestion": "Expose a raw/unfiltered lookup (e.g. add an optional `getRaw(id)` or `listAll()` on RatingRepository) and compare against that, or batch-load `listPendingSync()` and the server's remote ids to fetch the tombstone state before comparing updated_at."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "105-121",
      "severity": "major",
      "issue": "A notifyLocalChange arriving during an in-flight doSync can be silently dropped. Timeline: debounce fires → runSync sets syncing=true and starts a slow fetch (debounceTimer=null). Mid-fetch, notifyLocalChange schedules a new debounce. Debounce expires while the first fetch is still running → runSync early-returns because `if (this.syncing) return;`. When the first fetch eventually finishes, nothing re-schedules, so the user's change sits un-synced until the next local change.",
      "suggestion": "Either (a) set a `pendingRun` flag when runSync is skipped due to in-flight sync and re-invoke runSync in the finally branch of the completing call, or (b) queue the next sync by awaiting the in-flight promise instead of short-circuiting."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "167-173",
      "severity": "minor",
      "issue": "Records pulled from the server are saved verbatim. If the server's returned `TimeSlotRating` has `synced_at: null` (typical — server usually does not round-trip this client-side field), the scheduler never marks them synced, so next cycle's `listPendingSync()` will include them and they'll be re-pushed unnecessarily until the server echoes server_time back.",
      "suggestion": "After `save(remote)`, call `markSynced(remote.id, server_time)` for records pulled via the merge path — they're already server-canonical so they should be considered in-sync."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "152-165",
      "severity": "minor",
      "issue": "`computeSince` unions `repository.list()` and `listPendingSync()`, but both filter out *synced* tombstones (list filters by deleted_at, listPendingSync filters by synced_at). If the locally newest record is a synced tombstone, `since` will be older than that record's updated_at, causing the server to re-send the tombstone each cycle (LWW-equal skip spares correctness, but wastes a round-trip).",
      "suggestion": "Use a raw `listAll()` from the repository for the since calculation, or persist a dedicated `lastSyncAt` cursor instead of deriving it from storage every time."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "53-56",
      "severity": "minor",
      "issue": "Spec says `401/403` should wait for an explicit `start()` or `notifyLocalChange` before retrying. After a token-invalid error the scheduler stays `started=true`, so a subsequent `start()` is a no-op and will not trigger a resync — only notifyLocalChange/pullNow will. The caller that writes a new token will likely expect `start()` to re-arm the scheduler.",
      "suggestion": "When the scheduler is in the token-invalid error state, treat `start()` as a trigger to immediately kick off a sync (or document that callers must `pullNow()` after a token change)."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.ts",
      "line": "217-222",
      "severity": "minor",
      "issue": "`nextBackoffDelay` mutates `retryAttempt` as a side effect of reading the next delay. Since it's already tangled with timer lifecycle, this is easy to misuse (e.g. if it were ever called twice for one retry). `Math.min(delay, BACKOFF_CAP_MS)` is also redundant because BACKOFF_SCHEDULE_MS max is already 300_000 = BACKOFF_CAP_MS.",
      "suggestion": "Split into a pure `delayForAttempt(n)` plus an explicit `retryAttempt += 1` increment at the scheduling site; drop the redundant Math.min."
    },
    {
      "file": "src/features/rating/sync/sync-scheduler.test.ts",
      "line": "262-340",
      "severity": "minor",
      "issue": "LWW merge tests only exercise the non-tombstoned local case. The scenarios that would catch issue #1 above (local tombstone newer than remote; local tombstone older than remote) are not covered, so the bug passed CI.",
      "suggestion": "Add a test where a local tombstone has updated_at > remote.updated_at and asserts the remote is NOT saved."
    }
  ],
  "unmetCriteria": [
    "Criterion 8 — 'Records returned from server are merged into local with LWW by updated_at (newer wins)' is only partially met: the comparison fails to see locally tombstoned records, so a newer local tombstone can be overwritten by an older remote record."
  ],
  "overallNotes": "The scheduler is mostly in good shape — singleton, debounce, pullNow bypass, backoff schedule with 5m cap, 401/403 no-retry, countdown messages, partial-rejection warn path, and subscribe/unsubscribe all behave per spec and are well-tested. Two correctness issues should block approval: the LWW merge is blind to local tombstones (get() filters them), and a local change arriving during an in-flight sync can be dropped because runSync short-circuits on `syncing=true` without any pending-run flag. Several smaller issues (pulled records never marked synced, since cursor missing synced tombstones, start() being a no-op after 401) are worth cleaning up before wiring this into Phase 5."
}

## Instructions

1. Fix each issue listed above
2. Pay special attention to critical and major issues
3. Re-run all tests after fixing to ensure nothing is broken
4. Do NOT introduce new features — only fix the reported issues
5. If a suggestion doesn't make sense, use your judgment but still address the underlying concern
