// Port of lib/core/services/api_service.dart (Dio -> fetch). Same endpoints, headers, query params,
// 5-minute GET cache (non-/auth/), error classification and ApiResponse semantics.
import {
  API, API_BASE_URL, CACHE_MAX_ENTRIES, CACHE_TTL_MS, REQUEST_TIMEOUT_MS,
} from "./config";
import {
  CartItem, DeliveryAddress, FoodCategory, FoodItem, Order, User, deliveryAddressFromMap,
  foodCategoryFromMap, foodItemFromMap, orderFromMap, userFromMap,
} from "./models";
import { prefs } from "./storage";

export type ApiErrorType = "noConnection" | "timeout" | "serverDown" | "clientError" | "cancelled" | "unknown";

export class ApiResponse<T> {
  constructor(
    public isSuccess: boolean,
    public data: T | null = null,
    public error: string | null = null,
    public statusCode?: number,
    public rawData?: Record<string, any> | null,
    public errorType: ApiErrorType = "unknown",
  ) {}
  static success<T>(data: T | null, o: { rawData?: Record<string, any>; statusCode?: number } = {}) {
    return new ApiResponse<T>(true, data, null, o.statusCode, o.rawData ?? null);
  }
  static fail<T>(error: string, statusCode?: number, errorType: ApiErrorType = "unknown") {
    return new ApiResponse<T>(false, null, error, statusCode, null, errorType);
  }
  get isConnectionOrServerError() {
    return this.errorType === "noConnection" || this.errorType === "serverDown" || this.errorType === "timeout";
  }
}

class HttpError extends Error {
  constructor(public kind: "timeout" | "connection" | "bad-response" | "cancel", public status = 0, public body: any = null) {
    super(kind);
  }
}

/** ApiErrorClassifier.classify */
export function classifyError(e: unknown): { type: ApiErrorType; message: string } {
  const err = e instanceof HttpError ? e : new HttpError("connection");
  switch (err.kind) {
    case "timeout":
      return { type: "timeout", message: "This is taking longer than expected. Please check your connection and try again." };
    case "connection":
      return { type: "noConnection", message: "No internet connection. Please check your network and try again." };
    case "cancel":
      return { type: "cancelled", message: "Request was cancelled." };
    case "bad-response": {
      const msg = err.body && typeof err.body === "object" ? err.body.message : null;
      if (err.status >= 500)
        return { type: "serverDown", message: "Our servers are temporarily unavailable. Please try again in a moment." };
      return { type: "clientError", message: msg ?? `Request failed (${err.status === 0 ? "unknown" : err.status}).` };
    }
  }
}

interface Resp { status: number; data: any }
type Query = Record<string, string | number | boolean | undefined | null>;

class ApiService {
  private authToken: string | null = null;
  private _branchId: string | null = null;
  private language = "es";
  private cache = new Map<string, { data: any; ts: number }>();
  private lastActivity = 0;
  selectedLat: number | null = null;
  selectedLng: number | null = null;
  selectedAddressText: string | null = null;

  get branchId() { return this._branchId; }
  loadBranchFromPrefs() { this._branchId = prefs.getString("branch_id"); }
  setBranchId(id: string) { this._branchId = id; prefs.set("branch_id", id); this.clearCache(); }
  clearBranchId() { this._branchId = null; prefs.remove("branch_id"); this.clearCache(); }

  loadSelectedLocationFromPrefs() {
    this.selectedLat = prefs.getDouble("loc_lat");
    this.selectedLng = prefs.getDouble("loc_lng");
    this.selectedAddressText = prefs.getString("loc_address");
  }
  setSelectedLocation(lat: number, lng: number, addressText?: string) {
    this.selectedLat = lat; this.selectedLng = lng;
    prefs.set("loc_lat", lat); prefs.set("loc_lng", lng);
    if (addressText) { this.selectedAddressText = addressText; prefs.set("loc_address", addressText); }
  }

  setLanguage(code: string) { this.language = code; }
  getCurrentLanguage() { return this.language; }
  setAuthToken(t: string) { this.authToken = t; }
  clearAuthToken() { this.authToken = null; }
  getAuthToken() { return this.authToken; }
  clearCache() { this.cache.clear(); }

  private updateLastActivity() {
    const now = Date.now();
    if (!this.lastActivity || now - this.lastActivity > 60_000) {
      this.lastActivity = now;
      prefs.set("last_activity", now);
    }
  }

  private cacheKey(method: string, path: string, q: Query) {
    // Dart: '${method}:${path}:${queryParameters.toString()}:${branchId ?? ''}'
    return `${method}:${path}:${JSON.stringify(q)}:${this._branchId ?? ""}`;
  }

  /** Interceptor logic from ApiService.initialize() + a fetch with timeout. */
  async request(method: string, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<Resp> {
    const query: Query = { ...(opts.query ?? {}) };
    const headers: Record<string, string> = {
      "Content-Type": "application/json", Accept: "application/json", "X-Language": this.language,
    };
    if (this.authToken) { headers.Authorization = `Bearer ${this.authToken}`; this.updateLastActivity(); }
    if (this._branchId) headers["X-Branch-Id"] = this._branchId;
    query.lang = this.language;

    const cacheable = method === "GET" && !path.includes("/auth/");
    const key = this.cacheKey(method, path, query);
    if (cacheable) {
      const c = this.cache.get(key);
      if (c && Date.now() - c.ts <= CACHE_TTL_MS) return { status: 200, data: c.data };
    }

    // Dart passes "?_t=.." inside the path string; merge raw query part, then append params.
    const [purePath, rawQs] = path.split("?");
    const qs = new URLSearchParams(rawQs ?? "");
    for (const [k, v] of Object.entries(query)) if (v != null) qs.set(k, String(v));
    const url = `${API_BASE_URL}${purePath}${qs.toString() ? `?${qs}` : ""}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method, headers, signal: ctrl.signal,
        body: opts.body !== undefined && method !== "GET" ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e: any) {
      throw new HttpError(e?.name === "AbortError" ? "timeout" : "connection");
    } finally { clearTimeout(timer); }

    let data: any = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    // Dio treats non-2xx as badResponse (validateStatus default)
    if (res.status < 200 || res.status >= 300) throw new HttpError("bad-response", res.status, data);

    if (cacheable && res.status === 200) {
      this.cache.set(key, { data, ts: Date.now() });
      if (this.cache.size > CACHE_MAX_ENTRIES) {
        let oldest: string | null = null, t = Infinity;
        for (const [k, v] of this.cache) if (v.ts < t) { t = v.ts; oldest = k; }
        if (oldest) this.cache.delete(oldest);
      }
    }
    return { status: res.status, data };
  }

  private fromErr<T>(e: unknown, status?: number): ApiResponse<T> {
    const c = classifyError(e);
    return ApiResponse.fail<T>(c.message, e instanceof HttpError ? e.status || undefined : status, c.type);
  }
  private serverMessage(e: unknown): string | null {
    return e instanceof HttpError && e.body && typeof e.body === "object" && e.body.message ? e.body.message : null;
  }
  private userFrom(res: any, phoneFallback = false): User {
    const u = res.user;
    return {
      id: String(u.id), firstName: u.firstName, lastName: u.lastName, email: u.email,
      phone: phoneFallback ? u.phone ?? "" : u.phone, token: res.token,
    };
  }

  // ---------- Catalog ----------
  async getCategories(): Promise<ApiResponse<FoodCategory[]>> {
    try {
      const r = await this.request("GET", API.categories, { query: { lang: this.language } });
      return ApiResponse.success((r.data.categories ?? []).map((j: any) => foodCategoryFromMap(j, this.language)), { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }

  async getPublicSettings() {
    try {
      const r = await this.request("GET", "/settings/public");
      return ApiResponse.success<Record<string, any>>(r.data.settings, { statusCode: r.status });
    } catch (e) { return this.fromErr<Record<string, any>>(e); }
  }

  async getFoodItems(o: { categoryId?: string; featured?: boolean; popular?: boolean; search?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<FoodItem[]>> {
    try {
      const q: Query = { page: o.page ?? 1, limit: o.limit ?? 20, lang: this.language, includeOffers: true };
      if (o.categoryId != null) q.category = o.categoryId;
      if (o.featured != null) q.featured = o.featured;
      if (o.popular != null) q.popular = o.popular;
      if (o.search) q.search = o.search;
      const r = await this.request("GET", API.foodItems, { query: q });
      return ApiResponse.success((r.data.items ?? []).map((j: any) => foodItemFromMap(j, this.language)), { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }

  async getFoodItem(id: string): Promise<ApiResponse<FoodItem>> {
    try {
      const r = await this.request("GET", `${API.foodItems}/${id}`, { query: { lang: this.language, includeOffers: true } });
      return ApiResponse.success(foodItemFromMap(r.data.item, this.language), { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const r = await this.request("GET", "/addresses/reverse-geocode-public", { query: { lat, lng } });
      return r.status === 200 && r.data.success === true ? r.data.address ?? null : null;
    } catch { return null; }
  }

  async fetchGoogleReviews(): Promise<Record<string, any>[]> {
    try {
      const r = await this.request("GET", "/reviews/google");
      if (r.status === 200 && r.data.success === true) {
        const places = r.data.places ?? [];
        if (places.length === 0) for (const k of [...this.cache.keys()]) if (k.includes("/reviews/google")) this.cache.delete(k);
        return places;
      }
      return [];
    } catch { return []; }
  }

  // ---------- Auth ----------
  async login(email: string, password: string): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("POST", API.login, { body: { email, password } });
      const user = this.userFrom(r.data);
      this.setAuthToken(r.data.token);
      return ApiResponse.success(user, { statusCode: r.status });
    } catch (e) {
      if (e instanceof HttpError && e.status === 403)
        return ApiResponse.fail(e.body?.message ?? "Please verify your email", 403);
      return ApiResponse.fail(classifyError(e).message);
    }
  }

  async register(p: { firstName: string; lastName: string; email: string; phone: string; password: string }): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("POST", API.register, { body: p });
      if (r.data?.requiresVerification) return ApiResponse.success<User>(null, { rawData: r.data, statusCode: r.status });
      const user = this.userFrom(r.data);
      this.setAuthToken(r.data.token);
      return ApiResponse.success(user, { rawData: r.data, statusCode: r.status });
    } catch (e) { return ApiResponse.fail(classifyError(e).message); }
  }

  async verifyOTP(email: string, otp: string): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("POST", API.verifyRegistration, { body: { email, otp } });
      const user = this.userFrom(r.data);
      this.setAuthToken(r.data.token);
      return ApiResponse.success(user, { statusCode: r.status });
    } catch (e) {
      return ApiResponse.fail(this.serverMessage(e) ?? classifyError(e).message, e instanceof HttpError ? e.status : undefined);
    }
  }

  async resendOTP(email: string): Promise<ApiResponse<null>> {
    return this.simplePost(API.resendRegistrationOTP, { email });
  }
  async requestPasswordReset(email: string): Promise<ApiResponse<null>> {
    try {
      const r = await this.request("POST", API.forgotPassword, { body: { email } });
      return ApiResponse.success(null, { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }
  async verifyResetOTP(email: string, otp: string): Promise<ApiResponse<string>> {
    try {
      const r = await this.request("POST", API.verifyResetOTP, { body: { email, otp } });
      return ApiResponse.success<string>(r.data.resetToken, { statusCode: r.status });
    } catch (e) {
      return ApiResponse.fail(this.serverMessage(e) ?? classifyError(e).message, e instanceof HttpError ? e.status : undefined);
    }
  }
  async resetPassword(p: { email: string; resetToken: string; newPassword: string; confirmPassword: string }): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("POST", API.resetPassword, { body: p });
      const user = this.userFrom(r.data);
      this.setAuthToken(r.data.token);
      return ApiResponse.success(user, { statusCode: r.status });
    } catch (e) {
      return ApiResponse.fail(this.serverMessage(e) ?? classifyError(e).message, e instanceof HttpError ? e.status : undefined);
    }
  }
  async resendResetOTP(email: string): Promise<ApiResponse<null>> {
    return this.simplePost(API.resendResetOTP, { email });
  }
  private async simplePost(path: string, body: unknown): Promise<ApiResponse<null>> {
    try {
      const r = await this.request("POST", path, { body });
      return ApiResponse.success(null, { statusCode: r.status });
    } catch (e) {
      return ApiResponse.fail(this.serverMessage(e) ?? classifyError(e).message, e instanceof HttpError ? e.status : undefined);
    }
  }

  async googleSignInWeb(p: { email: string; firstName: string; lastName: string; googleId: string; accessToken: string }): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("POST", API.googleSignInWeb, { body: p });
      const user = this.userFrom(r.data, true);
      this.setAuthToken(r.data.token);
      return ApiResponse.success(user, { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }

  async refreshToken(): Promise<ApiResponse<string>> {
    if (!this.authToken) return ApiResponse.fail("No token available for refresh");
    try {
      const r = await this.request("POST", API.refreshToken);
      const t = r.data?.token;
      if (t) { this.setAuthToken(t); return ApiResponse.success<string>(t, { statusCode: r.status }); }
      return ApiResponse.fail("No token in response", r.status);
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) return ApiResponse.fail("Token invalid - login required", 401);
      return this.fromErr(e);
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try { const r = await this.request("POST", API.logout); this.clearAuthToken(); return ApiResponse.success(null, { statusCode: r.status }); }
    catch (e) { this.clearAuthToken(); return this.fromErr(e); }
  }
  async deleteAccount(): Promise<ApiResponse<null>> {
    try { const r = await this.request("DELETE", API.deleteAccount); this.clearAuthToken(); return ApiResponse.success(null, { statusCode: r.status }); }
    catch (e) { return ApiResponse.fail(this.serverMessage(e) ?? classifyError(e).message, e instanceof HttpError ? e.status : undefined); }
  }
  async changePassword(p: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    try {
      const r = await this.request("PATCH", API.changePassword, { body: p });
      if (r.data?.token) this.setAuthToken(r.data.token);
      return ApiResponse.success<Record<string, any>>(r.data, { statusCode: r.status });
    } catch (e) { return this.fromErr<Record<string, any>>(e); }
  }
  async updateProfile(body: Record<string, any>): Promise<ApiResponse<User>> {
    try {
      const r = await this.request("PATCH", API.profile, { body });
      return ApiResponse.success(userFromMap(r.data.user), { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }

  // ---------- Orders ----------
  async createOrder(orderData: Record<string, any>): Promise<ApiResponse<Order>> {
    try {
      const r = await this.request("POST", API.orders, { body: orderData });
      if (r.status === 201 && r.data.order != null)
        return ApiResponse.success(orderFromMap(r.data.order), {
          statusCode: r.status,
          rawData: { firstOrderDiscountApplied: r.data.firstOrderDiscountApplied ?? false, discountAmount: r.data.discountAmount },
        });
      return ApiResponse.fail("Failed to create order: Invalid response", r.status);
    } catch (e) {
      if (e instanceof HttpError && e.kind === "bad-response")
        return ApiResponse.fail(`Failed to create order: ${e.body?.message ?? "request failed"}`, e.status);
      return ApiResponse.fail("Network error: " + (e as Error).message);
    }
  }
  async checkFirstOrderDiscount(deviceId: string): Promise<Record<string, any>> {
    try {
      const r = await this.request("GET", `${API.orders}/first-order-discount/check`, { query: { deviceId } });
      return r.status === 200 ? r.data : { eligible: false };
    } catch { return { eligible: false }; }
  }
  async getOrders(page = 1, limit = 20): Promise<ApiResponse<Order[]>> {
    try {
      const r = await this.request("GET", API.orders, { query: { page, limit } });
      return ApiResponse.success((r.data.orders ?? []).map(orderFromMap), { statusCode: r.status });
    } catch (e) { return this.fromErr(e); }
  }
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    try {
      const r = await this.request("GET", `${API.orders}/${id}?_t=${Date.now()}`);
      if (!r.data || r.data.order == null) return ApiResponse.fail("No order found in response", r.status);
      return ApiResponse.success(orderFromMap(r.data.order), { statusCode: r.status });
    } catch (e) { return ApiResponse.fail(`Error fetching order: ${classifyError(e).message}`); }
  }
  async getOrderTracking(orderId: string): Promise<ApiResponse<Record<string, any>>> {
    try {
      const r = await this.request("GET", `${API.orders}/${orderId}/tracking?_t=${Date.now()}`);
      if (r.data?.tracking != null) return ApiResponse.success<Record<string, any>>(r.data.tracking, { statusCode: r.status });
      return ApiResponse.fail(r.data?.message ?? "Failed to fetch tracking info", r.status);
    } catch (e) { return this.fromErr(e); }
  }

  // ---------- Addresses ----------
  async getPlaceDetails(placeId: string) {
    try {
      const r = await this.request("GET", "/addresses/place-details", { query: { place_id: placeId } });
      if (r.status === 200 && r.data.status === "OK") return ApiResponse.success<Record<string, any>>(r.data.result);
      return ApiResponse.fail<Record<string, any>>(r.data.error_message ?? "Failed to fetch place details", r.status);
    } catch (e) { return this.fromErr<Record<string, any>>(e); }
  }
  async getAddressAutocomplete(input: string) {
    try {
      const r = await this.request("GET", "/addresses/autocomplete", { query: { input } });
      return ApiResponse.success<Record<string, any>[]>(r.data.predictions ?? []);
    } catch (e) { return this.fromErr<Record<string, any>[]>(e); }
  }
  async getSavedAddresses(): Promise<ApiResponse<DeliveryAddress[]>> {
    try {
      const r = await this.request("GET", "/addresses");
      if (r.status === 200 && r.data.success === true) return ApiResponse.success(r.data.data.map(deliveryAddressFromMap));
      return ApiResponse.fail(r.data.message ?? "Failed to load addresses");
    } catch (e) { return ApiResponse.fail(classifyError(e).message); }
  }
  private async addrMutation(method: string, path: string, body: unknown, failMsg: string): Promise<ApiResponse<DeliveryAddress>> {
    try {
      const r = await this.request(method, path, { body });
      if (r.data.success === true) return ApiResponse.success(deliveryAddressFromMap(r.data.data));
      return ApiResponse.fail(r.data.message ?? failMsg);
    } catch (e) {
      if (e instanceof HttpError && e.status === 400) return ApiResponse.fail(e.body?.message ?? "Invalid address data");
      return ApiResponse.fail(classifyError(e).message);
    }
  }
  saveAddress(data: Record<string, any>) { return this.addrMutation("POST", "/addresses", data, "Failed to save address"); }
  updateAddress(id: string, data: Record<string, any>) { return this.addrMutation("PUT", `/addresses/${id}`, data, "Failed to update address"); }
  setDefaultAddress(id: string) { return this.addrMutation("PATCH", `/addresses/${id}/default`, undefined, "Failed to set default address"); }
  async deleteAddress(id: string): Promise<ApiResponse<null>> {
    try {
      const r = await this.request("DELETE", `/addresses/${id}`);
      return r.data.success === true ? ApiResponse.success(null) : ApiResponse.fail(r.data.message ?? "Failed to delete address");
    } catch (e) { return ApiResponse.fail(classifyError(e).message); }
  }
  async validateAddress(latitude: number, longitude: number) {
    try {
      const r = await this.request("POST", "/addresses/validate", { body: { latitude, longitude } });
      return r.data.success === true ? ApiResponse.success<Record<string, any>>(r.data.data) : ApiResponse.fail<Record<string, any>>(r.data.message ?? "Address validation failed");
    } catch (e) { return ApiResponse.fail<Record<string, any>>(classifyError(e).message); }
  }
}

export const api = new ApiService();
export type { CartItem };
