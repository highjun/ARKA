import { Component, type ErrorInfo, type ReactNode } from "react";

/** `renderFallback`이 필수다 — 오류를 삼키고 아무것도 안 그리는 상태를 만들지 않는다. */
export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** 자식이 렌더 중 던지면 이것을 대신 그린다. 잡힌 오류를 받아 만든다. */
  readonly renderFallback: (error: Error) => ReactNode;
  /** 잡을 때마다 부른다 — 기록·전송은 부르는 쪽의 몫이다. */
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

type ErrorBoundaryState = { readonly error: Error | null };

/**
 * 렌더 중 오류가 앱 전체를 빈 화면으로 만드는 것을 막는다.
 *
 * 자기 DOM을 그리지 않아 `component/`가 아니라 여기 산다 — `PortalProvider`가 같은 이유로
 * 이 폴더에 있다. 그래서 `data-component`도 `className`도 없다.
 *
 * 클래스 컴포넌트인 것은 React가 `componentDidCatch`를 함수 컴포넌트에 주지 않아서다.
 * 복구는 하지 않는다 — 어떤 상태에서 죽었는지 모르는 채로 다시 그리면 같은 자리에서 또 죽는다.
 * 대신 fallback이 새로고침을 권한다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  /** `Error`가 아닌 것을 던져도(문자열 등) 감싸서 담는다 — fallback이 항상 `Error`를 받는다. */
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  /** 기록만 넘긴다 — 여기서 상태를 바꾸지 않는다. 그건 `getDerivedStateFromError`의 몫이다. */
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  /** 한 번 잡으면 계속 fallback이다 — 복구를 시도하지 않는다. */
  override render(): ReactNode {
    if (this.state.error !== null) return this.props.renderFallback(this.state.error);
    return this.props.children;
  }
}
