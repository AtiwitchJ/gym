import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * Bottom padding for the page so the fixed bottom dock (rest bar + tabs) never covers set rows
 * (regular tester item 2). The padding is the dock's measured height plus a small gap.
 */
export const DOCK_GAP_PX = 16;

/** Pure: the padding in px for a dock of `dockHeight` px. */
export function dockPaddingPx(dockHeight, gap = DOCK_GAP_PX) {
  const h = Number(dockHeight);
  return (Number.isFinite(h) && h > 0 ? Math.ceil(h) : 0) + gap;
}

/** Keeps the dock's height in a ref and returns the matching CSS padding for the page. */
export function useDockPadding(dockRef) {
  const height = ref(0);
  let observer = null;

  function measure() {
    const el = dockRef.value;
    height.value = el ? el.offsetHeight : 0;
  }

  onMounted(() => {
    measure();
    if (typeof ResizeObserver !== 'undefined' && dockRef.value) {
      observer = new ResizeObserver(measure);
      observer.observe(dockRef.value);
    }
    if (typeof window !== 'undefined') window.addEventListener('resize', measure);
  });

  onUnmounted(() => {
    if (observer) observer.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', measure);
  });

  return computed(() => `${dockPaddingPx(height.value)}px`);
}
