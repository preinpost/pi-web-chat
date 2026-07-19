import { useEffect } from "react";

interface EdgeSwipeOptions {
  /** 스와이프 감지를 활성화할지 (기본 true) */
  enabled?: boolean;
  /** 터치 시작이 왼쪽 가장자리에서 이 픽셀 이내여야 함 (기본 28px) */
  edgeSize?: number;
  /** 오른쪽으로 이 픽셀 이상 이동해야 트리거 (기본 60px) */
  threshold?: number;
  /** 트리거 시 호출 */
  onSwipeRight: () => void;
}

/**
 * 화면 왼쪽 가장자리에서 오른쪽으로 미는 제스처를 감지한다.
 * 모바일 드로어를 여는 용도.
 */
export function useLeftEdgeSwipe({
  enabled = true,
  edgeSize = 28,
  threshold = 60,
  onSwipeRight,
}: EdgeSwipeOptions) {
  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let fired = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      // 왼쪽 가장자리에서 시작한 터치만 추적
      if (t.clientX <= edgeSize) {
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
        fired = false;
      } else {
        tracking = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || fired) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // 수평 이동이 우세하고 임계값을 넘으면 트리거
      if (dx >= threshold && Math.abs(dx) > Math.abs(dy) * 1.2) {
        fired = true;
        tracking = false;
        onSwipeRight();
      } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
        // 세로 스크롤이면 추적 중단
        tracking = false;
      }
    };

    const onTouchEnd = () => {
      tracking = false;
      fired = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, edgeSize, threshold, onSwipeRight]);
}
