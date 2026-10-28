"use client";
// Ports of HomeProvider (home_provider.dart) and MenuProvider (men_provider.dart).
import { api, ApiResponse } from "../api";
import {
  FoodCategory, FoodItem, discountPercentageForPlatform, effectivePriceForPlatform, foodCategoryFromMap, foodItemFromMap,
  hasActiveOfferForPlatform, offerValidForPlatform,
} from "../models";
import { FoodItemWithOffer, foodItemWithOfferFromJson } from "../offerModels";
import { prefs } from "../storage";
import { Store, useStore } from "../store";

const PLATFORM = "web"; // MenuProvider.initializePlatform: web / desktop targets => 'web'

function mergeById(items: FoodItem[], byId: Map<string, FoodItemWithOffer>, byName: Map<string, FoodItemWithOffer>, platformFilter?: string): FoodItem[] {
  return items.map((item) => {
    try {
      let o = byId.get(item.id);
      if (!o && item.name) o = byName.get(item.name.toLowerCase().trim());
      if (o && o.offer) {
        if (platformFilter && !offerValidForPlatform(o.offer.platforms, platformFilter)) return item;
        return { ...item, offer: o.offer };
      }
      return item;
    } catch { return item; }
  });
}
function buildMaps(list: FoodItemWithOffer[]) {
  const byId = new Map<string, FoodItemWithOffer>(), byName = new Map<string, FoodItemWithOffer>();
  for (const o of list) {
    if (o.id) byId.set(o.id, o);
    const n = o.name.toLowerCase().trim();
    if (n) byName.set(n, o);
  }
  return { byId, byName };
}
// ======================= HomeProvider =======================
interface HomeState {
  categories: FoodCategory[]; featuredItems: FoodItem[]; popularItems: FoodItem[]; isLoading: boolean; error: string | null;
  isInSearchMode: boolean; isSearchLoading: boolean; searchError: string | null; searchResults: FoodItem[]; lastSearchQuery: string;
  currentLanguage: string; hasInitialized: boolean;
}
export const homeStore = new Store<HomeState>({
  categories: [], featuredItems: [], popularItems: [], isLoading: false, error: null, isInSearchMode: false,
  isSearchLoading: false, searchError: null, searchResults: [], lastSearchQuery: "", currentLanguage: "en", hasInitialized: false,
});
let hOffers: FoodItemWithOffer[] = [], hMaps: ReturnType<typeof buildMaps> | null = null, hOffersLoaded = false, hSearchId = 0;
const hLang = () => homeStore.state.currentLanguage;
const hk = (n: string) => `home_cache_v1_${n}_${hLang()}`;

export async function homeInitializeIfNeeded(systemLanguage: string) {
  if (homeStore.state.hasInitialized) return;
  api.setLanguage(systemLanguage);
  homeStore.set({ currentLanguage: systemLanguage, hasInitialized: true });
  hydrateHome();
  await loadHomeData();
}
export function homeSetLanguage(code: string) {
  if (hLang() === code) return;
  api.setLanguage(code);
  homeStore.set({ currentLanguage: code });
  hOffersLoaded = false; hMaps = null;
  if (homeStore.state.isInSearchMode && homeStore.state.lastSearchQuery) void performSearch(homeStore.state.lastSearchQuery);
  else { hydrateHome(); void loadHomeData(); }
}
async function homeLoadItemsWithOffers() {
  if (hOffersLoaded && hOffers.length) return;
  try {
    const r = await api.request("GET", "/offer/items-with-offers", { query: { lang: hLang() } });
    if (r.status === 200 && r.data.success === true) {
      hOffers = (r.data.items ?? []).flatMap((j: any) => { try { return [foodItemWithOfferFromJson(j, hLang())]; } catch { return []; } });
      hMaps = buildMaps(hOffers); hOffersLoaded = true;
    }
  } catch { hOffers = []; hOffersLoaded = false; }
}
const homeMerge = (items: FoodItem[]) => (!items.length || !hMaps ? items : mergeById(items, hMaps.byId, hMaps.byName));

export async function loadHomeData() {
  if (homeStore.state.isLoading) return;
  homeStore.set({ isLoading: true, error: null });
  try {
    await homeLoadItemsWithOffers();
    const fetchers = [fetchCategories, fetchFeatured, fetchPopular];
    let results = await Promise.all(fetchers.map((f) => f()));
    if (!results.every(Boolean)) { // web-only resilience: one quiet retry of the sections that failed (transient network/API hiccup)
      await new Promise((r) => setTimeout(r, 1200));
      const retried = await Promise.all(fetchers.map((f, i) => (results[i] ? true : f())));
      results = retried;
    }
    if (!results.every(Boolean)) homeStore.set({ error: "Some content failed to load" });
  } catch (e) { homeStore.set({ error: `Failed to load content: ${String(e)}` }); }
  finally { homeStore.set({ isLoading: false }); }
}
async function fetchCategories() {
  try {
    const r = await api.getCategories();
    if (r.isSuccess && r.data) { homeStore.set({ categories: r.data }); prefs.set(hk("categories"), JSON.stringify(r.data)); return true; }
    return false;
  } catch { return false; }
}
async function fetchFeatured() {
  try {
    const r = await api.getFoodItems({ featured: true, limit: 20 });
    if (r.isSuccess && r.data) { homeStore.set({ featuredItems: homeMerge(r.data) }); prefs.set(hk("featured"), JSON.stringify(r.data)); return true; }
    return false;
  } catch { return false; }
}
async function fetchPopular() {
  try {
    const r = await api.getFoodItems({ popular: true, limit: 20 });
    if (r.isSuccess && r.data) { homeStore.set({ popularItems: homeMerge(r.data) }); prefs.set(hk("popular"), JSON.stringify(r.data)); return true; }
    return false;
  } catch { return false; }
}
function hydrateHome() {
  try {
    const c = prefs.getString(hk("categories")), f = prefs.getString(hk("featured")), p = prefs.getString(hk("popular"));
    const patch: Partial<HomeState> = {};
    if (c) patch.categories = (JSON.parse(c) as any[]).map((m) => foodCategoryFromMap(m));
    if (f) patch.featuredItems = (JSON.parse(f) as any[]).map((m) => foodItemFromMap(m));
    if (p) patch.popularItems = (JSON.parse(p) as any[]).map((m) => foodItemFromMap(m));
    if (c || f || p) homeStore.set(patch);
  } catch { /* fall through to network */ }
}
export async function performSearch(query: string) {
  const q = query.trim();
  if (!q) { exitSearchMode(); return; }
  const s = homeStore.state;
  if (s.isInSearchMode && s.lastSearchQuery === q && !s.isSearchLoading && s.searchResults.length) return;
  const id = ++hSearchId;
  homeStore.set({ isInSearchMode: true, isSearchLoading: true, searchError: null, lastSearchQuery: q });
  try {
    await homeLoadItemsWithOffers();
    if (id !== hSearchId) return;
    const r = await api.getFoodItems({ search: q });
    if (id !== hSearchId) return;
    if (r.isSuccess && r.data) homeStore.set({ searchResults: homeMerge(r.data), searchError: null });
    else homeStore.set({ searchResults: [], searchError: r.error ?? "Search failed" });
  } catch (e) {
    if (id === hSearchId) homeStore.set({ searchResults: [], searchError: `Search error: ${String(e)}` });
  } finally { if (id === hSearchId) homeStore.set({ isSearchLoading: false }); }
}
export function exitSearchMode() {
  if (!homeStore.state.isInSearchMode) return;
  hSearchId++;
  homeStore.set({ isInSearchMode: false, isSearchLoading: false, searchError: null, searchResults: [], lastSearchQuery: "" });
}
export const useHome = () => useStore(homeStore);

// ======================= MenuProvider =======================
export const MIN_SEARCH_LENGTH = 2;
interface MenuState {
  categories: FoodCategory[]; allFoodItems: FoodItem[]; foodItems: FoodItem[]; isLoading: boolean; isSearching: boolean;
  error: string | null; showVegOnly: boolean; showNonVegOnly: boolean; showPopularOnly: boolean; searchQuery: string;
  sortBy: string; currentLanguage: string; currentCategoryId: string | null;
}
export const menuStore = new Store<MenuState>({
  categories: [], allFoodItems: [], foodItems: [], isLoading: false, isSearching: false, error: null, showVegOnly: false,
  showNonVegOnly: false, showPopularOnly: false, searchQuery: "", sortBy: "name", currentLanguage: "es", currentCategoryId: null,
});
let mOffers: FoodItemWithOffer[] = [], mSearchId = 0, mDebounce: ReturnType<typeof setTimeout> | null = null;

// Web-only: a branch switch changes the catalog, so drop what was loaded for the old branch and refetch.
api.onBranchChange(() => {
  hOffers = []; hMaps = null; hOffersLoaded = false; mOffers = [];
  homeStore.set({ categories: [], featuredItems: [], popularItems: [], isInSearchMode: false, searchResults: [], lastSearchQuery: "" });
  menuStore.set({ categories: [], allFoodItems: [], foodItems: [], searchQuery: "", currentCategoryId: null });
  if (homeStore.state.hasInitialized) void loadHomeData();
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/menu")) { void loadCategories(); void loadFoodItems(null); }
});

export function menuSetLanguage(code: string) {
  const s = menuStore.state;
  if (s.currentLanguage === code) return;
  api.setLanguage(code);
  menuStore.set({ currentLanguage: code });
  void loadCategories();
  if (menuStore.state.searchQuery) void menuPerformSearch(menuStore.state.searchQuery);
  else void loadFoodItems(menuStore.state.currentCategoryId);
}
export async function loadCategories() {
  try {
    const r = await api.getCategories();
    if (r.isSuccess && r.data) menuStore.set({ categories: r.data });
  } catch { /* ignore */ }
}
async function menuLoadItemsWithOffers() {
  const lang = menuStore.state.currentLanguage;
  try {
    const r = await api.request("GET", "/offer/items-with-offers", { query: { lang, platform: PLATFORM } });
    if (r.status === 200 && r.data.success === true)
      mOffers = (r.data.items ?? []).flatMap((j: any) => { try { return [foodItemWithOfferFromJson(j, lang)]; } catch { return []; } });
  } catch { mOffers = []; }
}
const menuMerge = (items: FoodItem[]) => {
  if (!items.length || !mOffers.length) return items;
  const { byId, byName } = buildMaps(mOffers);
  return mergeById(items, byId, byName, PLATFORM);
};
export async function loadFoodItems(categoryId: string | null = null) {
  if (menuStore.state.isLoading) return;
  menuStore.set({ isLoading: true, error: null, searchQuery: "", currentCategoryId: categoryId });
  try {
    await menuLoadItemsWithOffers();
    const r = await api.getFoodItems({ categoryId: categoryId ?? undefined, featured: menuStore.state.showPopularOnly ? true : undefined, limit: 100 });
    if (r.isSuccess && r.data) { menuStore.set({ allFoodItems: menuMerge(r.data) }); applyLocalFilters(); }
    else menuStore.set({ error: r.error ?? "Failed to load food items", allFoodItems: [], foodItems: [] });
  } catch (e) { menuStore.set({ error: `Error loading food items: ${String(e)}`, allFoodItems: [], foodItems: [] }); }
  finally { menuStore.set({ isLoading: false }); }
}
export function searchFoodItems(query: string) {
  if (mDebounce) clearTimeout(mDebounce);
  const q = query.trim();
  if (!q) { menuStore.set({ searchQuery: "" }); void loadFoodItems(menuStore.state.currentCategoryId); return; }
  if (q.length < MIN_SEARCH_LENGTH) { menuStore.set({ searchQuery: q }); return; }
  mDebounce = setTimeout(() => void menuPerformSearch(q), 500);
}
async function menuPerformSearch(query: string) {
  if (query.length < MIN_SEARCH_LENGTH) return;
  if (menuStore.state.isSearching || menuStore.state.isLoading) return;
  const id = ++mSearchId;
  menuStore.set({ searchQuery: query, isSearching: true, error: null });
  try {
    await menuLoadItemsWithOffers();
    if (id !== mSearchId) return;
    const r = await api.getFoodItems({ search: query, categoryId: menuStore.state.currentCategoryId ?? undefined, limit: 100 });
    if (id !== mSearchId) return;
    if (r.isSuccess && r.data) { menuStore.set({ allFoodItems: menuMerge(r.data) }); applyLocalFilters(); }
    else menuStore.set({ error: r.error ?? "Search failed", allFoodItems: [], foodItems: [] });
  } catch (e) {
    if (id === mSearchId) menuStore.set({ error: `Search error: ${String(e)}`, allFoodItems: [], foodItems: [] });
  } finally { if (id === mSearchId) menuStore.set({ isSearching: false }); }
}
export function setVegFilter(v: boolean) { menuStore.set({ showVegOnly: v, ...(v ? { showNonVegOnly: false } : {}) }); applyLocalFilters(); }
export function setNonVegFilter(v: boolean) { menuStore.set({ showNonVegOnly: v, ...(v ? { showVegOnly: false } : {}) }); applyLocalFilters(); }
export function setPopularFilter(v: boolean) {
  menuStore.set({ showPopularOnly: v });
  if (menuStore.state.searchQuery) void menuPerformSearch(menuStore.state.searchQuery);
  else void loadFoodItems(menuStore.state.currentCategoryId);
}
export function setSortBy(v: string) { menuStore.set({ sortBy: v }); applyLocalFilters(); }
export function clearFilters() {
  menuStore.set({ showVegOnly: false, showNonVegOnly: false, showPopularOnly: false, searchQuery: "", sortBy: "name" });
  void loadFoodItems(menuStore.state.currentCategoryId);
}
/** Dart String.compareTo is UTF-16 code-unit order, not locale order */
const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function filterAndSort(all: FoodItem[], o: { veg: boolean; nonVeg: boolean; sortBy: string }, platform = PLATFORM): FoodItem[] {
  let items = [...all];
  if (o.veg) items = items.filter((i) => i.isVeg);
  else if (o.nonVeg) items = items.filter((i) => !i.isVeg);
  switch (o.sortBy) {
    case "name": items.sort((a, b) => cmpStr(a.name, b.name)); break;
    case "price-low": items.sort((a, b) => effectivePriceForPlatform(a, platform) - effectivePriceForPlatform(b, platform)); break;
    case "price-high": items.sort((a, b) => effectivePriceForPlatform(b, platform) - effectivePriceForPlatform(a, platform)); break;
    case "rating": items.sort((a, b) => b.rating - a.rating); break;
    case "discount": items.sort((a, b) => discountPercentageForPlatform(b, platform) - discountPercentageForPlatform(a, platform)); break;
  }
  return items;
}
function applyLocalFilters() {
  const s = menuStore.state;
  if (!s.allFoodItems.length) { menuStore.set({ foodItems: [] }); return; }
  menuStore.set({ foodItems: filterAndSort(s.allFoodItems, { veg: s.showVegOnly, nonVeg: s.showNonVegOnly, sortBy: s.sortBy }) });
}
export const useMenu = () => {
  const s = useStore(menuStore);
  return {
    ...s, currentPlatform: PLATFORM, hasItems: s.allFoodItems.length > 0,
    getItemsWithOffers: () => s.foodItems.filter((i) => hasActiveOfferForPlatform(i, PLATFORM)),
    getBestDiscounts: (limit = 10) =>
      s.foodItems.filter((i) => hasActiveOfferForPlatform(i, PLATFORM))
        .sort((a, b) => discountPercentageForPlatform(b, PLATFORM) - discountPercentageForPlatform(a, PLATFORM)).slice(0, limit),
  };
};
export const PLATFORM_WEB = PLATFORM;

/** HomeProvider.getFoodItem */
export async function getFoodItemById(id: string) {
  try { return await api.getFoodItem(id); }
  catch (e) { return ApiResponse.fail<FoodItem>(`Error loading food item: ${String(e)}`); }
}
