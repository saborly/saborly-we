"use client";
import { api } from "../api";
import {
  GOOGLE_WEB_CLIENT_ID, INACTIVITY_LIMIT_MS, TOKEN_LIFETIME_MS, TOKEN_REFRESH_BUFFER_MS, TOKEN_VALIDATION_INTERVAL_MS,
} from "../config";
import { User } from "../models";
import { prefs } from "../storage";
import { Store, useStore } from "../store";

// Port of AuthProvider (lib/features/providers/auth_proveder.dart)
interface AuthState {
  user: User | null; isLoading: boolean; error: string | null; requiresVerification: boolean;
  pendingVerificationEmail: string | null; isSocialLoading: boolean; resetToken: string | null; checked: boolean;
}
export const authStore = new Store<AuthState>({
  user: null, isLoading: false, error: null, requiresVerification: false, pendingVerificationEmail: null,
  isSocialLoading: false, resetToken: null, checked: false,
});

let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let validationTimer: ReturnType<typeof setInterval> | null = null;
const set = authStore.set.bind(authStore);
const setLoading = (isLoading: boolean) => set({ isLoading });
const setError = (error: string | null) => set({ error });
const setRequiresVerification = (requiresVerification: boolean, email: string | null = null) =>
  set({ requiresVerification, pendingVerificationEmail: email });
const cancelTimers = () => {
  if (expiryTimer) clearTimeout(expiryTimer);
  if (validationTimer) clearInterval(validationTimer);
  expiryTimer = validationTimer = null;
};

function saveUserData() {
  const u = authStore.state.user;
  if (!u) return;
  prefs.set("user_id", u.id); prefs.set("firstName", u.firstName); prefs.set("lastName", u.lastName);
  prefs.set("email", u.email); prefs.set("phone", u.phone); prefs.set("auth_token", u.token ?? "");
  prefs.set("last_activity", Date.now());
  prefs.set("token_expiry", Date.now() + TOKEN_LIFETIME_MS);
}
function clearUserData() {
  for (const k of ["user_id", "firstName", "lastName", "email", "phone", "auth_token", "token_expiry", "last_activity"]) prefs.remove(k);
  api.clearAuthToken();
}

function setupTokenExpiryTimer() {
  cancelTimers();
  const expiry = prefs.getInt("token_expiry");
  if (expiry == null) return;
  const now = Date.now();
  if (expiry < now) { void handleTokenExpiry(); return; }
  const refreshIn = expiry - now - TOKEN_REFRESH_BUFFER_MS;
  if (refreshIn < 0) void refreshToken();
  else expiryTimer = setTimeout(() => void refreshToken(), refreshIn);
  validationTimer = setInterval(() => void validateToken(), TOKEN_VALIDATION_INTERVAL_MS);
}
async function refreshToken() {
  const u = authStore.state.user;
  if (!u) return;
  try {
    const r = await api.refreshToken();
    if (r.isSuccess && r.data) {
      set({ user: { ...u, token: r.data } }); saveUserData(); setupTokenExpiryTimer();
    } else await handleTokenExpiry();
  } catch { await handleTokenExpiry(); }
}
async function handleTokenExpiry() {
  setError("Your session has expired. Please login again.");
  clearUserData(); set({ user: null }); setRequiresVerification(false); cancelTimers();
}
export async function validateToken() {
  const expiry = prefs.getInt("token_expiry");
  if (expiry == null) return;
  const now = Date.now();
  if (now + TOKEN_REFRESH_BUFFER_MS > expiry) { await refreshToken(); return; }
  if (expiry < now) await handleTokenExpiry();
}

export async function checkAuthStatus() {
  setLoading(true);
  try {
    const token = prefs.getString("auth_token");
    if (token != null) {
      const last = prefs.getInt("last_activity");
      if (last != null && last < Date.now() - INACTIVITY_LIMIT_MS) {
        clearUserData(); set({ user: null }); setError("Session expired due to inactivity. Please login again.");
        return;
      }
      prefs.set("last_activity", Date.now());
      const expiry = prefs.getInt("token_expiry");
      if (expiry != null && Date.now() > expiry) { await refreshToken(); return; }
      api.setAuthToken(token);
      const id = prefs.getString("user_id"), fn = prefs.getString("firstName"), ln = prefs.getString("lastName"),
        email = prefs.getString("email"), phone = prefs.getString("phone");
      if (id != null && fn != null && ln != null && email != null && phone != null) {
        set({ user: { id, firstName: fn, lastName: ln, email, phone, token } });
        setupTokenExpiryTimer();
      }
    }
  } catch { setError("Failed to check authentication"); }
  finally { setLoading(false); set({ checked: true }); }
}

async function onAuthSuccess(user: User, opts: { clearCache?: boolean } = {}) {
  set({ user }); saveUserData(); setupTokenExpiryTimer();
  if (opts.clearCache) api.clearCache();
}

export async function signIn(email: string, password: string): Promise<boolean> {
  setLoading(true); setError(null); setRequiresVerification(false);
  try {
    const r = await api.login(email, password);
    if (r.isSuccess && r.data) { await onAuthSuccess(r.data, { clearCache: true }); setLoading(false); return true; }
    setError(r.error ?? "Login failed"); setLoading(false); return false;
  } catch { setError("Login error occurred"); setLoading(false); return false; }
}

export async function signUp(firstName: string, lastName: string, email: string, phone: string, password: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.register({ firstName, lastName, email, phone, password });
    if (r.isSuccess) {
      if (r.rawData?.requiresVerification) setRequiresVerification(true, email);
      else if (r.data) await onAuthSuccess(r.data);
      setLoading(false); return true;
    }
    setError(r.error ?? "Registration failed"); setLoading(false); return false;
  } catch { setError("Registration error"); setLoading(false); return false; }
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.verifyOTP(email, otp);
    if (r.isSuccess && r.data) { await onAuthSuccess(r.data); setRequiresVerification(false); setLoading(false); return true; }
    setError(r.error ?? "Invalid OTP"); setLoading(false); return false;
  } catch { setError("Verification error"); setLoading(false); return false; }
}

export async function signOut() {
  setLoading(true);
  try {
    cancelTimers();
    await api.logout();
  } catch { /* fall through to local cleanup, as Dart does */ }
  clearUserData(); set({ user: null }); setRequiresVerification(false); api.clearCache(); setLoading(false);
}

export async function deleteAccount(): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.deleteAccount();
    if (r.isSuccess) {
      cancelTimers(); clearUserData(); set({ user: null }); setRequiresVerification(false); api.clearCache();
      setLoading(false); return true;
    }
    setError(r.error ?? "Failed to delete account"); setLoading(false); return false;
  } catch { setError("Account deletion error"); setLoading(false); return false; }
}

export async function changePassword(p: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    if (p.newPassword !== p.confirmPassword) { setError("Passwords do not match"); setLoading(false); return false; }
    if (p.newPassword.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return false; }
    const r = await api.changePassword(p);
    if (r.isSuccess) {
      const tok = api.getAuthToken(), u = authStore.state.user;
      if (tok && u) { set({ user: { ...u, token: tok } }); saveUserData(); setupTokenExpiryTimer(); }
      setLoading(false); return true;
    }
    setError(r.error ?? "Failed to change password"); setLoading(false); return false;
  } catch { setError("Password change error"); setLoading(false); return false; }
}

export async function updateProfile(firstName: string, lastName: string, phone: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.updateProfile({ firstName, lastName, phone });
    if (r.isSuccess && r.data) { set({ user: r.data }); saveUserData(); setLoading(false); return true; }
    setError("Profile update failed"); setLoading(false); return false;
  } catch { setError("Profile update error"); setLoading(false); return false; }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  setLoading(true); setError(null);
  try { const r = await api.requestPasswordReset(email); setLoading(false); return r.isSuccess; }
  catch { setError("Error requesting reset"); setLoading(false); return false; }
}
export async function verifyPasswordResetOTP(email: string, otp: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.verifyResetOTP(email, otp);
    if (r.isSuccess && r.data) { set({ resetToken: r.data }); setLoading(false); return true; }
    setError(r.error ?? "Invalid OTP"); setLoading(false); return false;
  } catch { setError("Verification error"); setLoading(false); return false; }
}
export async function resetPassword(p: { email: string; newPassword: string; confirmPassword: string }): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const token = authStore.state.resetToken;
    if (token == null) { setError("Verify OTP first"); setLoading(false); return false; }
    if (p.newPassword !== p.confirmPassword) { setError("Passwords do not match"); setLoading(false); return false; }
    if (p.newPassword.length < 6) { setError("Password too short"); setLoading(false); return false; }
    const r = await api.resetPassword({ email: p.email, resetToken: token, newPassword: p.newPassword, confirmPassword: p.confirmPassword });
    if (r.isSuccess && r.data) { await onAuthSuccess(r.data); set({ resetToken: null }); setLoading(false); return true; }
    setError(r.error ?? "Reset failed"); setLoading(false); return false;
  } catch { setError("Reset error"); setLoading(false); return false; }
}
export async function resendOTP(email: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.resendOTP(email);
    if (r.isSuccess) { setLoading(false); return true; }
    setError(r.error ?? "Failed to send OTP"); setLoading(false); return false;
  } catch { setError("An error occurred. Please try again."); setLoading(false); return false; }
}
export async function resendPasswordResetOTP(email: string): Promise<boolean> {
  setLoading(true); setError(null);
  try {
    const r = await api.resendResetOTP(email);
    if (r.isSuccess) { setLoading(false); return true; }
    setError(r.error ?? "Failed to send OTP"); setLoading(false); return false;
  } catch { setError("An error occurred. Please try again."); setLoading(false); return false; }
}

// --- Google Sign-In (web): google_sign_in_web == Google Identity Services OAuth token flow, then
// userinfo -> POST /auth/google-signin-web, exactly as AuthProvider.signInWithGoogle does when kIsWeb.
declare global { interface Window { google?: any } }
function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error("gsi"));
    document.head.appendChild(s);
  });
}
function getGoogleAccessToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: "email https://www.googleapis.com/auth/userinfo.profile",
      callback: (resp: any) => (resp?.access_token ? resolve(resp.access_token) : resolve(null)),
      error_callback: (err: any) => (err?.type === "popup_closed" ? resolve(null) : reject(err)),
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}
export async function signInWithGoogle(): Promise<boolean> {
  set({ isSocialLoading: true, isLoading: true, error: null });
  const done = (ok: boolean) => { set({ isSocialLoading: false, isLoading: false }); return ok; };
  try {
    await loadGsi();
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return done(false); // user closed the popup
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.status !== 200) throw new Error(`userinfo ${res.status}`);
      const info = await res.json();
      const parts = String(info.name ?? "").split(" ");
      const r = await api.googleSignInWeb({
        email: info.email, firstName: info.given_name ?? (info.name ? parts[0] : "User"),
        lastName: info.family_name ?? (info.name ? parts[parts.length - 1] : ""), googleId: info.id, accessToken,
      });
      if (r.isSuccess && r.data) { await onAuthSuccess(r.data); return done(true); }
      setError(r.error ?? "Google sign-in failed on server"); return done(false);
    } catch { setError("Failed to get user information from Google"); return done(false); }
  } catch (e) {
    const msg = String((e as any)?.message ?? e);
    setError(msg.includes("SIGN_IN_REQUIRED") ? "Please try signing in again"
      : msg.includes("network") ? "Network error. Please check your connection"
      : msg.includes("PERMISSION_DENIED") ? "Please enable People API in Google Cloud Console"
      : "Google sign-in error occurred");
    return done(false);
  }
}

export const clearError = () => setError(null);
export const clearVerificationState = () => setRequiresVerification(false);
export const clearResetToken = () => set({ resetToken: null });
export const useAuth = () => {
  const s = useStore(authStore);
  return { ...s, isAuthenticated: s.user != null };
};
