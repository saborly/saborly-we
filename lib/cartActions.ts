"use client";
import { createElement } from "react";
import { showSnack, hideSnack } from "@/components/ui/Toast";
import { C } from "./colors";
import { FoodItem, effectivePriceForPlatform } from "./models";
import { translate } from "./i18n";
import { addItem, removeItem } from "./stores/cart";
import { languageStore } from "./stores/language";

export const PLATFORM = "web";
export const needsCustomization = (i: FoodItem) => i.mealSizes.length > 0 || i.extras.length > 0 || i.addons.length > 0;

/**
 * Direct add-to-cart used by FoodItemAddButton and the home dish cards: the item price is replaced by the
 * platform-effective price (offer applied), then the "added" snackbar with Undo is shown.
 * `style` selects the two SnackBar variants found in Dart.
 */
export function addPlainItemToCart(item: FoodItem, style: "card" | "dish") {
  const t = (k: string) => translate(k, languageStore.state.language);
  const priced = { ...item, price: effectivePriceForPlatform(item, PLATFORM) };
  addItem({ foodItem: priced });
  hideSnack();
  showSnack(t("addedToCart").replace("{itemName}", item.name), {
    bg: C.success,
    durationMs: style === "card" ? 5000 : 4000,
    radius: style === "card" ? "16px 16px 0 0" : "14px",
    action: { label: t("undo"), onClick: () => removeItem(item.id) },
  });
  void createElement;
}
