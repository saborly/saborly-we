"use client";
import { useEffect, useRef, useState } from "react";

/** LayoutBuilder equivalent: measures an element's content box (width/height). */
export function useBox<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0, measured: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ width: el.clientWidth, height: el.clientHeight, measured: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);
  return { ref, ...box };
}
