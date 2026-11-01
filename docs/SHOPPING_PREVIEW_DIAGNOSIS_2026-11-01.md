# Shopping Preview diagnosis — 1 November 2026

## Result

Neither reported failure reproduced on the served `/shopping` route in isolated
Windows Chrome at 367 × 599. No application source change is justified by this
run. The cause of the user's failing browser state remains unresolved; this is
not a claim that the user's issue has been fixed.

## Deployment checkpoint

The stable branch alias was confirmed to resolve to READY Preview
`dpl_8gzX9KUfKgwdNVnEJWd8pkZdUrje`, URL
`sema-calendar-mrydgvvgd-mateo-s-projects123.vercel.app`, Git commit
`63db308c4bae247e21b9a4ed1cd0cdd708ecf5e5` on `fix/iphone-pwa`.
The browser fetched the expected quantity code from chunk
`18-9645d23c0316ce63.js`, including the narrow-viewport hook and digit validation.
This establishes the served checkpoint, not the contents of the user's existing tab.

## Exact edit control and event evidence

- Route: stable branch Preview `/shopping`, not `/dev-preview/shopping`.
- Opened `Edit Isolated Shopping QA`, a disposable existing list containing one item.
- Component: `ShoppingListEditorSheet`, `mode="edit"` (minified component name `k`).
- Field: dialog `Edit Shopping List` → exact label `Item quantity`, in the top
  add-item row beside `Item name…`. The inline editor's `Edit item quantity` was
  not used.
- Initial DOM: `<input aria-label="Item quantity" type="text" value="1"
  inputmode="numeric" pattern="[0-9]*" enterkeyhint="next" …>`.
- Headed Chrome UA, without an override:
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36`.
- `innerWidth=367`, `innerHeight=599`, narrow media query `true`.
- The edit component's first hook state (the responsive-mode state) was `true`.
- After entering name `Quantity Enter QA` and quantity `4`, typing `e` and `E`
  separately left the quantity at `4`. Other letters/signs/decimal points and
  invalid whole values also left it unchanged. Actual Chromium clipboard paste
  of `1e3` was rejected.
- Native keydown reached the quantity field with `key="Enter"`, value `4`.
  A diagnostic wrapper delegating to its original React handler recorded exactly
  one handler entry and exit, with `defaultPrevented=true` on exit. Its original
  served function calls `preventDefault()`, `stopPropagation()`, then the add action.
- The uninstrumented regression suite independently confirmed the result:
  the store contained two items (the original and exactly one new item at quantity 4),
  the row reset to blank name/price and quantity `1`, and the blank name held focus.
  Another Enter on the empty name did not duplicate the item.
- The editor stayed open. Unsaved list-name metadata was deliberately changed;
  the persisted list retained its original name, proving Enter did not save it.

## Repeatable coverage

Run `npx playwright test --config playwright.shopping-preview.config.ts --headed`.
The default target is the stable branch Preview. `SHOPPING_QA_URL` can select
localhost or another SeMa Preview URL.

Nine headed-browser cases passed:

1. Desktop Chrome: create and edit, normal desktop UA, 367 × 599.
2. Generic mobile viewport metrics with a desktop UA, no device preset: create and edit.
3. WebKit with an iPhone preset: create and edit.
4. Android: create and edit retain the existing number-input/name-Enter behavior.
5. Desktop: resize an already-open editor from 1280 × 800 to 367 × 599;
   the hook activates and quantity validation/Enter/focus work without reload.

The required desktop assertions never depend on the device-detection result.
The Android regression is selected explicitly by test project, not by evaluating
the hook under investigation. All account/list responses are synthetic; non-GET
requests, API calls and WebSockets cannot reach live backends. Each test uses a
fresh context. No real account, cache, credential or Supabase row was modified.

TypeScript, six Shopping component tests, lint and the optimized build passed.
Lint reports existing image and hook warnings. The initial component-test launch
was blocked by sandbox directory access; it passed with the necessary execution
permission. Initial create-list browser attempts failed at an ambiguous/transient
empty-state button selector; the final tests use the stable top creation control.

## Earlier verification gap and remaining uncertainty

The older browser test used the development-only fixture shell, predominantly
iPhone UA presets, and branches that permitted number inputs and inert quantity
Enter when its own device predicate was false. That could conceal a regression.
The new suite exercises the actual deployed route with unconditional desktop
requirements. This testing gap does not establish why the user's tab failed.

The known differences from the user's described setup are a new isolated profile,
synthetic account/list responses, and Playwright viewport/mobile-metrics emulation
rather than a manually opened DevTools device toolbar. There is no supplied
screenshot or failing-tab DOM/UA/viewport capture in this conversation to compare.
The Windows Computer Use helper previously refused UI automation because it could
not determine the browser URL reliably; this is a tooling restriction, not an
application diagnosis. Subsequent testing used explicitly authorized, isolated
Playwright sessions at an explicit URL and did not attach to the user's browser.

The next discriminating evidence is the failing tab's `navigator.userAgent`,
`innerWidth`, exact top quantity input DOM/type and loaded Shopping chunk URL.
Do not attribute the discrepancy to detection, caching or deployment without
that evidence. Do not clear real caches as a workaround.
