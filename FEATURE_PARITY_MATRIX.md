# Feature Parity Matrix

Status: ✅ ported & verified as stated · 🟡 ported, verification partial · ⛔ not applicable. "Verification": **V** = side-by-side screenshot vs live Flutter build run; **T** = unit test; **B** = `next build` compiles route; **—** = not run.

| Feature | Flutter source | Next.js implementation | Status | Verification |
|---|---|---|---|---|
| Branch selection (root) | `features/home/screens/branch_selection_screen.dart` | `components/screens/BranchSelection.tsx`, `app/branch-select`, `app/page.tsx` | ✅ | V, B |
| Home (hero, categories, offers, reviews, reels, footer) | `home_screen.dart`, `home/widgets/*` | `HomeScreen.tsx`, `components/home/*` | ✅ | V (1440), B |
| Menu + filters | `menu_screen.dart` | `MenuScreen.tsx` | ✅ | V (1440), B |
| Featured / popular grid | `itemsgrid.dart` | `ItemsGridPage.tsx`, `/items/[type]` | ✅ | B |
| Food detail | `food_detail_screen.dart` | `FoodDetailScreen.tsx` | 🟡 `?id=` query added (see deviations) | B |
| Cart | `cart_screen.dart` | `CartScreen.tsx` | ✅ | V, B |
| Checkout + address dialog | `checkout_screen.dart` | `CheckoutScreen.tsx`, `AddressDialog.tsx` | 🟡 | B |
| Payment | `payment_scree.dart` | `PaymentScreen.tsx` | 🟡 | B |
| Order status | `order_status.dart` | `OrderStatusScreen.tsx`, `lib/orderStatus.ts` | 🟡 | T, B |
| Order tracking | `order_tracking_screen.dart` | `OrderTrackingScreen.tsx`, `lib/tracking.ts` | 🟡 map blank like Flutter web | B |
| Order history | `order_history.dart` + widgets | `OrderHistoryScreen.tsx` | 🟡 | T, B |
| Login (+Google web flow) | `login_screen.dart` | `LoginScreen.tsx` | ✅ | V 0.26% @1440, 2.5% @390; B |
| Signup | `signup_screen.dart` + widgets | `SignupScreen.tsx` | 🟡 | B (screenshots not archived) |
| Forgot password | `authforgot.dart` | `ForgotPasswordScreen.tsx` | 🟡 | B |
| Reset password (simulated 2 s, as Flutter) | `authreset.dart` | `ResetPasswordScreen.tsx` | 🟡 | B |
| Change password | `changeword.dart` | `ChangePasswordScreen.tsx` | 🟡 | B |
| Email OTP verification | `eemailVerificationScreen.dart` | `EmailVerificationScreen.tsx` | 🟡 | B |
| Profile (+dialogs) | `profile_screen.dart` + widgets | `ProfileScreen.tsx`, `profile/dialogs.tsx` | 🟡 | B |
| About | `AboutUsScreen.dart` | `AboutScreen.tsx` | 🟡 1.7% @1440 | V, B |
| Contact | `theContactScreen.dart` + widgets | `ContactScreen.tsx` | 🟡 | B |
| Offers | `offersScreen.dart` + widgets | `OffersScreen.tsx` | 🟡 | B |
| Notifications | `notifications_screen.dart` + widgets | `NotificationsScreen.tsx` | 🟡 | B |
| FAQ / Privacy | `ourfaq.dart`, `ourprivacy.dart` | `FaqScreen.tsx`, `PrivacyScreen.tsx`, `GradientHero.tsx` | 🟡 | B |
| Search results | `search_results_page.dart` | `SearchResultsPage.tsx` | 🟡 | B |
| Not-found / error widget | router `errorBuilder`, `app_error_widget.dart` | `app/not-found.tsx`, `app/error.tsx` | ✅ | B |
| i18n (es/en/ca/ar/fr, RTL) | `app_strings.dart` | `lib/i18n/*` | ✅ | — |
| Delivery fee / haversine | `checkout_provider.dart` | `lib/delivery.ts` | ✅ | T |
| Order time remaining / status flow | `order_status_helpers.dart` | `lib/orderStatus.ts` | ✅ | T |
| Category colour hash | dart2js `String.hashCode` | `lib/dart.ts` | ✅ | T (determinism only; no Dart oracle run) |
| Splash / maintenance / FeaturedItemsPage | — | not migrated | ⛔ | see audit |

"🟡" screens compile, typecheck and lint, and were written from a full read of the Dart source, but were **not** pixel-compared against Flutter in this run (see `VISUAL_PARITY_REPORT.md`). No claim of 100 % parity is made.
