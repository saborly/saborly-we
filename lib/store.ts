"use client";
import { useSyncExternalStore } from "react";

/** Minimal ChangeNotifier equivalent: mutable state + notify(), consumed via useSyncExternalStore. */
export class Store<S extends object> {
  private listeners = new Set<() => void>();
  private snapshot: S;
  constructor(initial: S) { this.snapshot = initial; }
  get state(): S { return this.snapshot; }
  /** Equivalent of mutating fields then notifyListeners(): produces a new snapshot object. */
  set(patch: Partial<S>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((l) => l()); }
  subscribe = (l: () => void) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  getSnapshot = () => this.snapshot;
}

export function useStore<S extends object>(store: Store<S>): S {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
