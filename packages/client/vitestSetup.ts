import '@testing-library/jest-dom/vitest';

/**
 * jsdom은 `ResizeObserver`와 `Element.prototype.scrollIntoView`를 구현하지 않는다(cmdk·Radix Select가
 * 마운트 시 무조건 호출) — 실제 레이아웃 계산이 필요 없는 테스트 환경이라 동작 없는 스텁으로 채운다.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.scrollIntoView ??= () => {};

/**
 * jsdom(30)은 `adoptedStyleSheets`를 아예 만들지 않는다 — `@primer/react` 38.38의 Tooltip이
 * 마운트할 때 `[...root.adoptedStyleSheets]`로 펼쳐서 "not iterable"로 죽는다. 프로토타입에
 * 빈 배열을 두면 읽기는 여기서 받고, 대입은 인스턴스 자기 속성으로 덮인다.
 */
if (!("adoptedStyleSheets" in Document.prototype)) {
  Object.defineProperty(Document.prototype, "adoptedStyleSheets", {
    configurable: true,
    writable: true,
    value: [],
  });
}

/** jsdom은 `window.matchMedia`도 구현하지 않는다(Primer의 `useMedia`가 마운트 시 호출) — 항상 "불일치"로 답하는 스텁. */
window.matchMedia ??=
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

/**
 * jsdom은 `PointerEvent`를 아예 안 만든다(`typeof PointerEvent === 'undefined'`) — Radix의
 * dropdown-menu(`Menu`)류는 트리거를 `click`이 아니라 `pointerdown`(`event.button === 0`)에서
 * 연다(실제 마우스는 pointerdown이 click보다 먼저 온다). `fireEvent.pointerDown`이 이 생성자가
 * 없으면 `button`/`pointerId` 같은 필드가 빠진 이벤트를 만들어 저 체크를 통과 못 시킨다 —
 * `MouseEvent`를 상속한 최소 스텁으로 그 필드만 채운다.
 */
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? '';
      this.isPrimary = params.isPrimary ?? false;
    }
  }

  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
