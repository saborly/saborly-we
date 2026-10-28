"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Name of the branch saved in api.branchId (the commerce store only holds a placeholder branch). */
export function useBranchName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      const id = api.branchId;
      if (!id) { setName(null); return; }
      api.request("GET", "/branches/public")
        .then((r) => {
          const hit = (r.data.branches ?? []).find((b: any) => `${b._id}` === id);
          if (alive && api.branchId === id && hit?.name) setName(`${hit.name}`);
        })
        .catch(() => {});
    };
    load();
    const off = api.onBranchChange(load); // header stays mounted across routes: refresh when the branch changes
    return () => { alive = false; off(); };
  }, []);
  return name;
}
