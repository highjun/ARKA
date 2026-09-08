import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import styles from './Slider.module.css';
import * as Primitive from '@radix-ui/react-slider';

/**
 * 라이브러리(Radix) 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다(`Container`와 같은 결).
 *
 * `dir`은 Radix Slider Root가 `'ltr' | 'rtl'`로 더 좁게 요구해 일반 `HTMLAttributes`의 `string`과
 * 충돌해 뺀다(이 컴포넌트는 방향 전환을 지원하지 않는다). `defaultValue`도 마찬가지 이유로 빼고
 * 아래에서 숫자 하나짜리로 다시 선언한다.
 */
export interface SliderProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onChange' | 'dir' | 'defaultValue'> {
  /** 넘기면 controlled, 안 넘기면 `defaultValue`로 Radix가 내부 상태를 자체 관리한다(uncontrolled). */
  readonly value?: number;
  /** uncontrolled 모드의 초깃값 — `value`를 넘기면 무시된다. */
  readonly defaultValue?: number;
  /** 탐색 가능한 최솟값. */
  readonly min?: number;
  /** 탐색 가능한 최댓값. */
  readonly max: number;
  /** 조작을 막고 트랙·thumb 색을 `--bgColor-disabled`로 바꾼다. */
  readonly disabled?: boolean;
  /** 값이 바뀔 때마다(드래그 도중 포함, controlled 여부 무관) 호출된다. */
  readonly onValueChange?: (value: number) => void;
  readonly 'aria-label': string;
}

/**
 * 값 하나짜리(단일 thumb) 탐색 슬라이더 — `@radix-ui/react-slider`를 감싼다.
 *
 * `value`/`onValueChange`는 숫자 하나로 노출한다 — Radix는 다중 thumb 대비 배열을 쓰는데,
 * 여기선 그 계약을 그대로 드러내지 않는다(소비자가 매번 배열을 다루게 하지 않으려고).
 *
 * 트랙 두께·thumb 표시 여부는 CSS(`:hover`/`:focus-visible`)로만 바뀐다 — 유튜브 스크러버처럼
 * 평소엔 얇고 조작할 때만 두꺼워지는 것도 이 컴포넌트가 갖는 외형이라(`Slider.module.css`),
 * 소비자(View)는 배치만 잡으면 된다.
 */
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(
  ({ value, defaultValue, min = 0, max, onValueChange, className, disabled, 'aria-label': ariaLabel, ...props }, ref) => {
    const handleValueChange = (next: readonly number[]): void => {
      const nextValue = next[0];
      if (nextValue !== undefined) onValueChange?.(nextValue);
    };

    return (
      <Primitive.Root
        {...props}
        ref={ref}
        className={clsx(className, styles['root'])}
        value={value === undefined ? undefined : [value]}
        defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
        min={min}
        max={max}
        disabled={disabled}
        onValueChange={handleValueChange}
        data-component="Slider"
      >
        <Primitive.Track className={styles['track']}>
          <Primitive.Range className={styles['range']} />
        </Primitive.Track>
        {/* `aria-label`은 실제 상호작용 대상(role="slider")인 Thumb 에 둔다 — Root 는 래퍼일 뿐이다. */}
        <Primitive.Thumb className={styles['thumb']} aria-label={ariaLabel} />
      </Primitive.Root>
    );
  },
);
Slider.displayName = 'Slider';
