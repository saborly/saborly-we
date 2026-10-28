"use client";
import { useState } from "react";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { GradientHero, ResponsiveColumn } from "@/components/ui/GradientHero";
import { FoodKingFooter } from "@/components/home/more";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";

const RED = "#E63946";
const FAQS: { category: string; q: string; a: string; icon: string }[] = [
  { category: "faq_category_orders", q: "faq_order_place_question", a: "faq_order_place_answer", icon: "shopping_bag_outlined" },
  { category: "faq_category_orders", q: "faq_order_modify_question", a: "faq_order_modify_answer", icon: "edit_outlined" },
  { category: "faq_category_payment", q: "faq_payment_methods_question", a: "faq_payment_methods_answer", icon: "payment_outlined" },
  { category: "faq_category_payment", q: "faq_payment_security_question", a: "faq_payment_security_answer", icon: "lock_outlined" },
  { category: "faq_category_delivery", q: "faq_delivery_time_question", a: "faq_delivery_time_answer", icon: "delivery_dining_outlined" },
  { category: "faq_category_delivery", q: "faq_delivery_fees_question", a: "faq_delivery_fees_answer", icon: "local_shipping_outlined" },
  { category: "faq_category_delivery", q: "faq_delivery_contactless_question", a: "faq_delivery_contactless_answer", icon: "no_meeting_room_outlined" },
  { category: "faq_category_account", q: "faq_account_track_question", a: "faq_account_track_answer", icon: "location_on_outlined" },
  { category: "faq_category_account", q: "faq_account_incorrect_question", a: "faq_account_incorrect_answer", icon: "error_outline" },
  { category: "faq_category_account", q: "faq_account_dietary_question", a: "faq_account_dietary_answer", icon: "restaurant_menu_outlined" },
];
const CATEGORIES = ["faq_category_all", "faq_category_orders", "faq_category_payment", "faq_category_delivery", "faq_category_account"];

function FaqCard({ q, a, icon }: { q: string; a: string; icon: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ paddingBottom: 12 }}>
      <div onClick={() => setOpen(!open)} style={{ background: C.cardBackground, borderRadius: 12, border: `1px solid ${open ? withOpacity(RED, 0.5) : "#DEE2E6"}`, cursor: "pointer", padding: 16, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon name={icon} size={24} color={RED} /><span style={{ width: 12 }} />
          <span style={{ flex: 1, fontSize: 17, fontWeight: 500, color: "#2B2D42" }}>{t(q)}</span>
          <Icon name={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={24} color={RED} />
        </div>
        {open && (
          <>
            <div style={{ height: 12 }} />
            <div style={{ fontSize: 15, color: "#495057", lineHeight: 1.6 }}>{t(a)}</div>
          </>
        )}
      </div>
    </div>
  );
}

function ContactButton({ icon, label, href, enabled = true }: { icon: string; label: string; href?: string; enabled?: boolean }) {
  const inner = (
    <div style={{ padding: "14px 20px", background: `rgba(255,255,255,${enabled ? 0.2 : 0.1})`, borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", cursor: enabled ? "pointer" : "default" }}>
      <Icon name={icon} size={20} color="#fff" /><span style={{ width: 10 }} />
      <span style={{ color: `rgba(255,255,255,${enabled ? 1 : 0.5})`, fontSize: 14, fontWeight: 500 }}>{label}</span>
    </div>
  );
  return enabled && href ? <a href={href} style={{ textDecoration: "none" }}>{inner}</a> : inner;
}

// Port of lib/features/menu/screens/ourfaq.dart
export function FaqScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const [cat, setCat] = useState("faq_category_all");
  const isDesktop = u.width >= 1200;
  const list = cat === "faq_category_all" ? FAQS : FAQS.filter((f) => f.category === cat);
  return (
    <div style={{ flex: 1, background: "#F8F9FA", width: "100%" }}>
      <GradientHero expanded={isDesktop ? 280 : 220} icon="help_outline_rounded" title={t("faq")} subtitle={t("faq_subtitle")} />
      <div style={{ animation: "fadeIn 800ms ease-in-out both" }}>
        <ResponsiveColumn width={u.width}>
          <div style={{ padding: isDesktop ? 48 : 24 }}>
            <div style={{ padding: 8, background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,.05)", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((k) => {
                const sel = cat === k;
                return (
                  <div key={k} onClick={() => setCat(k)} style={{ padding: "12px 20px", borderRadius: 12, background: sel ? C.primary : "transparent", color: sel ? "#fff" : "#495057", fontWeight: sel ? 600 : 500, fontSize: 14, cursor: "pointer" }}>{t(k)}</div>
                );
              })}
            </div>
            <div style={{ height: 32 }} />
            {list.map((f, i) => <FaqCard key={`${cat}-${i}`} q={f.q} a={f.a} icon={f.icon} />)}
            <div style={{ height: 48 }} />
            <div style={{ padding: 32, background: `linear-gradient(90deg, ${C.primary}, rgba(216,78,23,.9))`, borderRadius: 20, boxShadow: `0 8px 20px ${withOpacity(C.primary, 0.3)}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Icon name="headset_mic" size={56} color="#fff" />
              <div style={{ height: 20 }} />
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", textAlign: "center" }}>{t("faq_contact_title")}</div>
              <div style={{ height: 12 }} />
              <div style={{ textAlign: "center", fontSize: 16, color: "rgba(255,255,255,.9)", lineHeight: 1.5 }}>{t("faq_contact_subtitle")}</div>
              <div style={{ height: 28 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                <ContactButton icon="email_outlined" label={t("faq_contact_email")} href="mailto:support@saborly.es" />
                <ContactButton icon="phone_outlined" label={t("faq_contact_phone")} href="tel:+34932112072" />
                <ContactButton icon="chat_bubble_outline" label={t("faq_contact_chat")} enabled={false} />
              </div>
            </div>
            <div style={{ height: 32 }} />
          </div>
        </ResponsiveColumn>
      </div>
      {isDesktop && <FoodKingFooter />}
    </div>
  );
}
