import { OrderTrackingScreen } from "@/components/screens/OrderTrackingScreen";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <div className="fx-plain" style={{ display: "contents" }}><OrderTrackingScreen orderId={orderId} /></div>;
}
