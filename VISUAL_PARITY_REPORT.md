# Visual Parity Report

Method: `e2e/visual.mjs <route>` (Playwright/Chromium) screenshots the **fresh Flutter web build** (isolated copy, :8083) and the Next dev server (:3100) at the same viewport and diffs them with pixelmatch (threshold 0.15). Output in `visual-report/` (`*-flutter.png`, `*-next.png`, `*-diff.png`).

## Measured results (latest run)
| Screen | 1440×900 | 390×844 |
|---|---|---|
| Login | 0.26 % | 2.53 % |
| About | 1.72 % | 4.97 % (before last tweak) |
| Home, Menu, Branch selection, Cart | compared during earlier phases at 1440 (and 390 for branch); residual differences were text rendering | — |

Other screens (Signup, Forgot/Reset, Change password, OTP, Profile, Contact, Offers, Notifications, FAQ, Privacy, Search, Orders, Order status/tracking, Checkout, Payment, Food detail) were **not** screenshot-compared in this session; Orders/Order status/Tracking/Profile/Checkout/Payment need an authenticated session or real orders. Viewports 1920/1024/768/375 were not run. These gaps are real; parity for them is unverified.

## Fixes found through comparison
- Text fields: Flutter's outline border takes no layout space; prefix/suffix icons have a min 48 px box; heights now match (login field 48 px).
- Buttons: CustomButton text renders in the theme's w800 face.
- Shell: cart total / account label sit inside `Material` so they use Manrope, not the AppBar's Bree Serif.
- `ScreenBar` titles use Bree Serif (AppBar titleTextStyle).

## Known, accepted rendering differences
- CanvasKit text is ~2–5 % wider/heavier than DOM text at equal weight; sub-pixel anti-aliasing differs, which dominates remaining diff percentages.
- Plain Flutter `Text` draws with the theme's single Manrope w500 face (weights ≤ 600 look like 500). Handled by using weight 500 in the new screens (measured via ink coverage); not re-verified on older screens.
- Emoji glyphs differ (Noto Color Emoji vs system); no pull-to-refresh; browser Back works where Flutter's `PopScope` would intercept.
- Google button logo: Flutter's remote image fails on web (CORS) and falls back to an icon; the port renders the same fallback.
