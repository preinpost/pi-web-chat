import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UIExtensionsResponse,
  UIForkPoint,
  UIModel,
  UISessionInfo,
} from "../../shared/protocol";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const SESSIONS_QUERY_KEY = ["sessions"] as const;

export function useSessions(enabled = true) {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => fetchJson<UISessionInfo[]>("/api/sessions"),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/** 세션 생성/전환/메시지 완료 후 사이드바 목록 갱신 */
export function useInvalidateSessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
}

export function useForkPoints(enabled = true) {
  return useQuery({
    queryKey: ["fork-points"],
    queryFn: () => fetchJson<UIForkPoint[]>("/api/fork-points"),
    enabled,
    staleTime: 0,
  });
}

export function useExtensions(enabled = true) {
  return useQuery({
    queryKey: ["extensions"],
    queryFn: () => fetchJson<UIExtensionsResponse>("/api/extensions"),
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
