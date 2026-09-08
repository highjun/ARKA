import { Component, type ErrorInfo, type ReactNode } from 'react';

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
 * 클래스 컴포넌트인 것은 React가 `componentDidCatch`를 함수 컴포넌트에 주지 않아서다.
 * 복구는 하지 않는다 — 어떤 상태에서 죽었는지 모르는 채로 다시 그리면 같은 자리에서 또 죽는다.
 * 대신 fallback이 새로고침을 권한다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.error !== null) return this.props.renderFallback(this.state.error);
    return this.props.children;
  }
}
