import { useEffect, useRef, useState } from 'react';

/**
 * usePullToRefresh - attaches pull-to-refresh gesture to a scrollable element.
 * @param {Function} onRefresh - async function called when refresh is triggered
 * @param {Object} options
 * @param {number} options.threshold - px to pull before triggering (default 80)
 * @returns {{ containerRef, isRefreshing, pullDistance }}
 */
export default function usePullToRefresh(onRefresh, { threshold = 80 } = {}) {
  const containerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e) => {
      const scrollTop = containerRef.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      if (scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current || isRefreshingRef.current) return;
      const dist = Math.max(0, e.touches[0].clientY - startY.current);
      const clamped = Math.min(dist * 0.5, threshold * 1.2);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistanceRef.current >= threshold) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(0);
        pullDistanceRef.current = 0;
        await onRefreshRef.current();
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    const target = containerRef.current || window;
    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: true });
    target.addEventListener('touchend', onTouchEnd);

    return () => {
      target.removeEventListener('touchstart', onTouchStart);
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // sem dependências — estável

  return { containerRef, isRefreshing, pullDistance };
}