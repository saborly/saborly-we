"use client";
import { useState } from "react";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Dialog, Tap, usePopup } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { showSnack } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { DeliveryAddress } from "@/lib/models";
import { MAX_DELIVERY_DISTANCE_KM } from "@/lib/delivery";
import { useScreen } from "@/lib/screenutil";
import { cartStore } from "@/lib/stores/cart";
import {
  checkoutStore, clearAddress, deleteAddress, getDeliveryDistanceText, saveAddress, selectAddress, setDefaultAddress, canDeliver, useCheckout,
} from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";

const grey = { 50: "#FAFAFA", 100: "#F5F5F5", 200: "#EEEEEE", 300: "#E0E0E0", 400: "#BDBDBD" };
const subtotal = () => cartStore.state.items.reduce((s, i) => s + i.totalPrice, 0);

/** Dart `DateTime.now().toString()` => "2026-10-25 14:11:23.123456" (sent as the new address `id`) */
function dartNowString() {
  const d = new Date(), p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}000`;
}

function snackRow(icon: string, text: string, bg: string, durationMs?: number) {
  showSnack(<span style={{ display: "flex", alignItems: "center" }}><Icon name={icon} size={24} color="#fff" /><span style={{ width: 8 }} /><span style={{ flex: 1 }}>{text}</span></span>, { bg, radius: "12px", durationMs });
}

// Port of showAddressSelectionDialog (checkout/widgets/address_selection_dialog.dart), isWeb == true
export function AddressSelectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, any>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [type, setType] = useState("home");
  const [apartment, setApartment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<DeliveryAddress | null>(null);

  if (!open) return null;
  const R = (n: number) => u.r(n);

  const onSearch = async (value: string) => {
    setSearch(value);
    if (value.length > 0) {
      const r = await api.getAddressAutocomplete(value);
      setSuggestions(r.isSuccess && r.data ? r.data : []);
    } else setSuggestions([]);
  };
  const pick = async (s: Record<string, any>) => {
    const r = await api.getPlaceDetails(s.place_id);
    if (r.isSuccess && r.data) {
      const loc = r.data.geometry.location;
      setText(s.description ?? ""); setCoords({ lat: loc.lat, lng: loc.lng }); setShowForm(true);
    }
  };
  const save = async () => {
    if (!apartment.trim()) { snackRow("warning_rounded", t("pleaseEnterApartment"), "#FF9800"); return; }
    const address: DeliveryAddress = {
      id: dartNowString(), type, address: text, apartment: apartment.trim(), instructions: instructions.trim() === "" ? null : instructions.trim(),
      latitude: coords.lat, longitude: coords.lng, isDefault: false,
    };
    selectAddress(address, subtotal());
    if (!canDeliver(checkoutStore.state)) {
      onClose();
      snackRow("error_rounded", `Sorry, this address is beyond our ${MAX_DELIVERY_DISTANCE_KM}km delivery range`, "#F44336", 4000);
      clearAddress();
      return;
    }
    const saved = await saveAddress(address);
    onClose();
    if (saved) snackRow("check_circle_rounded", t("addressSavedWithDistance").replace("{distance}", String(getDeliveryDistanceText())), "#4CAF50");
  };

  const sectionHeader = (title: string, icon: string) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ padding: u.w(8), background: withOpacity(C.primary, 0.1), borderRadius: R(8), display: "flex" }}><Icon name={icon} size={u.sp(18)} color={C.primary} /></div>
      <span style={{ width: u.w(12) }} />
      <span style={{ fontSize: u.sp(16), fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{title}</span>
    </div>
  );
  const outlined = (extra: React.CSSProperties = {}): React.CSSProperties => ({ width: "100%", boxSizing: "border-box", border: `1px solid ${grey[300]}`, borderRadius: R(14), background: "#fff", fontSize: u.sp(15), color: C.textDark, fontFamily: "inherit", outline: "none", ...extra });

  return (
    <Dialog open onClose={onClose} dismissible>
      <div style={{ width: 650, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: R(24), boxShadow: "0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: u.w(24), display: "flex", alignItems: "center", background: `linear-gradient(180deg, ${withOpacity(C.primary, 0.05)}, #fff)`, flex: "none" }}>
          <div style={{ padding: u.w(12), background: C.primary, borderRadius: R(12), display: "flex" }}><Icon name="location_on_rounded" size={u.sp(24)} color="#fff" /></div>
          <span style={{ width: u.w(16) }} />
          <span style={{ flex: 1, fontSize: u.sp(20), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{showForm ? t("completeAddressDetails") : t("selectAddress")}</span>
          <Tap ariaLabel="Close" onClick={onClose} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close_rounded" size={u.sp(24)} color={C.textLight} /></Tap>
        </div>
        <div style={{ height: 1, background: grey[200], flex: "none" }} />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: u.w(24) }}>
          {!showForm ? (
            <>
              {co.savedAddresses.length > 0 && (
                <>
                  {sectionHeader(t("savedAddresses"), "bookmark_rounded")}
                  <div style={{ height: u.h(16) }} />
                  {co.savedAddresses.map((a) => <SavedAddressCard key={a.id} address={a} onClose={onClose} onDelete={() => setConfirmDelete(a)} />)}
                  <div style={{ height: u.h(32) }} />
                </>
              )}
              {sectionHeader(co.savedAddresses.length === 0 ? t("addYourFirstAddress") : t("addNewAddress"), "add_location_alt_rounded")}
              <div style={{ height: u.h(16) }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", background: grey[50], border: `1px solid ${grey[200]}`, borderRadius: R(14), boxSizing: "border-box" }} className="addr-search">
                  <span style={{ paddingLeft: u.w(20), display: "flex" }}><Icon name="search_rounded" size={u.sp(22)} color={C.primary} /></span>
                  <input value={search} placeholder={t("startTypingAddress")} aria-label={t("searchAddress")} onChange={(e) => void onSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", padding: `${u.h(18)}px ${u.w(12)}px`, fontSize: u.sp(15), color: C.textDark, fontFamily: "inherit" }} />
                  {search.length > 0 && <Tap onClick={() => { setSearch(""); setSuggestions([]); }} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="clear_rounded" size={u.sp(20)} color={C.textLight} /></Tap>}
                </div>
              </div>
              <div style={{ height: u.h(16) }} />
              {suggestions.length > 0 ? (
                <div style={{ maxHeight: u.h(280), overflowY: "auto", background: "#fff", borderRadius: R(14), border: `1px solid ${grey[200]}` }}>
                  {suggestions.map((s, i) => (
                    <div key={i}>
                      {i > 0 && <div style={{ height: 1, background: grey[100] }} />}
                      <Tap onClick={() => void pick(s)} style={{ display: "flex", alignItems: "center", padding: `${u.h(8)}px ${u.w(20)}px`, minHeight: 56 }}>
                        <div style={{ padding: u.w(10), background: withOpacity(C.primary, 0.1), borderRadius: R(10), display: "flex" }}><Icon name="location_on_rounded" size={u.sp(22)} color={C.primary} /></div>
                        <span style={{ width: 16 }} />
                        <span style={{ flex: 1, fontSize: u.sp(14), color: C.textDark, fontWeight: 500, lineHeight: 1.4 }}>{s.description?.toString() ?? "No description"}</span>
                        <Icon name="arrow_forward_ios_rounded" size={u.sp(16)} color={C.textLight} />
                      </Tap>
                    </div>
                  ))}
                </div>
              ) : search.length > 0 ? (
                <div style={{ padding: u.w(32), background: grey[50], borderRadius: R(14), border: `1px solid ${grey[200]}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Icon name="search_off_rounded" size={u.sp(48)} color={grey[400]} />
                  <div style={{ height: u.h(12) }} />
                  <div style={{ fontSize: u.sp(15), fontWeight: 600, color: C.textMedium }}>No addresses found</div>
                  <div style={{ height: u.h(6) }} />
                  <div style={{ fontSize: u.sp(13), color: C.textLight }}>Try a different search term</div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ padding: u.w(20), background: withOpacity(C.primary, 0.03), borderRadius: R(14), border: `1px solid ${withOpacity(C.primary, 0.2)}`, display: "flex", alignItems: "center" }}>
                <Icon name="check_circle_rounded" size={u.sp(20)} color={C.primary} /><span style={{ width: u.w(10) }} />
                <span style={{ flex: 1, fontSize: u.sp(14), color: C.textDark, fontWeight: 600 }}>{text}</span>
                <MButton variant="text" onClick={() => { setShowForm(false); setApartment(""); setInstructions(""); }} padding={[u.h(6), u.w(12)]} fg={C.primary}>
                  <Icon name="edit" size={u.sp(16)} color={C.primary} /><span style={{ width: 8 }} /><span>Change</span>
                </MButton>
              </div>
              <div style={{ height: u.h(24) }} />
              <div style={{ fontSize: u.sp(15), fontWeight: 600, color: C.textDark }}>Address Type *</div>
              <div style={{ height: u.h(12) }} />
              <div style={{ display: "flex", gap: u.w(12) }}>
                {([["home", t("home"), "home"], ["office", t("office"), "work"], ["other", t("other"), "location_on"]] as const).map(([val, label, icon]) => {
                  const sel = type === val;
                  return (
                    <Tap key={val} onClick={() => setType(val)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: `${u.h(14)}px ${u.w(12)}px`, borderRadius: R(12), boxSizing: "border-box", background: sel ? C.primary : grey[100], border: `2px solid ${sel ? C.primary : "transparent"}` }}>
                      <Icon name={icon} size={u.sp(18)} color={sel ? "#fff" : C.textMedium} /><span style={{ width: u.w(6) }} />
                      <span style={{ fontSize: u.sp(13), fontWeight: 600, color: sel ? "#fff" : C.textMedium }}>{label}</span>
                    </Tap>
                  );
                })}
              </div>
              <div style={{ height: u.h(24) }} />
              <LabeledField label={t("apartmentNumber")} icon="door_front_door" u={u}>
                <input value={apartment} placeholder={t("apartmentPlaceholder")} onChange={(e) => setApartment(e.target.value)} style={outlined({ border: 0, padding: `${u.h(18)}px ${u.w(12)}px`, flex: 1 } as React.CSSProperties)} />
              </LabeledField>
              <div style={{ height: u.h(20) }} />
              <LabeledField label={t("deliveryInstructions")} icon="notes" u={u} top>
                <textarea rows={3} value={instructions} placeholder={t("deliveryInstructionsPlaceholder")} onChange={(e) => setInstructions(e.target.value)} style={outlined({ border: 0, padding: `${u.h(18)}px ${u.w(12)}px`, flex: 1, resize: "none" } as React.CSSProperties)} />
              </LabeledField>
              <div style={{ height: u.h(32) }} />
              <MButton fullWidth onClick={() => void save()} padding={[u.h(18), u.w(20)]} radius={R(14)} fontSize={u.sp(16)} fontWeight={600}>{t("saveAddress")}</MButton>
            </>
          )}
        </div>
      </div>
      <Dialog open={confirmDelete != null} onClose={() => setConfirmDelete(null)} zIndex={9100}>
        {confirmDelete && (
          <div style={{ background: "#fff", borderRadius: R(20), minWidth: 280, maxWidth: 560, padding: 24, boxSizing: "border-box", boxShadow: "0 11px 15px -7px rgba(0,0,0,.2), 0 24px 38px 3px rgba(0,0,0,.14)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ padding: u.w(10), background: "#FFEBEE", borderRadius: R(10), display: "flex" }}><Icon name="delete_rounded" size={u.sp(24)} color="#D32F2F" /></div>
              <span style={{ width: u.w(12) }} />
              <span style={{ flex: 1, fontSize: u.sp(18), fontWeight: 700, letterSpacing: -0.3 }}>{t("deleteAddress")}</span>
            </div>
            <div style={{ height: 16 }} />
            <div style={{ fontSize: u.sp(14), color: C.textMedium, lineHeight: 1.5 }}>{t("confirmDeleteAddress")}</div>
            <div style={{ height: 24 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <MButton variant="text" onClick={() => setConfirmDelete(null)} padding={[u.h(12), u.w(20)]} fg={C.textMedium} fontSize={u.sp(15)} fontWeight={600}>{t("cancel")}</MButton>
              <MButton onClick={async () => {
                const a = confirmDelete; setConfirmDelete(null);
                const ok = await deleteAddress(a.id);
                if (ok) snackRow("check_circle_rounded", t("addressDeletedSuccessfully"), "#4CAF50");
              }} padding={[u.h(12), u.w(20)]} radius={R(10)} bg="#D32F2F" fontSize={u.sp(15)} fontWeight={600}>{t("delete")}</MButton>
            </div>
          </div>
        )}
      </Dialog>
    </Dialog>
  );
}

function LabeledField({ label, icon, u, top, children }: { label: string; icon: string; u: ReturnType<typeof useScreen>; top?: boolean; children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)} style={{ position: "relative", border: `${focused ? 2 : 1}px solid ${focused ? C.primary : grey[300]}`, borderRadius: u.r(14), background: "#fff", boxSizing: "border-box", display: "flex", alignItems: top ? "flex-start" : "center" }}>
      <span style={{ position: "absolute", top: -9, left: 14, padding: "0 4px", background: "#fff", fontSize: 12, color: focused ? C.primary : "#757575", lineHeight: "16px" }}>{label}</span>
      <span style={{ paddingLeft: u.w(12), paddingTop: top ? u.h(18) : 0, display: "flex" }}><Icon name={icon} size={u.sp(22)} color={C.primary} /></span>
      {children}
    </div>
  );
}

function addressIcon(type?: string | null) {
  switch (type?.toLowerCase()) { case "home": return "home_rounded"; case "office": return "business_rounded"; default: return "location_on_rounded"; }
}

function SavedAddressCard({ address, onClose, onDelete }: { address: DeliveryAddress; onClose: () => void; onDelete: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const menu = usePopup();
  const choose = () => {
    selectAddress(address, subtotal());
    onClose();
    if (!canDeliver(checkoutStore.state)) {
      snackRow("error_rounded", `This address is beyond our ${MAX_DELIVERY_DISTANCE_KM}km delivery range`, "#F44336");
      clearAddress();
    }
  };
  return (
    <div style={{ marginBottom: u.h(14), background: "#fff", borderRadius: u.r(16), border: `1.5px solid ${grey[200]}`, boxShadow: "0 2px 8px rgba(0,0,0,.02)" }}>
      <div onClick={choose} style={{ cursor: "pointer", padding: u.w(16), display: "flex", alignItems: "center" }}>
        <div style={{ padding: u.w(12), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.15)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: u.r(12), display: "flex" }}>
          <Icon name={addressIcon(address.type)} size={u.sp(22)} color={C.primary} />
        </div>
        <span style={{ width: u.w(16) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: u.sp(15), fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{address.type ?? t("home")}</span>
            {address.isDefault && (<><span style={{ width: u.w(8) }} /><span style={{ padding: `${u.h(4)}px ${u.w(8)}px`, background: C.primary, borderRadius: u.r(6), fontSize: u.sp(10), color: "#fff", fontWeight: 600, letterSpacing: 0.3 }}>{t("default")}</span></>)}
          </div>
          <div style={{ height: u.h(6) }} />
          <div style={{ fontSize: u.sp(13), color: C.textMedium, lineHeight: 1.5, letterSpacing: -0.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{address.address}</div>
        </div>
        <span style={{ width: 8 }} />
        <div ref={menu.ref} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <Tap ariaLabel="Menu" onClick={() => menu.setOpen(!menu.open)} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ padding: u.w(6), background: grey[100], borderRadius: u.r(8), display: "flex" }}><Icon name="more_vert_rounded" size={u.sp(20)} color={C.textMedium} /></div>
          </Tap>
          {menu.open && (
            <div style={{ position: "absolute", right: 0, top: 48 + 8, minWidth: 112, background: "#fff", borderRadius: u.r(12), padding: "8px 0", zIndex: 60, boxShadow: "0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)" }}>
              {!address.isDefault && (
                <Tap onClick={async () => { menu.setOpen(false); const ok = await setDefaultAddress(address.id); if (ok) snackRow("check_circle_rounded", t("defaultAddressUpdated"), "#4CAF50"); }} style={{ height: 48, padding: "0 16px", display: "flex", alignItems: "center" }}>
                  <Icon name="star_rounded" size={u.sp(20)} color="#F57C00" /><span style={{ width: u.w(12) }} /><span style={{ fontSize: u.sp(14), fontWeight: 500 }}>{t("setAsDefault")}</span>
                </Tap>
              )}
              <Tap onClick={() => { menu.setOpen(false); onDelete(); }} style={{ height: 48, padding: "0 16px", display: "flex", alignItems: "center" }}>
                <Icon name="delete_rounded" size={u.sp(20)} color="#D32F2F" /><span style={{ width: u.w(12) }} /><span style={{ fontSize: u.sp(14), fontWeight: 500, color: "#D32F2F" }}>{t("delete")}</span>
              </Tap>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
