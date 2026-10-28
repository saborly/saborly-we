"use client";
import { AppErrorWidget } from "@/components/AppErrorWidget";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <AppErrorWidget message={error.message} />;
}
