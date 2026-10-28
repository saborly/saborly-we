"use client";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { C } from "@/lib/colors";

/** CachedNetworkImage / Image.network equivalent: shimmer placeholder -> fade in; errorNode on failure. */
export function NetImage({ src, alt = "", fit = "cover", position, placeholder = C.shimmer, error, fadeMs = 200, style }: {
  src: string; alt?: string; fit?: CSSProperties["objectFit"]; position?: string; placeholder?: string | ReactNode; error?: ReactNode;
  fadeMs?: number; style?: CSSProperties;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const img = useRef<HTMLImageElement>(null);
  // An image can finish (cached / before hydration) before onLoad is attached: sync from the element itself so it never stays invisible.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? "ok" : "error");
    else setState("loading");
  }, [src]);
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      {state !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={src} alt={alt} onLoad={() => setState("ok")} onError={() => setState("error")}
          style={{ width: "100%", height: "100%", objectFit: fit, objectPosition: position, display: "block", opacity: state === "ok" ? 1 : 0, transition: `opacity ${fadeMs}ms` }} />
      )}
      {state === "loading" && (typeof placeholder === "string"
        ? <div style={{ position: "absolute", inset: 0, background: placeholder }} />
        : <div style={{ position: "absolute", inset: 0 }}>{placeholder}</div>)}
      {state === "error" && error}
    </div>
  );
}
