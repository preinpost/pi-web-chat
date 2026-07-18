import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pi-web-chat:sidebar-pinned";
const listeners = new Set<() => void>();

function readPinned(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let cache = typeof window !== "undefined" ? readPinned() : false;

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSidebarPinned(): boolean {
  return cache;
}

export function setSidebarPinned(pinned: boolean) {
  cache = pinned;
  try {
    localStorage.setItem(STORAGE_KEY, pinned ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  emit();
}

export function toggleSidebarPinned() {
  setSidebarPinned(!cache);
}

export function useSidebarPinned(): boolean {
  return useSyncExternalStore(subscribe, () => cache, () => false);
}
