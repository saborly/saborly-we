"use client";
import { useState } from "react";
import { C } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomTextField } from "@/components/ui/forms";
import { useScreen } from "@/lib/screenutil";

// Shared pieces of signup_password_fields.dart
export const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;
export const COMMON_PASSWORDS = ["password123", "qwerty123", "12345678", "abc123", "admin123"];

export function evaluatePassword(v: string) {
  return {
    length: v.length >= 8 && v.length <= 128, uppercase: /[A-Z]/.test(v), lowercase: /[a-z]/.test(v), digit: /\d/.test(v),
    special: /[@$!%*?&]/.test(v), noSpaces: !v.includes(" "), notCommon: !COMMON_PASSWORDS.includes(v.toLowerCase()), noRepeats: !/(.)\1{3,}/.test(v),
  };
}
export function passwordStrength(v: string): "Empty" | "Weak" | "Medium" | "Strong" {
  const passed = Object.values(evaluatePassword(v)).filter(Boolean).length;
  if (v === "") return "Empty";
  if (passed <= 3) return "Weak";
  if (passed <= 5) return "Medium";
  return "Strong";
}

/** The signup validator for the "new password" field. `empty`, `regexMsg` supplied by caller (AppStrings). */
export function validateNewPassword(value: string, empty: string, regexMsg: string): string | null {
  if (!value) return empty;
  if (value.includes(" ")) return "Password cannot contain spaces";
  if (COMMON_PASSWORDS.includes(value.toLowerCase())) return "This password is too common";
  if (/(.)\1{3,}/.test(value)) return "Password contains too many repeated characters";
  if (value.length > 128) return "Password is too long (max 128 characters)";
  if (!PASSWORD_RE.test(value)) return regexMsg;
  return null;
}

export function VisibilityToggle({ obscure, onToggle }: { obscure: boolean; onToggle: () => void }) {
  return (
    <button aria-label="toggle" onClick={onToggle} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={obscure ? "visibility_off" : "visibility"} size={24} color={C.textLight} />
    </button>
  );
}

export function PasswordField(p: { value: string; onChange: (v: string) => void; label: string; error?: string | null; onSubmit?: () => void }) {
  const [obscure, setObscure] = useState(true);
  return <CustomTextField value={p.value} onChange={p.onChange} labelText={p.label} obscureText={obscure} prefixIcon="lock_outline" error={p.error} onSubmit={p.onSubmit} suffix={<VisibilityToggle obscure={obscure} onToggle={() => setObscure(!obscure)} />} />;
}

function Req({ text, ok }: { text: string; ok: boolean }) {
  const u = useScreen();
  const color = ok ? "#4CAF50" : "#F44336";
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Icon name={ok ? "check_circle" : "cancel"} size={u.sp(12)} color={color} /><span style={{ width: u.w(4) }} />
      <span style={{ fontSize: u.sp(12), color }}>{text}</span>
    </div>
  );
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const u = useScreen();
  const checks = evaluatePassword(password);
  const strength = passwordStrength(password);
  const [color, progress] = strength === "Strong" ? ["#4CAF50", 1] : strength === "Medium" ? ["#FF9800", 0.6] : strength === "Weak" ? ["#F44336", 0.3] : ["#9E9E9E", 0];
  return (
    <div>
      <div style={{ height: u.h(8) }} />
      <div style={{ height: 5, borderRadius: 10, background: "#E0E0E0", overflow: "hidden" }}><div style={{ width: `${progress * 100}%`, height: "100%", background: color as string }} /></div>
      <div style={{ height: u.h(8) }} />
      <div style={{ fontSize: u.sp(12), color: color as string }}>Password Strength: {strength}</div>
      <div style={{ height: u.h(8) }} />
      <Req text="At least 8 characters" ok={checks.length} />
      <Req text="Contains uppercase letter" ok={checks.uppercase} />
      <Req text="Contains lowercase letter" ok={checks.lowercase} />
      <Req text="Contains a number" ok={checks.digit} />
      <Req text="Contains a special character" ok={checks.special} />
      <Req text="No spaces allowed" ok={checks.noSpaces} />
      <Req text="Not a common password" ok={checks.notCommon} />
      <Req text="No repeated characters" ok={checks.noRepeats} />
    </div>
  );
}
