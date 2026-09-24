/**
 * 스토리북 툴바의 viewport 전역이 모바일 구간인지 읽는다.
 * CSS 중단점(768px)과 `isNarrow` 가 한 스위치로 같이 움직이게 하는 고리다.
 */
export const isNarrowViewport = (globals: Record<string, unknown>): boolean => {
  const viewport = globals["viewport"];
  if (typeof viewport === "string") return viewport === "mobile";
  if (typeof viewport !== "object" || viewport === null) return false;
  return (viewport as { readonly value?: unknown }).value === "mobile";
};
