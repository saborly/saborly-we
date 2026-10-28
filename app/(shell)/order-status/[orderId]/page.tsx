import { OrderStatusScreen } from "@/components/screens/OrderStatusScreen";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <div className="fx-plain" style={{ display: "contents" }}><OrderStatusScreen orderId={orderId} /></div>;
}
