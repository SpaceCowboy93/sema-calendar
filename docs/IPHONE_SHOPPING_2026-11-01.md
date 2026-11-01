# Shopping iPhone fixes — 1 November 2026

Branch: `fix/iphone-pwa`. The sync-recovery stash remains unchanged at `4ecb62a420f029b57dc4e857d417cb041a8e1356`.

- Enter in the new/edit-list add-item name, quantity or price field adds the item and synchronously focuses the next item name on iOS. It does not submit the whole list. Composition Enter is ignored. The inline add row also handles Enter from quantity/price.
- iOS quantity fields in the sheet and inline add/edit forms use a numeric keyboard and accept decimal digits only, rejecting exponent notation, letters and invalid pasted values. Android/desktop retain their previous number inputs and Enter behavior.
- Saved pending/completed item rows on iOS use the first attached item photo as the category thumbnail. The existing single `photo` field remains supported; an optional `photos` gallery uses its first nonempty photo. Items without a photo keep their existing icon. No image/data migration or live write was performed.
- Focused unit/store regression checks: 76 passed. Browser checks at 367×599: WebKit, Chromium, Android and desktop all passed (4 cases), using disposable local fixture data with external/API requests blocked. TypeScript and optimized build passed, including lint/type validation (warnings only).
- Physical iPhone keyboard behavior remains for user confirmation. Desktop Chrome's generic Responsive mode keeps desktop identification; select an iPhone device and reload to preview iPhone-specific behavior.

Only Preview deployment is authorized. Production, original-database configuration and real caches remain untouched.

## Responsive-mode follow-up

The first fix identified iOS devices only, so the user's generic Chrome Responsive view still received the old quantity/Enter behavior. Shopping now enables these controls for iOS and for narrow non-Android viewports (up to 767 CSS px), including responsive resizing without reload. Full-width desktop and Android retain their previous controls. This applies to thumbnails as well as quantity/Enter handling.

Regression checks specifically exercise both New and Edit Shopping List: `e`/`E` rejection, invalid paste rejection, Enter from quantity adding an item and restoring name-field focus without submitting the list. Six focused unit tests and four browser cases passed, including generic desktop Responsive mode at 367×599, WebKit/iPhone, Chromium/iPhone and Android.

## Consistent quantity and Enter rules

The user confirmed their actual phone is a Samsung S24. The previous Android exclusion was inappropriate for the requested Shopping input behavior. Quantity validation, numeric keyboard hints, Enter handlers and next-name focus now apply on every device, independent of user agent or viewport. Layouts and photo-display scoping are unchanged. The formerly failing Android test was changed to require the correct behavior and failed before implementation, then passed afterward. Browser quantity/Enter assertions no longer accept broken Android behavior; tests use the exact reported Android 16 / Pixel 10 / Chrome 156 identity as well as desktop Responsive and iPhone profiles. Six focused component tests plus 72 shared-store tests passed; all four browser cases passed. Existing diagnostic evidence under `.tmp/` remains untouched.
