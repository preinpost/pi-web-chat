/**
 * 세션 드로어 열기 요청 이벤트 버스.
 *
 * SessionsDrawer 는 base-ui Dialog 의 open 상태를 내부에서 관리하므로,
 * 엣지 스와이프 제스처처럼 외부에서 드로어를 열려면 이 이벤트로 요청한다.
 */
const listeners = new Set<() => void>();

/** 드로어 열기 요청 (구독 중인 SessionsDrawer 가 open) */
export function requestOpenSessionsDrawer() {
  for (const l of listeners) l();
}

/** 드로어 열기 요청 구독. cleanup 함수 반환. */
export function onRequestOpenSessionsDrawer(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
