# Migration Summary

**Scope:** Flutter web → Next.js 14 (App Router, TS strict) in `nextjs-web/`, no redesign, no backend/Flutter changes, nothing deployed.

## Delivered
- Independent app (`npm install && npm run dev|build|start|test|lint`), all routes listed in `FEATURE_PARITY_MATRIX.md`, API/auth/storage compatible with the Flutter app, i18n (5 languages, RTL), icons/fonts/assets copied.
- Docs: MIGRATION_AUDIT, FEATURE_PARITY_MATRIX, API_COMPATIBILITY, VISUAL_PARITY_REPORT, FUNCTIONAL_TEST_REPORT, EXISTING_APP_INTEGRITY, this file.
- Existing project verified untouched (`EXISTING_APP_INTEGRITY.md`).

## Status against the definition of done
- All screens migrated: **yes**, except documented non-routed/native-only ones.
- Tests pass: typecheck, lint, 14 unit tests, `next build` pass. **Playwright e2e and Dart-oracle tests are not done.**
- Visual parity: measured only for a few screens (login 0.26 %, about 1.7 % at 1440); most others unverified. **Parity is not claimed.**
- Existing apps untouched: **yes**.

## Known deviations
1. Food detail uses `?id=` (query) so reload works; Flutter used `extra` only.
2. Order tracking map is blank (Flutter web build has no Maps script); markers/ETA/driver panel ported.
3. No pull-to-refresh; browser Back is not intercepted (Flutter `PopScope` toast-to-exit is native-only behaviour).
4. CanvasKit-vs-DOM text rendering and emoji glyph differences.
5. Flutter bug preserved: "undo" on add-to-cart removes by food id; reset-password screen simulates its API call (2 s delay).
6. Missing translation keys fall back to the key text, exactly like `AppStrings.get` (e.g. `welcomeBack`, `found`, `clear`).

## Needs your decision / external action
- Whitelist the new origin for Google Sign-In and confirm API CORS (see `API_COMPATIBILITY.md`). No backend change was made.
- Provide a test account / staging API if authenticated e2e and visual checks should be completed.
- Deployment is intentionally not done.

## Suggested next steps
Run `visual.mjs` over every route at the six viewports, add Playwright flows, generate Dart-oracle fixtures, re-run `next build`.
