/** Constantes partilhadas para listas virtualizadas P38 */
export const P38_VIRTUAL_OVERSCAN = 8;
export const P38_VIRTUAL_MIN_ROWS = 50;
export const P38_VIRTUAL_LIST_MAX_HEIGHT = 'calc(100vh - 260px)';

export const measureVirtualItem = (element) => element?.getBoundingClientRect().height ?? 0;

export function getVirtualPadding(virtualItems, totalSize) {
  if (virtualItems.length === 0) {
    return { paddingTop: 0, paddingBottom: 0 };
  }

  const paddingTop = virtualItems[0]?.start ?? 0;
  const lastItem = virtualItems[virtualItems.length - 1];
  const paddingBottom = Math.max(0, totalSize - (lastItem?.end ?? 0));

  return { paddingTop, paddingBottom };
}
