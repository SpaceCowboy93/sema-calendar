# Shopping iPhone fixes — 1 November 2026

Branch: `fix/iphone-pwa`. The sync-recovery stash remains unchanged at `4ecb62a420f029b57dc4e857d417cb041a8e1356`.

- Enter in the new/edit-list add-item name, quantity or price field adds the item and synchronously focuses the next item name on iOS. It does not submit the whole list. Composition Enter is ignored. The inline add row also handles Enter from quantity/price.
- iOS quantity fields in the sheet and inline add/edit forms use a numeric keyboard and accept decimal digits only, rejecting exponent notation, letters and invalid pasted values. Android/desktop retain their previous number inputs and Enter behavior.
- Saved pending/completed item rows on iOS use the first attached item photo as the category thumbnail. The existing single `photo` field remains supported; an optional `photos` gallery uses its first nonempty photo. Items without a photo keep their existing icon. No image/data migration or live write was performed.
- Focused unit/store regression checks: 76 passed. Browser checks at 367×599: WebKit, Chromium, Android and desktop all passed (4 cases), using disposable local fixture data with external/API requests blocked. TypeScript and optimized build passed, including lint/type validation (warnings only).
- Physical iPhone keyboard behavior remains for user confirmation. Desktop Chrome's generic Responsive mode keeps desktop identification; select an iPhone device and reload to preview iPhone-specific behavior.

Only Preview deployment is authorized. Production, original-database configuration and real caches remain untouched.
