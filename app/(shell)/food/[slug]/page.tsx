import type { Metadata } from "next";
import { Suspense } from "react";
import { FoodDetailRoute } from "@/components/screens/FoodDetailScreen";
import { API_BASE_URL } from "@/lib/config";
import { foodIdFromSlug } from "@/lib/foodUrl";

type Item = { _id: string; name: Record<string, string> | string; description?: Record<string, string> | string; price?: number; imageUrl?: string; image?: string };

async function load(id: string): Promise<Item | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/food-items/${id}?lang=es`, { next: { revalidate: 600 } });
    if (!r.ok) return null;
    return ((await r.json()) as { item?: Item }).item ?? null;
  } catch { return null; }
}
const pick = (m?: Record<string, string> | string) => (typeof m === "string" ? m : m?.es ?? m?.en ?? Object.values(m ?? {})[0] ?? "");

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await load(foodIdFromSlug(params.slug));
  if (!item) return { title: "Saborly" };
  const name = pick(item.name), desc = pick(item.description);
  const img = item.imageUrl ?? item.image;
  return {
    title: `${name} | Saborly`,
    description: desc || `${name} – Saborly`,
    alternates: { canonical: `/food/${params.slug}` },
    openGraph: { title: `${name} | Saborly`, description: desc, type: "website", images: img ? [img] : undefined },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const id = foodIdFromSlug(params.slug);
  const item = await load(id);
  const ld = item && {
    "@context": "https://schema.org", "@type": "Product", name: pick(item.name), description: pick(item.description),
    image: item.imageUrl ?? item.image, offers: item.price != null ? { "@type": "Offer", priceCurrency: "EUR", price: item.price } : undefined,
  };
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <Suspense fallback={null}><FoodDetailRoute id={id} /></Suspense>
    </>
  );
}
