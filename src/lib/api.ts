import { useQuery } from "@tanstack/react-query";
import type { UIForkPoint, UIModel, UISessionInfo } from "../../shared/protocol";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useSessions(enabled = true) {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetchJson<UISessionInfo[]>("/api/sessions"),
    enabled,
    staleTime: 10_000,
  });
}

export function useForkPoints(enabled = true) {
  return useQuery({
    queryKey: ["fork-points"],
    queryFn: () => fetchJson<UIForkPoint[]>("/api/fork-points"),
    enabled,
    staleTime: 0,
  });
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => fetchJson<UIModel[]>("/api/models"),
    staleTime: 5 * 60_000,
  });
}
