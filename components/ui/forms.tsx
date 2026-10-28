"use client";
import { CSSProperties, ReactNode, useState } from "react";
import { C } from "@/lib/colors";
import { Icon } from "./Icon";
import { Spinner } from "./primitives";
import { useScreen } from "@/lib/screenutil";

/** Port of CustomButton (lib/shared/widgets/custom_button.dart) */
export function CustomButton({ text, onPressed, isLoading, isOutlined, backgroundColor, textColor, width, height, icon, borderRadius, fontSize }: {
  text: string; onPressed?: () => void; isLoading?: boolean; isOutlined?: boolean; backgroundColor?: string; textColor?: string;
  width?: number | string; height?: number; icon?: string; borderRadius?: number; fontSize?: number;
}) {
  const u = useScreen();
  const bg = isOutlined ? "transparent" : backgroundColor ?? C.primary;
  const fg = isOutlined ? textColor ?? C.primary : textColor ?? "#fff";
  const disabled = isLoading || !onPressed;
  return (
    <button disabled={disabled} onClick={onPressed} style={{
      width: width ?? "100%", height: height ?? u.h(56), boxSizing: "border-box", padding: `${u.h(16)}px ${u.w(24)}px`, borderRadius: borderRadius ?? u.r(12), cursor: disabled ? "default" : "pointer",
      background: disabled && !isOutlined ? "rgba(0,0,0,.12)" : bg, color: disabled && !isOutlined ? "rgba(0,0,0,.38)" : fg,
      border: isOutlined ? `1.5px solid ${textColor ?? C.primary}` : "none", boxShadow: isOutlined || disabled ? "none" : "0 3px 1px -2px rgba(26,8,3,.16), 0 2px 2px 0 rgba(26,8,3,.11), 0 1px 5px 0 rgba(26,8,3,.09)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
    }}>
      {isLoading ? <Spinner size={u.w(20)} stroke={2} color={isOutlined ? C.primary : "#fff"} /> : (
        <>
          {icon && (<><Icon name={icon} size={u.sp(20)} color={fg} /><span style={{ width: u.w(8) }} /></>)}
          <span style={{ fontSize: fontSize ?? u.sp(16), fontWeight: 800 /* explicit w600 sits on the theme's GoogleFonts.manrope w800 face, which renders as w800 */, color: "inherit", whiteSpace: "nowrap" }}>{text}</span>
        </>
      )}
    </button>
  );
}

/** Port of CustomTextField (lib/shared/widgets/custom_text_field.dart); validation text supplied via `error` */
export function CustomTextField({ value, onChange, labelText, hintText, prefixIcon, suffix, obscureText, type = "text", error, onSubmit, enabled = true, maxLines = 1, maxLength, autoCapitalize, autoComplete }: {
  value: string; onChange: (v: string) => void; labelText: string; hintText?: string; prefixIcon?: string; suffix?: ReactNode; obscureText?: boolean;
  type?: string; error?: string | null; onSubmit?: (v: string) => void; enabled?: boolean; maxLines?: number; maxLength?: number; autoCapitalize?: string; autoComplete?: string;
}) {
  const u = useScreen();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? C.error : focused ? C.primary : C.border;
  const common: CSSProperties = {
    flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontSize: u.sp(16), color: C.textDark, fontWeight: 400, fontFamily: "inherit", resize: "none",
    // InputDecoration: contentPadding horizontal only applies on a side that has no prefix/suffix icon
    padding: `${u.h(16)}px ${suffix ? 0 : u.w(16)}px ${u.h(16)}px ${prefixIcon ? 4 : u.w(16)}px`,
  };
  return (
    <div className="ctf">
      <div style={{ fontSize: u.sp(14), fontWeight: 500, color: C.textDark }}>{labelText}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ display: "flex", alignItems: maxLines > 1 ? "flex-start" : "center", background: enabled ? "#FAFAFA" : "#F5F5F5", borderRadius: u.r(12), boxShadow: `inset 0 0 0 ${focused || error ? 2 : 1}px ${enabled ? borderColor : "#E0E0E0"}`, boxSizing: "border-box" /* OutlineInputBorder is painted inside the box: no layout space */ }}>
        {prefixIcon && <span style={{ width: 40, minHeight: 48, flex: "none", boxSizing: "border-box", display: "flex", alignItems: maxLines > 1 ? "flex-start" : "center", justifyContent: "center", paddingTop: maxLines > 1 ? u.h(16) : 0 }}><Icon name={prefixIcon} size={u.sp(20)} color={focused ? C.primary : C.textLight} /></span>}
        {maxLines > 1 ? (
          <textarea value={value} rows={maxLines} disabled={!enabled} placeholder={hintText ?? labelText} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={common} maxLength={maxLength} />
        ) : (
          <input value={value} type={obscureText ? "password" : type} disabled={!enabled} placeholder={hintText ?? labelText} maxLength={maxLength} autoCapitalize={autoCapitalize} autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={(e) => { if (e.key === "Enter") onSubmit?.(value); }} style={{ ...common, boxSizing: "border-box", height: u.h(16) * 2 + u.sp(16), lineHeight: 1 }} />
        )}
        {suffix && <span style={{ width: 42, minHeight: 48, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{suffix}</span>}
      </div>
      {error && <div style={{ fontSize: u.sp(12), color: C.error, marginTop: 8, padding: "0 16px", lineHeight: 1.33 }}>{error}</div>}
    </div>
  );
}
