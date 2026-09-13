import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { clsx } from 'clsx';
import styles from './Container.module.css';
import * as Primitive from '@radix-ui/react-scroll-area';

/** `none`은 테두리와 배경을 지운다 — 자리는 그대로 차지한다. */
export type ContainerChrome = 'visible' | 'none';
/** 마운트할 스크롤바 축을 정한다 — 안 마운트한 축은 Radix가 그 방향 스크롤 자체를 안 켠다. */
export type ContainerScroll = 'auto' | 'none' | 'horizontal' | 'vertical';

/** `headless.tsx`와 `styled.tsx` 사이의 계약이었던 것 — 조각이 다섯이라 슬롯마다 다른 클래스가
 * 필요해 `classNames`로 묶는다. 이름을 `*Props`로 안 끝내는 건 의도적이다 — `scrollbars`가
 * 리터럴 유니언 배열이라 lint의 "컨트롤 가능한 prop 탐지"가 `*Props`로 끝나는 선언을 전부
 * 훑는데, 이건 공개 Props가 아니라 `Container` 내부에서만 쓰는 조립 계약이라 그 탐지 대상에서
 * 빠져야 한다. */
interface ScrollAreaRootConfig {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  readonly className?: string;
  readonly children?: ReactNode;
  /** 마운트할 Scrollbar 축 — 마운트 안 한 축은 Radix가 애초에 그 방향 스크롤 자체를 안 켠다. */
  readonly scrollbars: readonly ('horizontal' | 'vertical')[];
  readonly classNames?: {
    readonly viewport?: string;
    readonly scrollbarVertical?: string;
    readonly scrollbarHorizontal?: string;
    readonly thumb?: string;
    readonly corner?: string;
  };
}

/**
 * `@radix-ui/react-scroll-area`를 아는 유일한 함수 — 이 파일에서 이 라이브러리를 직접 참조하는
 * 곳은 여기뿐이다. Container·Viewport·Scrollbar·Thumb·Corner 다섯 조각을 여기서 조립해 감추고, 밖에는
 * `<Container>{children}</Container>` 하나로 보인다.
 *
 * ref 는 Viewport 로 보낸다 — 스크롤 위치를 읽거나 옮기는 대상이 항상 Viewport 이기 때문이다
 * (client-architecture.md 1.3 Component "DOM 접근").
 */
const ScrollAreaRoot = ({ className, classNames, children, scrollbars, ref, ...props }: ScrollAreaRootConfig) => (
  <Primitive.Root className={className} {...props} data-component="Container">
    <Primitive.Viewport ref={ref} className={classNames?.viewport}>
      {children}
    </Primitive.Viewport>
    {scrollbars.includes('vertical') && (
      <Primitive.Scrollbar orientation="vertical" className={classNames?.scrollbarVertical}>
        <Primitive.Thumb className={classNames?.thumb} />
      </Primitive.Scrollbar>
    )}
    {scrollbars.includes('horizontal') && (
      <Primitive.Scrollbar orientation="horizontal" className={classNames?.scrollbarHorizontal}>
        <Primitive.Thumb className={classNames?.thumb} />
      </Primitive.Scrollbar>
    )}
    <Primitive.Corner className={classNames?.corner} />
  </Primitive.Root>
);
ScrollAreaRoot.displayName = 'Container.ScrollAreaRoot';

const SCROLLBARS_BY_AXIS: Record<Exclude<ContainerScroll, 'none'>, readonly ('horizontal' | 'vertical')[]> = {
  auto: ['horizontal', 'vertical'],
  horizontal: ['horizontal'],
  vertical: ['vertical'],
};

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 테두리·배경·radius. 프레임 안쪽 우물로 쓸 때는 `none`. */
  readonly chrome?: ContainerChrome;
  /**
   * `'none'`이면 Radix ScrollArea 없이 순수 테두리 박스로 렌더한다 — `overflow: visible`이라
   * 내용이 넘쳐도 자르지 않는다. 높이 제약이 없는 카드처럼 "그냥 테두리 있는 상자"가 필요한
   * 자리에 쓴다.
   *
   * `'horizontal'`/`'vertical'`은 그 축의 Radix Scrollbar만 마운트한다 — `'auto'`(기본값)는
   * 둘 다 마운트하는데, Radix는 마운트된 축만 `overflow: scroll`을 켜기 때문에(소스로 확인)
   * 가로 스크롤만 쓰고 싶은 자리(예: `Tab`의 탭 스트립)에서 `'auto'`를 쓰면 세로쪽 미세한
   * 오버플로(아이콘의 1px 광학 보정 같은)만 생겨도 세로 스크롤바가 함께 뜨는 문제가 있었다
   * (2026-08-31 지적으로 확인). 항상 양쪽 다 필요하면 `'auto'`를 그대로 둔다.
   */
  readonly scroll?: ContainerScroll;
}

/**
 * `common/`의 기본 스크롤 컨테이너 — Tab·Shell·ActivityBar 등 스크롤이 필요한 자리는 항상 이걸
 * 쓴다(raw `overflow: auto` div를 직접 두지 않는다). 스캐폴드를 이 컴포넌트가 소유한다 —
 * `<Container>{children}</Container>` 하나로 끝난다.
 *
 * ref는 실제로 스크롤되는 Viewport에 꽂는다(ScrollAreaRoot가 아니라) — 스크롤 위치 관찰 같은
 * 명령형 접근이 필요할 때 쓰는 대상은 항상 Viewport다(client-architecture.md 1.3 Component
 * "DOM 접근" 참고).
 */
export const Container = ({ children, chrome = 'visible', scroll = 'auto', className, ref, ...props }: ContainerProps) => {
  if (scroll === 'none') {
    return (
      <div {...props} ref={ref} data-component="Container" data-chrome={chrome} data-scroll="none" className={clsx(className, styles['root'])}>
        {children}
      </div>
    );
  }
  return (
    <ScrollAreaRoot
      {...props}
      ref={ref}
      data-chrome={chrome}
      data-scroll={scroll}
      scrollbars={SCROLLBARS_BY_AXIS[scroll]}
      className={clsx(className, styles['root'])}
      classNames={{
        viewport: styles['viewport'],
        scrollbarVertical: styles['scrollbarVertical'],
        scrollbarHorizontal: styles['scrollbarHorizontal'],
        thumb: styles['thumb'],
        corner: styles['corner'],
      }}
    >
      {children}
    </ScrollAreaRoot>
  );
};

