# API Compatibility

No backend change was made or requested. The Next app calls the **same** base URL and endpoints as the Flutter app (`lib/config.ts` mirrors `lib/core/constant/api_constants`).

- Base: `https://api.saborly.es/api/v1`; sockets: `https://api.saborly.es`.
- Headers (same as `ApiService`): `Content-Type`, `X-Language`, `X-Branch-Id`, `Authorization: Bearer <token>`; `lang` query on GETs; 5-minute GET cache.
- Endpoints: `/auth/{login,register,logout,refresh,profile,change-password,forgot-password,verify-reset-otp,reset-password,resend-reset-otp,verify-registration,resend-registration-otp,google-signin-web,account}`, `/categories`, `/food-items[/:id]`, `/orders[/:id][/tracking]`, `/orders/first-order-discount/check`, `/branches`, `/addresses[...]` (autocomplete, place-details, reverse-geocode-public, validate), `/reviews/google`, `/settings/public`, `/contact`, banners/offers/videos endpoints used by Home/Offers.
- Auth semantics preserved: token + user stored under the same `flutter.*` localStorage keys, 24h expiry timer, 5-min refresh buffer, 7-day inactivity, protected routes `/checkout`, `/payment`, `/profile`.
- Realtime: `join_order_tracking` / `leave_order_tracking`, events `order:location_update`, `order:status_changed`, `order:driver_*`, `order:tracking_error`; REST polling fallback every 5 s, as in `OrderTrackingProvider`.
- Secrets: none added client-side beyond what the Flutter web bundle already ships (Google OAuth web client id).

## Open items needing external action (not done — require approval)
1. **CORS / origin allow-list**: the API must accept the new site origin if it is hosted on a different origin than the current Flutter web app. Not verified against production from a new origin; no backend change was attempted.
2. **Google Sign-In (GSI)**: the new origin must be whitelisted as an *Authorized JavaScript origin* in Google Cloud for the web client id.
3. **Google Maps (tracking screen)**: the Flutter web build ships no Maps JS script/key, so the map area is blank in Flutter web; the port matches that (no key was invented).

Not exercised end-to-end in this session: authenticated flows against production (login, order placement, payment) — no test credentials were used and no orders were created.
