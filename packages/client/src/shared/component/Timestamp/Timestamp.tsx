import type { HTMLAttributes, Ref } from 'react';
import { clsx } from 'clsx';
import styles from './Timestamp.module.css';
import { formatTimestamp } from './shared';

/** `relative`·`duration`은 `now`를 기준으로 다시 계산된다 — 스스로 흐르지는 않는다. */
export type TimestampMode = 'datetime' | 'relative' | 'duration';

/** epoch ms와 Date 중 정확히 하나만 — 판별 유니온이라 컴파일 단계에서 강제된다. */
type TimestampInput = { readonly epoch: number; readonly date?: never } | { readonly date: Date; readonly epoch?: never };

/** `children`을 막는다 — 내용은 `mode`와 입력이 정한다. */
export type TimestampProps = TimestampInput &
  Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    /** 루트 `span`으로 그대로 통과한다. */
    readonly ref?: Ref<HTMLSpanElement>;
    readonly mode: TimestampMode;
    /** `datetime`/`duration` 전용 포맷 토큰(`YYYY`/`MM`/`DD`/`HH`/`mm`/`ss`) — 생략 시 각각
     * `'YYYY-MM-DD HH:mm'`/`'HH시간 mm분'`이 기본값. `duration`에서는 같은 토큰을 경과
     * 일/시/분/초로 재해석한다(`YYYY`/`MM`은 미지원, 리터럴로 남는다). `relative`는 무시한다. */
    readonly format?: string;
    /** `relative`/`duration` 계산 기준 "지금" — 테스트를 결정적으로 만드는 주입 지점. */
    readonly now?: number;
  };

/** 순수 표시용이라도 `ref`를 통과시킨다 — Primer의 같은 부류도 그렇다. */
export const Timestamp = ({
  className,
  mode,
  format,
  // now는 relative/duration 계산의 "지금" 기준이라 렌더 시점의 실제 시각을 반영해야
  // 한다(테스트에선 now prop으로 주입해 결정적으로 만든다). 이 컴포넌트엔 자체 재렌더
  // 루프가 없어 "그 순간의 wall clock"이라는 의도된 동작이다 — useState 지연 초기화로
  // 마운트 시점에 고정하면 부모가 나중에 재렌더해도 시간이 안 갱신되는 회귀가 생긴다.

  now = Date.now(),
  epoch,
  date,
  ref,
  ...props
}: TimestampProps) => {
  const resolved = date ?? new Date(epoch as number);
  const text = formatTimestamp(mode, resolved, now, format);

  return (
    <span
      ref={ref}
      aria-label={`시각: ${text}`}
      className={clsx(className, styles['Timestamp'])}
      {...props}
      data-component="Timestamp"
    >
      {text}
    </span>
  );
};

