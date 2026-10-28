"use client";
import { useEffect, useRef } from "react";
import { C } from "@/lib/colors";
import { OrderTrackingInfo } from "@/lib/offerModels";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let loader: Promise<any> | null = null;

/** Loads the Maps JavaScript API once (key is a public, referrer-restricted browser key). */
function loadMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google.maps);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY ?? "")}&v=weekly`;
    s.async = true;
    s.onload = () => resolve(w.google.maps);
    s.onerror = () => { loader = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
  });
  return loader;
}

const dot = (maps: any, color: string, scale = 9) => ({ path: maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale });

/** Branch, destination and driver markers, dashed route line, recentred on the driver. */
export function TrackingMap({ t }: { t: OrderTrackingInfo }) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{ map?: any; branch?: any; dest?: any; driver?: any; line?: any; fitted?: boolean }>({});

  useEffect(() => {
    if (!KEY || !el.current) return;
    let cancelled = false;
    void loadMaps().then((maps) => {
      if (cancelled || !el.current) return;
      const s = state.current;
      const pos = (la: number | null, lo: number | null) => (la != null && lo != null ? { lat: la, lng: lo } : null);
      const branch = pos(t.branchLatitude, t.branchLongitude), dest = pos(t.destinationLatitude, t.destinationLongitude), driver = pos(t.latitude, t.longitude);
      const first = driver ?? dest ?? branch ?? { lat: 0, lng: 0 };
      if (!s.map) s.map = new maps.Map(el.current, { center: first, zoom: 14, disableDefaultUI: true, zoomControl: true, clickableIcons: false });
      const put = (key: "branch" | "dest" | "driver", p: any, color: string, title: string) => {
        if (!p) { s[key]?.setMap(null); s[key] = undefined; return; }
        if (!s[key]) s[key] = new maps.Marker({ map: s.map, position: p, title, icon: dot(maps, color, key === "driver" ? 10 : 8) });
        else s[key].setPosition(p);
      };
      put("branch", branch, C.primary, t.branchName ?? "Branch");
      put("dest", dest, C.error, t.destinationAddress ?? "Destination");
      put("driver", driver, "#1976D2", t.driverName ?? "Driver");
      const path = [branch, driver, dest].filter(Boolean);
      if (!s.line) s.line = new maps.Polyline({ map: s.map, strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: C.primary, scale: 3 }, offset: "0", repeat: "14px" }] });
      s.line.setPath(path);
      if (driver) s.map.panTo(driver);
      else if (!s.fitted && path.length) {
        const b = new maps.LatLngBounds();
        path.forEach((p: any) => b.extend(p));
        s.map.fitBounds(b, 60);
        s.fitted = true;
      }
    }).catch(() => { /* map stays blank */ });
    return () => { cancelled = true; };
  }, [t]);

  if (!KEY) return null;
  return <div ref={el} style={{ position: "absolute", inset: 0 }} />;
}
