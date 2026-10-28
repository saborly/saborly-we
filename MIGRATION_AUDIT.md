# Migration Audit

Source of truth: the Flutter web app (`lib/`, `web/`). Target: `nextjs-web/` (Next.js 14 App Router, TypeScript strict, independent `package.json`).

## Architecture mapping
| Flutter | Next.js |
|---|---|
| Provider/ChangeNotifier | tiny external stores (`lib/store.ts`, `useSyncExternalStore`), per-feature in `lib/stores/*` |
| go_router + ShellRoute(MainLayout) | App Router; `app/(shell)/*` = shell screens, top-level routes for screens outside the shell (`/`, `/branch-select`, `/search`, `/email-verification`, `/order-status/[id]`, `/order-tracking/[id]`) |
| `extra` | in-memory + sessionStorage (`lib/nav.ts`) |
| flutter_screenutil | `lib/screenutil.tsx` (same design sizes, w/h/r/sp rules) |
| shared_preferences (web) | localStorage `flutter.<key>` with JSON values (`lib/storage.ts`) — existing keys are read as-is |
| ApiService / http | `lib/api.ts` (same endpoints, headers, 5-min GET cache, `lang` query) |
| socket_io_client | `socket.io-client` (`lib/tracking.ts`) |
| Material icons | MaterialIcons font + codepoint table (8,825 icons, RTL mirroring) |
| GoogleFonts | `next/font` (Manrope, Bree Serif, Poppins, Roboto) |
| AppStrings (4 languages) | extracted verbatim into `lib/i18n/translations.json` incl. key-fallback behaviour |

## Business logic ported 1:1
Models/parsers, cart price math (incl. quirks), delivery fee + haversine, Spain-timezone opening hours, auth timers (24h token, 5-min refresh buffer, 7-day inactivity), offers/device-discount manager, order status flows, time-remaining rules, notification persistence, password validation rules, dart2js `String.hashCode` for category colours.

## Screens migrated
Branch selection, Home, Menu, Items grid (featured/popular), Food detail, Cart, Checkout, Payment, Order status, Order tracking, Order history, Login, Signup, Forgot password, Reset password, Change password, Email OTP verification, Profile, About, Contact, Offers, Notifications, FAQ, Privacy, Search, not-found, error boundary. See `FEATURE_PARITY_MATRIX.md`.

## Not migrated (and why)
- `SplashScreen` (mobile only; web root renders `BranchSelectionScreen`) and the maintenance screen (disabled in `main.dart`).
- `FeaturedItemsPage.dart`: not referenced by any route (dead code); the routed "featured" page is `ItemsGridPage`.
- Native-only code paths (Apple sign-in, back-to-exit snackbars, FCM).

## Deviations / open items
See `MIGRATION_SUMMARY.md` ("Known deviations") — documented individually, none hidden.
