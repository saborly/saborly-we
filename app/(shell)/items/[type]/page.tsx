import { ItemsGridPage } from "@/components/screens/ItemsGridPage";
export default function Page({ params }: { params: { type: string } }) {
  return <ItemsGridPage type={params.type === "popular" ? "popular" : "featured"} />;
}
