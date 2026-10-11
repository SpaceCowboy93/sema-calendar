# Production synchronization investigation

Baseline: production deployment `dpl_G6EUqbHQWMpXy9QHUYYTgQN4efKb`, main
`2f58a0cec2bfde50bb7da5ac8bb8bf2058965bf4`. The original local branch was
`security/phase-1-auth-foundation` at `e33ce4deb393dfb82ebcb64ebfa2eb532c325824`.
Tracked work was clean; the two untracked QA scripts were preserved.

## Read-only database and request evidence

- Both partner Auth accounts and profiles exist. Each has exactly one membership,
  in couple `3de918c1-fccc-454d-8618-8dce607ea4d8`.
- Exactly one `couple_state` row exists: `sema`, bound to that same couple. Its
  primary key, unique couple constraint and foreign key are present. No user
  triggers are attached, and no orphan state rows were found.
- The initial snapshot was last updated at `2026-10-09T18:45:35.431Z`, with
  1,730,349 JSONB text bytes and SHA-256
  `5113ffe02dbbeedd6bd32005a7a21e3bc9aaeb038e66874fa853b18a3534c5aa`.
  All shared array fields contain valid IDs; no private field values were printed.
- RLS is enabled. Authenticated members can SELECT and UPDATE through the private
  membership helper. Effective column grants allow updating only `state` and
  `updated_at`, not household identifiers. Profile/member SELECT grants and
  private-helper EXECUTE/schema USAGE grants are present.
- Applied migration history includes `20260924152904_bind_sema_and_enforce_member_access`.
  The activity-notification migration is absent and was not applied.
- In the bounded Production-origin edge logs from `2026-10-09T19:37:12Z` to
  `2026-10-09T21:04:26Z`, Mateo had 36 successful `couple_state` GETs and Seval had
  16. Each returned row range `0-0/*`. The actual `state,updated_at` reads numbered
  18 and 11 respectively, all using `id=eq.sema` and the correct `couple_id`.
  No PATCH, POST or UPSERT was recorded for either account in that window.
  These are request-log observations, not a new live write test.
- `couple_state` is absent from every Realtime publication. The existing
  `supabase_realtime` publication supports UPDATE events but does not contain
  this table. Missing replication cannot explain the lack of writes by itself.

## Code path

`getVerifiedAccess` verifies the Auth user before resolving the profile,
membership and bound row using that user's session. `useAuthSession` loads the
scoped cache before establishing the context. The app layout calls
`useSupabaseSync` once; development preview does not mount it.

The Zustand subscription records changed shared keys and their original values,
then debounces a conditional UPDATE by 800 ms. It reads/rebases first and filters
by state ID, couple ID and the current database timestamp. Zero matching rows
retry at most three times. Session invalidation aborts stale work.

Shared keys include calendar/checklists, notes, shopping, finance, goals and other
household fields. Identity, UI state, local Activity Centre entries and notification
preferences are excluded. Cache hydration happens before the sync subscription;
clean fields take the remote value, and genuine conflicting local edits remain
pending. Legacy caches without a baseline deliberately retain ambiguous edits.

The defect reproduced by offline regression tests is a global conflict barrier:
one pending-field conflict aborts every write, even unrelated additions. A dirty
fallback/manual pull calls that same save and exits without applying remote data.
Consequently an unresolved legacy-cache or concurrent-edit conflict can suppress
both outbound work and incoming clean fields. This client-side trigger still
requires confirmation in the affected phone caches; no cache was cleared or
copied to simulate their state.

The correction isolates conflicted fields: their remote values are not overwritten,
their local work stays pending, independent changes can be conditionally written,
and pulls continue to merge clean partner data. Conflict rules and timestamp
concurrency protection remain in place.

The five-minute fallback interval skips hidden tabs, with immediate pulls on
foreground/online events. Realtime UPDATE signals also pull and reset the timer.
Before this correction, error paths only changed a module status which no current
layout UI consumes; subscription status is not observed by the hook.

## Prepared database correction — NOT APPLIED

Run only against the verified current project after reviewing this evidence and
authorizing the publication change. This changes replication configuration only;
it does not alter policies, grants, row data or migration history.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_state
    WHERE id = 'sema'
      AND couple_id = '3de918c1-fccc-454d-8618-8dce607ea4d8'::uuid
  ) THEN
    RAISE EXCEPTION 'Verified SeMa state binding not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication
    WHERE pubname = 'supabase_realtime' AND pubupdate AND NOT puballtables
  ) THEN
    RAISE EXCEPTION 'Unexpected Realtime publication configuration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'couple_state'
  ) THEN
    RAISE EXCEPTION 'couple_state already published; recheck before applying';
  END IF;
END
$preflight$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_state;
COMMIT;
```

Do not apply `20261008120000_activity_notifications.sql`. Activity delivery remains
disabled. No authenticated QA item was created during the initial diagnosis.
Browser observation uses isolated in-memory contexts, manual sign-in, blocked
application writes and notifications, and only safe status/count/hash metadata.

## Hotfix validation

Two regressions failed before the correction: incoming clean partner data was
ignored when a field conflicted, and an independent pending addition never caused
an UPDATE. Both pass after the correction. Focused synchronization/cache tests:
80 passed across six files. Full suite: 829 passed across 45 files with two workers.
The first full run under concurrent quality gates timed out twice in the unchanged
development-preview file and caused two subsequent React cleanup failures; that
file passed all 14 tests in isolation before the successful complete rerun. No
assertions were skipped or timeouts increased.

TypeScript, lint, production build, `git diff --check` and a credential-pattern
scan passed. Lint/build retain 20 existing warnings. The scan covered 228 files,
including this new report, and reported zero findings without printing values.

Manual sign-in in the two isolated observation windows remained pending during
these checks. Authenticated browser subscription status, live write response and
affected-row count, and the original phone cache conflicts are therefore not yet
verified. No live QA item has been created. The missing publication and reproduced
code defect are confirmed independently; they do not establish the exact pending
cache condition on either affected phone.
