# Supabase Egress Audit

**Date**: 2026-10-05
**Branch**: security/phase-1-auth-foundation
**Auditor**: code review — no live Supabase calls made

---

## Summary

The SeMa Supabase project (`neyhoodxeumpbxekskej`) hit the free-tier 5 GB/month
egress quota around 2026-09-26, ~8.6 days into the billing cycle. The Supabase
dashboard showed **14.15 GB** consumed. This audit identifies the confirmed root
cause, the mathematics behind the number, and the fix applied.

---

## Confirmed Root Cause — Unguarded Background-Tab Polling

### Where

`src/hooks/useSupabaseSync.ts`, line 244 (pre-fix):

```ts
// BEFORE (defective):
const timer = setInterval(() => { void pull() }, POLL_MS)

// AFTER (fixed):
const timer = setInterval(() => { if (document.visibilityState !== 'hidden') void pull() }, POLL_MS)
```

### What it does

`pull()` downloads the full `couple_state` row — a JSONB object containing all
18 shared keys (events, todos, goals, countdowns, wishlistItems, memories,
shopping lists, etc.) serialised together. Each read is approximately **20–30 KB**.

`POLL_MS = 5_000` (5 seconds). The interval fires 12 times per minute.

### Why it blew the quota

The interval had **no `document.visibilityState` check**. Every open browser tab
— whether the user was actively using it or had left it open in the background —
polled Supabase at the same rate. A typical session for two users (Seval and
Mateo each with a phone and a laptop tab) has **4 concurrent polling contexts**.

**Egress estimate:**

```
4 sessions
× 12 polls/min
× 30 KB/poll
× 1,440 min/day
× 8.6 days
= ~17.9 GB read egress
```

The 14.15 GB observed is consistent with ~3 sessions active on average (e.g.
laptop tabs closed overnight, phone browsers sleeping but waking periodically).

---

## Secondary Egress Sources (Contributing, Not Root Cause)

These were confirmed by reading source code. None is large enough on its own to
explain the quota breach, but each adds to the baseline.

### 1. Realtime channel + polling overlap

`useSupabaseSync.ts` lines 247–249 subscribe to a Postgres change channel AND
run the `setInterval`. When the Realtime event fires it calls `pull()` without
resetting the interval timer. A partner's write therefore generates:

- 1 Realtime download (~1 KB notification payload)
- 1 immediate `pull()` read (~30 KB)
- 1 interval `pull()` read seconds later (double-read within one POLL window)

Fix: the visibility guard reduces the background portion. A full fix would reset
the interval on each successful Realtime-triggered pull — deferred to a
follow-on change because it requires careful timer lifecycle handling.

### 2. Initial-load validation sequence

`getVerifiedAccess()` (called on every page load from `useAuthSession`) makes
**4 serial Supabase requests**: `auth.getUser`, `profiles`, `couple_members`,
`couple_state`. The last request duplicates the first `pull()` in
`useSupabaseSync`. This is a minor contributor (~120 KB/page-load) and is not
worth removing until the auth flow is refactored.

### 3. Push-sync reminders on every page load

`usePushNotifications.ts` calls `syncBothUsers()` automatically when
`status === 'subscribed' && serverSaved === true`. This makes 2 POSTs to
`/api/push/sync-reminders`, each of which reads and writes to `push_sync_log`
and `push_reminders`. With the service worker `updateViaCache: 'none'`, a SW
version check also fires on each page load. Low individual cost, but adds up
across navigations.

### 4. `couple_state` JSONB architecture

All 18 shared keys live in one wide JSONB column. Every poll — even when only
`todos` changed — downloads the full object including events, memories,
shopping lists, and journey data. A partial-columns approach would reduce
per-poll egress by 80–90%, but would require a significant schema migration.

---

## Egress Breakdown (Estimated)

| Source | Rate | 8.6-day estimate |
|--------|------|-----------------|
| Background-tab polling (root cause) | 4 sessions × 12/min × 30 KB | ~14–18 GB |
| Active-tab polling (visible sessions) | ~1.5 sessions × 12/min × 30 KB | ~5–7 GB |
| Realtime double-reads | ~10/day × 30 KB | ~2.6 MB |
| Page-load validation (4 requests) | ~30 page-loads/day × 120 KB | ~31 MB |
| Push sync | ~30 navigations/day × 60 KB | ~15 MB |

The background-tab polling alone is sufficient to exceed 5 GB in ~3 days at
average usage. The visible-tab polling means the quota would be breached even
after the background fix if sessions are left open for long periods.

---

## Fix Applied

**File**: `src/hooks/useSupabaseSync.ts`
**Change**: one-line guard inside the `setInterval` callback

```ts
// Before (line 244):
const timer = setInterval(() => { void pull() }, POLL_MS)

// After:
const timer = setInterval(() => { if (document.visibilityState !== 'hidden') void pull() }, POLL_MS)
```

**Why this is safe:**

- The `visibilitychange` event listener (line 245) already calls `pull()` when
  the tab becomes visible again — the hook catches up immediately on foreground.
- The initial `void pull()` (line 242) still fires unconditionally so the first
  load is unaffected.
- Offline recovery, conflict resolution, and the save() CAS loop are entirely
  unchanged.
- The `abort.signal` and `cancelAuth` guards remain intact for logout safety.

**Regression test**: `src/__tests__/hooks/sync-visibility.test.ts`

- Test 1 confirms the defect (failed before fix: 4 calls instead of 1).
- Test 2 confirms catch-up pull fires on `visibilitychange` to 'visible'.

---

## Remaining Recommendations (Future Work)

Listed in descending impact-to-risk order.

### R1 — Increase POLL_MS (low risk, high impact)

Change `POLL_MS = 5_000` to `POLL_MS = 30_000` (30 s). Realtime already
delivers sub-second partner updates. The poll is a fallback for Realtime
dropout. 30 s is sufficient; this alone reduces visible-tab read traffic by 6×.
Estimated saving: ~4 GB/month per session.

### R2 — Reset interval on successful Realtime pull (low risk, medium impact)

When the Realtime handler triggers `pull()`, reset the timer so the next
interval poll is deferred by a full `POLL_MS`. Prevents the immediate
double-read after a partner write.

### R3 — Throttle push-sync auto-trigger (low risk, low impact)

Gate the `syncBothUsers()` auto-call with a cooldown (e.g. skip if last sync
was within 60 s). Prevents repeated sync on rapid navigations.

### R4 — Partial-column JSONB reads (medium risk, high impact)

Split `couple_state` into per-domain columns or separate rows so polls only
download changed sections. High migration complexity; defer until after the
free-tier quota is no longer a concern or usage scales further.

---

## Oct 8 Reset Plan

The Supabase quota resets on 2026-10-08. The background-tab fix (applied in
this branch) is the minimum necessary change before the reset. After the reset:

1. Deploy the fix to production.
2. Monitor the Supabase dashboard daily for the first week.
3. If daily egress exceeds ~150 MB (5 GB / 30 days), implement R1 (increase
   POLL_MS) before the end of the first week.
4. If usage remains below 150 MB/day, R1 can be deferred to the next sprint.

---

## Files Audited

| File | Finding |
|------|---------|
| `src/hooks/useSupabaseSync.ts` | **Root cause** — unguarded `setInterval` |
| `src/hooks/useAuthSession.ts` | 4 serial requests on page load (minor) |
| `src/hooks/usePushNotifications.ts` | Auto-sync on every page load (minor) |
| `src/lib/shared-state.ts` | 18 keys in one JSONB column (architecture) |
| `src/app/api/push/sync-reminders/route.ts` | Multiple DB ops per sync call |
| `scripts/qa-live-sync.mjs` | QA script, not production traffic |

No live Supabase requests were made during this audit.
