// Ported from lib/core/constant/api_constants.dart + lib/core/config/app_config.dart
export const API_BASE_URL = "https://api.saborly.es/api/v1";
export const SOCKET_URL = "https://api.saborly.es";

export const API = {
  googleSignInWeb: "/auth/google-signin-web",
  login: "/auth/login",
  register: "/auth/register",
  changePassword: "/auth/change-password",
  logout: "/auth/logout",
  deleteAccount: "/auth/account",
  refreshToken: "/auth/refresh",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  resendResetOTP: "/auth/resend-reset-otp",
  verifyResetOTP: "/auth/verify-reset-otp",
  verifyRegistration: "/auth/verify-registration",
  resendRegistrationOTP: "/auth/resend-registration-otp",
  googleSignIn: "/auth/google-signin",
  appleSignIn: "/auth/apple-signin",
  profile: "/auth/profile",
  categories: "/categories",
  foodItems: "/food-items",
  orders: "/orders",
  branches: "/branches",
} as const;

export const APP_CONFIG = {
  appName: "Saborely",
  deliveryFee: 0,
  taxRate: 0,
  // Public (publishable) key, copied from app_config.dart
  stripePublishableKey:
    "pk_test_51RPM9TRrTfHc97PXAZ5IxGY6vtzWCsIwJIMhZNEVjkrwVUNJPuSuHX24yEG9Rtfc7wC91ekp3n4qaFuEWFAQiec3006UoRdV6G",
} as const;

// Timeouts from ApiService.initialize() (connect 10s, receive 15s)
export const REQUEST_TIMEOUT_MS = 15000;
export const CACHE_TTL_MS = 5 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 50;

// AuthProvider constants
export const GOOGLE_WEB_CLIENT_ID =
  "130218217091-ta95bq5pq3b38aqdlr158m6q6umug720.apps.googleusercontent.com";
export const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
export const TOKEN_VALIDATION_INTERVAL_MS = 5 * 60 * 1000;
export const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;
