/** SEO-friendly food URL: /food/<name-slug>-<id>. The id (Mongo ObjectId, no dashes) is always the last "-" segment. */
export const slugify = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
export const foodHref = (item: { id: string; name: string }) => {
  const s = slugify(item.name);
  return `/food/${s ? s + "-" : ""}${encodeURIComponent(item.id)}`;
};
export const foodIdFromSlug = (slug: string) => decodeURIComponent(slug).split("-").pop() ?? "";
