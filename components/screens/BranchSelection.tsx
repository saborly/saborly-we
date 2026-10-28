"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap } from "@/components/ui/primitives";
import { api, classifyError } from "@/lib/api";
import { detectUserLocation } from "@/lib/geolocation";
import { useScreen } from "@/lib/screenutil";
import { prefs } from "@/lib/storage";

// Port of lib/features/home/screens/branch_selection_screen.dart
const MAX_BRANCH_DISTANCE_KM = 3.5;
const INK = "#1A1A2E", INK_MUTED = "#6B7280", INK_HINT = "#9CA3AF", FIELD_BORDER = "#E4E4E7";
const poppins = "var(--font-poppins), sans-serif";

type Branch = Record<string, any>;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371.0, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const branchName = (b: Branch) => `${b.name ?? "Branch"}`.trim();
const branchAddress = (b: Branch) => {
  const loc = `${b.location ?? ""}`.trim();
  return !loc || loc.toLowerCase() === branchName(b).toLowerCase() ? null : loc;
};
const cityLabel = (b: Branch) => (`${b.location ?? ""}` ? `${b.location}` : `${b.name ?? "Branch"}`);

export function BranchSelection() {
  const router = useRouter();
  const { sp, w, h, r } = useScreen();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const finalize = useCallback(async (id: string, o: { lat?: number | null; lng?: number | null; addressText?: string | null } = {}) => {
    const current = api.branchId;
    if (current && current !== id) prefs.remove("cart_items"); // clear cart when switching branches
    api.setBranchId(id);
    if (o.lat != null && o.lng != null) api.setSelectedLocation(o.lat, o.lng, o.addressText ?? undefined);
    router.push("/home");
  }, [router]);

  const load = useCallback(async () => {
    try {
      const res = await api.request("GET", "/branches/public");
      let list: Branch[] = (res.data.branches ?? []).map((e: any) => ({ ...e }));
      const seen = new Set<string>();
      list = list.filter((b) => { const k = `${b.name}`.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
      list.sort((a, b) => (`${a.name}` < `${b.name}` ? -1 : `${a.name}` > `${b.name}` ? 1 : 0));
      setBranches(list); setLoading(false);
      const saved = api.branchId;
      // ?change=1 means the user came here to switch branch: stay and pre-select the current one.
      if (new URLSearchParams(window.location.search).get("change") === "1") {
        if (saved && list.some((b) => `${b._id}` === saved && b.isActive === true)) setCityId(saved);
        return;
      }
      if (saved) {
        const hit = list.find((b) => `${b._id}` === saved && b.isActive === true);
        if (hit) { router.push("/home"); return; }
      }
      if (list.length === 1 && list[0].isActive === true) await finalize(`${list[0]._id}`);
    } catch (e) {
      setLoadError(classifyError(e).message); setLoading(false);
    }
  }, [finalize, router]);
  useEffect(() => { void load(); }, [load]);

  const useMyLocation = async () => {
    setDetecting(true); setLocationError(null); setBlocked(null);
    const c = await Promise.race([detectUserLocation(), new Promise<null>((res) => setTimeout(() => res(null), 26000))]);
    if (!c) {
      setDetecting(false);
      setLocationError("Couldn't detect your location. Please allow location access or pick your city below.");
      return;
    }
    setCoords(c); setAddress(null); setDetecting(false); setCityId(null);
    const addr = await api.reverseGeocode(c.lat, c.lng);
    setCoords((cur) => { if (cur && cur.lat === c.lat && cur.lng === c.lng) setAddress(addr); return cur; });
  };

  const nearest = (lat: number, lng: number) => {
    if (!branches.length) return null;
    let bestId = `${branches[0]._id}`, best = Infinity;
    for (const b of branches) {
      if (typeof b.latitude !== "number" || typeof b.longitude !== "number") continue;
      const d = haversine(lat, lng, b.latitude, b.longitude);
      if (d < best) { best = d; bestId = `${b._id}`; }
    }
    return { id: bestId, distanceKm: best };
  };
  const canSubmit = !submitting && (coords != null || cityId != null);
  const onSelect = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setBlocked(null);
    if (coords) {
      const n = nearest(coords.lat, coords.lng);
      if (!n || n.distanceKm > MAX_BRANCH_DISTANCE_KM) {
        setSubmitting(false);
        setBlocked(!n ? "Sorry, we couldn't find a nearby branch."
          : `Sorry, we don't deliver to your area yet. Our nearest branch is ${n.distanceKm.toFixed(1)} km away.`);
        return;
      }
      await finalize(n.id, { lat: coords.lat, lng: coords.lng, addressText: address });
      return;
    }
    const b = branches.find((x) => `${x._id}` === cityId) ?? {};
    await finalize(cityId!, { lat: typeof b.latitude === "number" ? b.latitude : null, lng: typeof b.longitude === "number" ? b.longitude : null, addressText: cityLabel(b) });
  };

  const active = branches.filter((b) => b.isActive === true);
  const selected = active.find((b) => `${b._id}` === cityId);
  const detected = coords != null;
  const divider = (label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: w(12) }}>
      <div style={{ flex: 1, height: 1, background: FIELD_BORDER }} />
      <span style={{ fontFamily: poppins, fontSize: sp(11.5), fontWeight: 600, letterSpacing: 0.6, color: INK_HINT, textTransform: "uppercase" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: FIELD_BORDER }} />
    </div>
  );

  const form = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/logo3.png" alt="Saborly" style={{ width: `min(100%, ${(h(88) * 300) / 93}px)`, height: "auto", aspectRatio: "300 / 93", objectFit: "contain", alignSelf: "center" }} />
      <div style={{ height: h(20) }} />
      <div style={{ textAlign: "center", fontFamily: poppins, fontSize: sp(20), fontWeight: 700, color: INK, lineHeight: 1.25 }}>Choose your branch</div>
      <div style={{ height: h(6) }} />
      <div style={{ textAlign: "center", fontFamily: poppins, fontSize: sp(13), color: INK_MUTED, lineHeight: 1.45 }}>
        Pick the Saborly location you want to order from, or let us find the nearest one.
      </div>
      <div style={{ height: h(22) }} />

      <Tap disabled={detecting} onClick={useMyLocation} style={{
        padding: `${h(13)}px ${w(18)}px`, borderRadius: r(14), display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
        background: detected ? withOpacity(C.primary, 0.08) : "#fff", border: `1.5px solid ${detected ? withOpacity(C.primary, 0.45) : FIELD_BORDER}`, transition: "all 180ms",
      }}>
        {detecting ? <Spinner size={w(16)} stroke={2} /> : <Icon name={detected ? "check_circle_rounded" : "my_location_rounded"} size={sp(18)} color={C.primary} />}
        <span style={{ width: w(10) }} />
        <span style={{ fontFamily: poppins, fontSize: sp(14), fontWeight: 600, color: detected ? C.primary : INK }}>
          {detecting ? "Fetching Location..." : detected ? "Location detected" : "Use my location"}
        </span>
      </Tap>
      {coords && (<><div style={{ height: h(8) }} /><div style={{ textAlign: "center", fontFamily: poppins, fontSize: sp(12), color: INK_MUTED }}>
        {address ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}</div></>)}
      {locationError && (<><div style={{ height: h(8) }} /><div role="alert" style={{ textAlign: "center", fontFamily: poppins, fontSize: sp(12), color: "#D32F2F" }}>{locationError}</div></>)}

      <div style={{ height: h(20) }} />
      {divider("or select a branch")}
      <div style={{ height: h(16) }} />

      <div role="radiogroup" aria-label="Branches" style={{ display: "flex", flexDirection: "column", gap: h(10) }}>
        {active.length === 0 ? (
          <div style={{ padding: `${h(16)}px ${w(12)}px`, textAlign: "center", fontFamily: poppins, fontSize: sp(13), color: INK_MUTED }}>No branches available right now</div>
        ) : active.map((b) => {
          const id = `${b._id}`, sel = id === cityId && !detected, addr = branchAddress(b);
          return (
            <Tap key={id} onClick={() => { setCityId(id); setCoords(null); setBlocked(null); }} className="branch-card" style={{
              padding: `${h(12)}px ${w(14)}px`, minHeight: h(64), borderRadius: r(14), display: "flex", alignItems: "center", boxSizing: "border-box",
              background: sel ? withOpacity(C.primary, 0.06) : "#fff", border: `${sel ? 1.5 : 1}px solid ${sel ? C.primary : FIELD_BORDER}`,
              boxShadow: sel ? `0 0 0 4px ${withOpacity(C.primary, 0.10)}` : "0 1px 2px rgba(0,0,0,.03)", transition: "all 160ms",
            }}>
              <div style={{ width: w(44), height: w(44), borderRadius: r(12), display: "flex", alignItems: "center", justifyContent: "center", background: sel ? C.primary : withOpacity(C.primary, 0.09), flex: "none", transition: "background 160ms" }}>
                <Icon name="storefront_rounded" size={sp(22)} color={sel ? "#fff" : C.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingLeft: w(14) }}>
                <div style={{ fontFamily: poppins, fontSize: sp(15), fontWeight: 600, color: INK, lineHeight: 1.3 }}>{branchName(b)}</div>
                {addr && <div style={{ fontFamily: poppins, fontSize: sp(12.5), color: INK_MUTED, lineHeight: 1.4, marginTop: 2 }}>{addr}</div>}
              </div>
              <span style={{
                width: 22, height: 22, borderRadius: "50%", boxSizing: "border-box", flex: "none", marginLeft: w(10), display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${sel ? C.primary : "#D1D5DB"}`, background: sel ? C.primary : "transparent", transition: "all 160ms",
              }}>{sel && <Icon name="check_rounded" size={14} color="#fff" />}</span>
            </Tap>
          );
        })}
      </div>

      <div style={{ height: h(22) }} />
      {blocked && (
        <div role="alert" style={{ width: "100%", boxSizing: "border-box", padding: w(12), marginBottom: h(16), background: "#FFF3E0", borderRadius: r(12), textAlign: "center",
          fontFamily: poppins, fontSize: sp(12.5), fontWeight: 600, color: "#E65100" }}>{blocked}</div>
      )}
      <button disabled={!canSubmit} onClick={onSelect} style={{
        width: "100%", height: h(54), borderRadius: r(14), border: 0, background: canSubmit ? C.primary : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: poppins, fontSize: sp(15), fontWeight: 700, color: canSubmit ? "#fff" : "#9CA3AF", cursor: canSubmit ? "pointer" : "not-allowed",
        boxShadow: canSubmit ? `0 8px 18px ${withOpacity(C.primary, 0.28)}` : "none", transition: "all 160ms",
      }}>
        {submitting ? <Spinner size={w(18)} stroke={2} color="#fff" /> : selected || detected ? "Continue" : "Select a branch"}
      </button>
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "#fff" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 50%, #F8F9FA 100%)" }} />
      <div style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: `${h(24)}px ${w(20)}px`, boxSizing: "border-box" }}>
        <div style={{
          width: "100%", maxWidth: 520, boxSizing: "border-box", padding: `${h(36)}px ${w(40)}px`, background: "#fff",
          borderRadius: r(24), border: "1px solid #F0EFF2", boxShadow: "0 14px 36px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.04)",
        }}>
          {loading ? (
            <div style={{ padding: w(24), display: "flex", justifyContent: "center" }}><Spinner /></div>
          ) : loadError ? (
            <div style={{ padding: w(24), display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Icon name="cloud_off_rounded" size={sp(40)} color={C.textLight} />
              <div style={{ height: h(14) }} />
              <div style={{ textAlign: "center", fontFamily: poppins, fontSize: sp(13.5), fontWeight: 500, color: INK }}>{loadError}</div>
              <div style={{ height: h(20) }} />
              <button onClick={() => { setLoading(true); setLoadError(null); void load(); }} style={{
                height: h(46), padding: `0 ${w(28)}px`, borderRadius: r(14), background: C.primary, fontFamily: poppins, fontSize: sp(14), fontWeight: 700, color: "#fff" }}>Try Again</button>
            </div>
          ) : form}
        </div>
      </div>
      <style>{`.branch-card:hover{border-color:rgba(0,0,0,.18)}`}</style>
    </div>
  );
}
