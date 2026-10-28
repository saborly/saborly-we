# Functional Test Report

## Executed in this session
| Check | Command | Result |
|---|---|---|
| Typecheck (strict) | `npx tsc --noEmit -p .` | pass |
| Lint | `npx next lint` | pass (no warnings/errors); `no-explicit-any` disabled deliberately for untyped backend JSON (Dart `dynamic`) |
| Unit / parity tests | `npm test` (vitest, `tests/parity.test.ts`) | 14/14 pass: delivery fee & haversine, order time-remaining & status flow, timeago, order-card date formatting, signup password rules, dart2js hash determinism |
| Production build | `NEXT_DIST_DIR=.next-build npx next build` | pass, 27 routes (run before the final visual/font tweaks; re-run before release) |
| Visual comparison | `e2e/visual.mjs` | see `VISUAL_PARITY_REPORT.md` |

## Not executed (honest gaps)
- Dart↔TS **oracle** tests: expected values were derived by hand from the Dart code, not produced by running Dart. Generating fixtures from a Dart run is recommended.
- Playwright functional/e2e flows (login → add to cart → checkout → order, language/RTL switching, responsive matrix): not written/run. Flows that create orders or hit auth need test credentials and a non-production API, which were not provided.
- Authenticated screens (profile, orders, order status/tracking, checkout, payment) were only compiled and type-checked.
