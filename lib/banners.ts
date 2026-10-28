// Port of BannerService / ContactService (lib/core/services/banner_service.dart). These call the API with plain http
// (no language/branch headers, no ApiService cache), so they use fetch directly.
import { API_BASE_URL } from "./config";

export interface BannerModel { id: string; title: string; imageUrl: string; order: number; isActive: boolean; link: string | null; description: string | null; category: string }

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, BannerModel[]>(), cacheTime = new Map<string, number>();
export function invalidateBannerCache() { cache.clear(); cacheTime.clear(); }

export async function getActiveBanners(category?: string): Promise<BannerModel[]> {
  const key = category ?? "_all_";
  const ts = cacheTime.get(key);
  if (ts != null && Date.now() - ts < CACHE_TTL_MS) return cache.get(key) ?? [];
  try {
    const res = await fetch(`${API_BASE_URL}/banners/active`);
    if (res.status !== 200) throw new Error("Failed to load banners");
    const data = await res.json();
    const banners: BannerModel[] = (data.data as any[]).map((j) => {
      if (typeof j._id !== "string" || typeof j.title !== "string" || typeof j.imageUrl !== "string") throw new Error("bad banner");
      return { id: j._id, title: j.title, imageUrl: j.imageUrl, order: j.order ?? 0, isActive: j.isActive ?? true, link: j.link ?? null, description: j.description ?? null, category: j.category ?? "general" };
    });
    cache.set(key, banners); cacheTime.set(key, Date.now());
    return banners;
  } catch { return []; }
}

export async function submitContactForm(p: { name: string; email: string; subject: string; message: string; phone?: string }): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    const res = await fetch(`${API_BASE_URL}/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: p.name, email: p.email, subject: p.subject, message: p.message, ...(p.phone ? { phone: p.phone } : {}) }),
    });
    const data = await res.json();
    if (res.status === 201) return { success: true, message: data.message ?? "Mensaje enviado correctamente", data: data.data };
    return { success: false, message: data.message ?? "Error al enviar el mensaje" };
  } catch { return { success: false, message: "Error de conexión. Por favor verifica tu internet." }; }
}
