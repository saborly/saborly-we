import { Suspense } from "react";
import { FoodDetailRoute } from "@/components/screens/FoodDetailScreen";
export default function Page() { return <Suspense fallback={null}><FoodDetailRoute /></Suspense>; }
