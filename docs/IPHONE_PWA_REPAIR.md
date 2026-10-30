# iPhone / PWA repair audit — 29 October 2026

Scope: existing shared application, local fixtures and Preview only. No live notifications, database changes, migrations, environment-variable changes, Production deployment or cache deletion are authorized or performed.

## Preservation

Started on `hotfix/production-sync` at `d5217f2` with substantial uncommitted sync-recovery work. Created `fix/iphone-pwa` without resetting or discarding files. Existing cache provenance, recovery and retention work is preserved. Final commit/status details and quality results are recorded below after verification.

## Root causes and changes by screen

| Area | Finding and repair |
| --- | --- |
| Login | Missing viewport-fit metadata and a non-scrolling, fixed-height page could hide fields under the keyboard. Added visible-viewport scrolling, safe padding, keyboard hints and retained pinch zoom. |
| All app pages | Main content and the floating Add button did not reserve the bottom safe area; top content and Activity bell did not reserve the notch. Shared shell and CSS now reserve device insets. |
| Today / Partner Note | Existing note-compose panel now uses the same modal lifecycle and visible-viewport bounds as other editors. Full Create note sending remains in its existing pinned footer. |
| Planner / Calendar / event editing | Event editor now has modal semantics, nested scroll locking, focus restoration and keyboard-aware bounds. Inline calendar Escape is handled locally; time wheels contain overscroll and have 44px rows. |
| Dreams / Wishes / Plans / Moments / To-Dos | Existing editors use the shared SheetPanel adapter or C2Sheet. No form-state or persistence implementation is replaced. |
| Shopping / receipts | Existing shopping C2Sheet benefits from the shared footer and viewport fixes. Scanner/review panels use the shared adapter. Camera, native photo picker and receipt-service integration require separate device validation. |
| Finances | Existing category, savings and budget sheets plus income/finalization/delete dialogs use the shared modal lifecycle and scroll bounds. No calculations or saved amounts are changed. |
| Memories / Moods / Countdowns / Us | Existing inline sheets use the shared adapter. `/memories` and `/journey` are redirects to Us; these are not independent screens. |
| Activity Centre / notification settings | Nested sheet ownership prevents closing an inner preferences sheet from unlocking the page or closing its parent. Backdrops follow their requested z-index; close controls and touch rows are enlarged. |

Shared sheet defects included independent `body.overflow` assignments, unlocked inner `<main>` scrollers, no focus restoration, fixed layout-viewport height, and excessive footer clearance for navigation that is already behind the modal.

## Keyboard and gesture approach

One root VisualViewport listener updates CSS variables without remounting forms or resetting drafts. It handles resize, viewport panning and focus changes, and ignores pinch zoom. On touch devices navigation/FAB are hidden during a detected software-keyboard resize. Focused text controls scroll into view. The modal stack has one scroll lock and one Escape owner. Opening a modal focuses its panel so it does not implicitly request a keyboard. Existing explicit autofocus attributes remain under component control.

CSS uses feature/media detection and safe-area variables, not an iPhone user-agent branch. Existing notification installation help still has its pre-existing iOS identification; standalone detection also accepts the standard display-mode media query.

## PWA and notifications audit

- Added `viewport-fit=cover`, an Apple touch icon using the existing PNG, and explicit manifest scope/identity. Existing manifest standalone display, status-bar default and icons were inspected.
- Service worker uses `skipWaiting`, `clients.claim` and registration with `updateViaCache: 'none'`. There is no service-worker asset fetch/cache handler. Existing HTML no-cache response headers and hashed Next assets remain in place. No new asset cache or retention policy was introduced.
- Notification taps previously focused an existing app window without navigating. The worker now navigates to the supplied same-origin deep link, with an app-root fallback for unsafe or invalid URLs.
- Permission must originate from a user action. Registration is no longer awaited before invoking the permission prompt. Mocked tests cover pending registration, denied permission and unsupported/insecure contexts.
- Existing authenticated subscription registration, reconnect, auth-generation checks and logout cleanup were inspected. Logout invalidates local identity, clears active household state, revokes the local auth session, attempts authenticated subscription removal, unsubscribes the browser and closes displayed notifications. Failure cleanup remains an existing retry limitation.
- Existing session/cache-isolation suites run as part of the full unit suite. The iPhone repair does not change cache keys, retention, backend provenance or authentication rules.
- iOS Web Push requires a Home Screen web app on iOS/iPadOS 16.4 or later, HTTPS/supporting APIs and a permission request initiated by user interaction. Source: [WebKit's iOS Web Push documentation](https://webkit.org/blog/13878/).
- Actual APNs delivery, permission prompts, device suspension and relaunch behavior are **pending physical iPhone testing**. No push was sent during this audit.

## Automation limitations

Playwright WebKit does not replace a physical iPhone. This Windows host additionally exposes a DPI discrepancy: a configured 320px WebKit page can report 256px innerWidth at 125% display scaling. A minimal blank-page reproduction confirms that it is independent of SeMa. Chromium checks supplement WebKit at every requested width. Relevant upstream issue: [WebKit Windows scaling](https://bugs.webkit.org/show_bug.cgi?id=285007).

Standalone mode and hardware insets in desktop automation are simulated; they do not install the PWA. Keyboard tests synthesize VisualViewport changes; they do not open an actual iOS keyboard. Local fixtures block external requests and API calls. Authenticated Preview interaction is not performed with real accounts.

## Physical-iPhone acceptance checklist — ALL PENDING

Use a small SE-class device and a notched/Dynamic Island device where available. Record iOS version, device, orientation and Safari versus Home Screen mode for every failure. Use a designated test account and disposable test entries; preserve real data.

1. Open Preview in Safari. At each available equivalent of 320, 375, 390, 393, 414 and 430 CSS px, check Login, Today, Planner/Calendar, Dreams, Wishes, Plans, Moments, To-Dos, Partner Notes, Shopping, Finances, Memories, Moods, Countdowns, Us, Activity Centre and notification preferences. Verify no horizontal clipping and reachable navigation/actions.
2. Add the same Preview to Home Screen. Check icon, title, standalone launch, status-bar contrast, notch/Dynamic Island and Home indicator spacing. Repeat the full screen pass. Rotate to landscape where the OS permits it, then rotate back.
3. Focus every text field near the top and bottom of long sheets. Type long text, emoji and translated text. Switch keyboard languages. Verify 16px-or-larger text fields do not trigger unwanted zoom. Use Next/Done/Enter, dismiss via keyboard controls and tapping away, then refocus. Verify drafts survive all viewport changes.
4. In Today and Full Create, compose a long Partner Note. With the keyboard open and after dismissal, scroll to Send, send a disposable note and confirm the sent state. Verify navigation does not jump above the keyboard.
5. Create and edit an event. Change date, month, hour and minute; scroll both wheels independently, use keyboard arrows with an external keyboard if available, and confirm selected values. Add/edit checklist items near the keyboard. Reach Save, Cancel and Delete; cancel one deletion. Reopen and verify saved values.
6. Add shopping/checklist items with names, fractional quantities and decimal prices. Check locale decimal separators, zero/empty values, and Enter behavior. Verify the inline Add and final Save controls remain reachable. Test native photo/camera selection and cancellation with disposable images.
7. Open each sheet, scroll to its end, overscroll in both directions and close by its supported controls. Ensure the background remains still. Open a nested delete/preferences/editor sheet, close it, then close the parent; verify no frozen page and sensible focus restoration. Try swipe/scroll gestures and iOS Reduce Motion.
8. Edit disposable budget/income/savings entries, a memory, mood and countdown; open long details and confirmation dialogs. Verify controls remain in the visible area with the keyboard and in landscape. Do not finalize a real finance month.
9. Close the PWA, reopen it, then force-quit/relaunch. Check session restoration, correct household/account state and deep links with an existing verified session. Test expired-session deep links separately; sign-in currently routes to Today and does not preserve an arbitrary destination.
10. Using a designated test account and a separately authorized push test, check Home Screen-only eligibility, one-tap permission request, Allow, Deny, OS Settings re-enable, subscription reconnect and persistence. Check foreground/background/locked-device delivery, Focus mode and notification-tap destinations with the app open and closed. **Do not send live notifications without that separate test authorization.**
11. Sign out of the test account. Confirm household data disappears, old notifications close and the subscription is removed. Sign in as a different designated test account and verify no prior-account content/notifications appear. Repeat offline cleanup/reconnect behavior when practical.
12. After a later Preview deployment, resume an old open PWA, reload and relaunch. Confirm current HTML/assets and worker are used without blank screens. Do not clear website data or user caches as a workaround.

## Quality results, files and final Git state

Resumed 30 October 2026 on fix/iphone-pwa: 41 staged files (749 insertions, 203 deletions before this note). Prior checkpoint: 1,097 tests, TypeScript, WebKit and Chromium 320px focused checks passed. Final lint passed with warnings; optimized build and its TypeScript check passed. git diff --cached --check passed. Sync-recovery stash preserved unchanged at 4ecb62a420f029b57dc4e857d417cb041a8e1356. Physical iPhone acceptance remains pending. iPhone priority applies to this work session.
