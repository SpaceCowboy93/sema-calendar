# iPhone continuation — 31 October 2026

## Scope and preservation

Work remains on `fix/iphone-pwa`. iPhone Home Screen PWA and Safari are the priority for this session. Android and desktop presentation/interaction are preserved: the new controls and modal-shell suppression are enabled only for iOS devices. Existing monthly finance calculations are unchanged.

The pre-existing sync-recovery stash remains untouched at `4ecb62a420f029b57dc4e857d417cb041a8e1356`. No stash apply/pop, merge to main, Production deployment, personal-data edits, real-cache clearing, live push test or database/schema write was performed during this overnight continuation. Tests use disposable local fixture state and block external browser requests.

## Confirmed iPhone issue repaired

An inline Finance editor inherits its page's stacking context. Navigation, floating Add, the Activity bell and the partner-note bubble can remain above it, covering editor controls. The shared modal stack now sets an iOS-only root marker while a modal is open. CSS hides those shell controls until the last nested modal closes. Android/desktop do not receive that marker and keep their existing behavior. Focus restoration and scroll unlocking remain covered.

## Requested additions

- **Daily budget:** Finance → Daily budget, within an existing finance month. Select a date and amount. Decimal comma and decimal point are accepted; negative/invalid amounts are rejected. Blank removes only the selected day's plan. Plans persist in an optional `dailyBudgets` field inside the existing finance-month record, without creating expenses or changing monthly totals. Finalized months remain read-only. No schema migration is needed.
- **Days together:** available from Home and Us on iPhone. Defaults to the existing configured relationship origin, 5 March 2025 at 21:00 local time. The sheet shows total calendar days and can also count from an existing past milestone. Opening or changing that view writes no shared data. Tapping the existing Us relationship card toggles its years/months/days view to total days; keyboard activation and Reduce Motion remain supported.

## Verification

- Full unit suite: **848 tests across 50 files passed** on the final application code.
- TypeScript passed. Lint passed with existing warnings.
- Initial broad core matrix: 69/70 passed; one WebKit 430px case was interrupted by source-edit Fast Refresh and passed in the final settled-code run.
- Focused editor/features matrix: 12/12 passed (WebKit 320/390/430px, Chromium 320px, Android and desktop).
- Final settled-code browser coverage: 35 cases across WebKit 320/430px, Chromium 320px, Android and desktop. 34 passed in one run; the remaining 320px feature case encountered first-time route compilation and passed on a separate rerun after adding the same route warmup used by the core suite. No assertions were removed, retries increased or failures silently ignored.
- Browser checks cover fake-state daily-plan save/reload, decimal input, synthetic keyboard bounds, day-count views on both routes, tap/keyboard toggling of the existing Us timer, editor layering, closure/scroll recovery, standalone safe-area simulation, landscape and core screens.
- Visual inspection of exact-size Chromium screenshots confirmed reachable Finance controls and unclipped day-count content. The screenshots are retained under `.backups/iphone-editor-browser-results/` and `.backups/iphone-final-browser-results/`.
- Optimized build passed, including the build's lint/TypeScript gate. Existing lint and webpack-cache warnings remain.
- Deployment target is Preview only. Readiness and the deployed commit are verified live after push and recorded in the chat handoff.

Early browser runs exposed two test-environment interruptions: development Fast Refresh during source edits, and a reused test server stopping when its owning run ended. Their error evidence is retained under ignored `.backups/` and `test-results/`. They are not counted as product passes. Final tests run after source edits with a dedicated owned server. Desktop Windows WebKit still has the previously documented DPI discrepancy; Chromium at exact CSS dimensions supplements it.

## Physical iPhone checks still required

1. Launch the updated branch Preview from its Home Screen icon. Screenshot Today, including status bar and bottom navigation. Record model/iOS version.
2. Open Finance → Income, then Budget Category. Confirm no navigation, Add button or note bubble covers the editor. Open/dismiss the real iOS keyboard and verify Save/Cancel/Close, draft retention and page scrolling after close.
3. In a designated test month/account, set a disposable daily plan, reopen it and reload. Change dates, test decimal comma, cancel without saving, then remove only the test plan.
4. Tap Days together on Home and Us. Confirm the configured origin and total. Tap the Us relationship card twice to switch views. Repeat with Reduce Motion enabled.
5. Continue the existing one-screen-at-a-time checklist in `IPHONE_PWA_REPAIR.md`: calendar, editors, notes, shopping/camera, finances, memories/moods, Activity, relaunch and update behavior. No real-cache clearing as a workaround.

Desktop automation does not prove native iOS keyboard, camera picker, installed-PWA lifecycle or real push delivery.

## Existing security follow-up

Earlier sign-in diagnosis found a v2 server secret incorrectly configured in Preview's public browser-key variable. That variable was replaced with the publishable key and the rebuilt public sign-in assets/read-only Auth settings check passed; the user confirmed sign-in. The old secret still requires rotation/revocation after explicit approval, with any affected Preview server configuration updated. Old deployment assets can retain the exposed key. No key value is included in this report. Production and original-database configuration remain outside scope.

## Handoff

Stable iPhone Preview: https://sema-calendar-git-fix-iphone-pwa-mateo-s-projects123.vercel.app

After saving, pushing and verifying the Preview, the user's requested normal Windows shutdown is attempted without forcing applications closed.
