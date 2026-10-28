"use client";
// Port of OrderTrackingProvider + TrackingSocketService. Per-screen state (like the Flutter provider created per route).
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "./api";
import { SOCKET_URL } from "./config";
import {
  OrderTrackingInfo, trackingFromMap, trackingIsTerminal, trackingWithLocation, trackingWithStatus,
} from "./offerModels";

export function useOrderTracking(orderId: string) {
  const [tracking, setTracking] = useState<OrderTrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackPolling, setUsingFallbackPolling] = useState(false);
  const ref = useRef<OrderTrackingInfo | null>(null);
  ref.current = tracking;

  useEffect(() => {
    let disposed = false, polling = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null, watchdog: ReturnType<typeof setTimeout> | null = null;
    let socket: Socket | null = null;

    const loadFromRest = async (silent = false) => {
      if (!silent) setIsLoading(true);
      const r = await api.getOrderTracking(orderId);
      if (disposed) return;
      if (r.isSuccess && r.data) { const t = trackingFromMap(r.data); ref.current = t; setTracking(t); setError(null); }
      else if (!silent) setError(r.error ?? "Unable to load tracking info");
      setIsLoading(false);
      if (ref.current && trackingIsTerminal(ref.current)) stopPolling();
    };
    const startPolling = () => {
      if (polling || disposed) return;
      polling = true; setUsingFallbackPolling(true);
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        if (disposed || (ref.current && trackingIsTerminal(ref.current))) { if (pollTimer) clearInterval(pollTimer); return; }
        void loadFromRest(true);
      }, 5000);
    };
    function stopPolling() {
      if (!polling) return;
      polling = false; setUsingFallbackPolling(false);
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    }
    const connectSocket = () => {
      const token = api.getAuthToken();
      if (!token) { startPolling(); return; }
      socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: false, auth: { token } });
      socket.on("connect", () => { stopPolling(); socket?.emit("join_order_tracking", { orderId }); });
      socket.on("connect_error", () => startPolling());
      socket.on("order:location_update", (d: any) => {
        if (!d || d.orderId !== orderId || !ref.current) return;
        const t = trackingWithLocation(ref.current, d); ref.current = t; setTracking(t);
      });
      socket.on("order:status_changed", (d: any) => {
        if (!d || d.orderId !== orderId || !ref.current) return;
        const t = trackingWithStatus(ref.current, d); ref.current = t; setTracking(t);
        if (trackingIsTerminal(t)) stopPolling();
      });
      for (const ev of ["order:driver_assigned", "order:driver_started", "order:driver_ended"]) socket.on(ev, () => void loadFromRest(true));
      socket.on("order:tracking_error", () => startPolling());
      socket.connect();
      watchdog = setTimeout(() => { if (!socket?.connected) startPolling(); }, 8000);
    };

    void (async () => { await loadFromRest(); if (!disposed) connectSocket(); })();
    return () => {
      disposed = true;
      if (watchdog) clearTimeout(watchdog);
      if (pollTimer) clearInterval(pollTimer);
      if (socket) { socket.emit("leave_order_tracking", { orderId }); socket.disconnect(); }
    };
  }, [orderId]);

  return { tracking, isLoading, error, usingFallbackPolling };
}
