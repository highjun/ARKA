import { forwardRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './ModeToggle.module.css';
import { IconButton } from '@primer/react';

export type ModeToggleValues = readonly [string, string];
export type ModeToggleChildren = readonly [ReactNode, ReactNode];
export type ModeToggleLabels = readonly [string, string];

/** 순수 함수 — `cva()`처럼 값을 계산해 반환하고, 컴포넌트는 그 반환값을 그대로 스프레드한다. */
const getToggleProps = (values: ModeToggleValues, value: string, disabled: boolean, onChange: (value: string) => void) => {
  const currentIndex = value === values[1] ? 1 : 0;
  const nextIndex = currentIndex === 0 ? 1 : 0;

  return {
    currentIndex,
    'aria-pressed': currentIndex === 1,
    'data-state': values[currentIndex],
    onClick: () => {
      if (disabled) return;
      onChange(values[nextIndex]);
    },
  } as const;
};

/** `labels`도 호출부의 `aria-label`도 없는 극단적인 경우를 위한 마지막 안전망 — 아이콘 버튼은 접근성
 * 이름 없이 렌더되면 안 된다(`IconButton`이 `aria-label`을 필수로 요구하는 이유와 같다). */
const getLabel = (labels: ModeToggleLabels | undefined, currentIndex: number, fallback: string | undefined) =>
  labels?.[currentIndex] ?? fallback ?? '전환';

/**
 * Primer `IconButton`을 그대로 감싼다 — 이 파일에서 `@primer/react`를 직접 참조하는 곳은
 * 여기뿐이다. 정사각형 크기·appearance 리셋·hover/focus 배경·(호버 시) 툴팁까지 전부
 * `IconButton`이 이미 갖고 있어서, 우리가 손으로 다시 만들 이유가 없다(예전엔 raw
 * `<button>`이라 `appearance: none`을 빠뜨려 브라우저 기본 테두리/음영이 남아있던 버그가 있었다).
 * `.root`에 남은 CSS는 터치 타겟 확장(`::after`)뿐이다.
 *
 * `forwardRef` — `IconButton` 자신이 forwardRef(`ForwardRefComponent<"button" | "a", IconButtonProps>`,
 * `IconButton.d.ts` 확인)다. 우리가 감싸면서 그 ref 접근을 잃으면 raw `IconButton`을 쓸 때보다
 * 기능이 줄어든다.
 */
export interface ModeToggleRootProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-labelledby' | 'children' | 'onClick' | 'style' | 'value'> {
  /** 두 상태 각각에 표시할 아이콘 — `[values[0]일 때, values[1]일 때]` 순서로 짝을 맞춘다. */
  readonly children: ModeToggleChildren;
  /** 두 상태 각각의 접근성 이름 — 없으면 `aria-label`을 쓴다. */
  readonly labels?: ModeToggleLabels;
  /** 토글이 오갈 두 상태 값. */
  readonly values: ModeToggleValues;
  /** 넘기면 controlled, 안 넘기면 `defaultValue`(기본은 `values[0]`)로 컴포넌트가 자체 관리한다. */
  readonly value?: string;
  /** uncontrolled 모드의 초깃값. 기본값 `values[0]`. */
  readonly defaultValue?: string;
  /** 클릭으로 상태가 바뀔 때마다(controlled 여부 무관) 호출된다. */
  readonly onValueChange?: (value: string) => void;
  /** 켜져 있으면 클릭해도 값이 안 바뀐다(hover/focus 배경도 옅어진다). `ButtonHTMLAttributes`가
   * 이미 갖는 필드지만, 값 전달뿐 아니라 토글 로직 자체를 이 값으로 분기하는 컴포넌트 고유
   * 동작이라 여기 다시 선언해 문서를 남긴다. */
  readonly disabled?: boolean;
}

const Root = forwardRef<HTMLButtonElement, ModeToggleRootProps>(
  (
    {
      'aria-label': ariaLabel,
      children,
      className,
      defaultValue,
      disabled = false,
      labels,
      onValueChange,
      value,
      values,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? values[0]);
    const resolvedValue = value ?? uncontrolledValue;
    const handleChange = (next: string) => {
      if (value === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    const { currentIndex, ...toggleProps } = getToggleProps(values, resolvedValue, disabled, handleChange);
    const icon = () => children[currentIndex];

    return (
      <IconButton
        ref={ref}
        {...props}
        {...toggleProps}
        icon={icon}
        aria-label={getLabel(labels, currentIndex, ariaLabel)}
        disabled={disabled}
        variant="invisible"
        data-component="ModeToggle"
        className={clsx(className, styles['root'])}
      />
    );
  },
);
Root.displayName = 'ModeToggle';

export type { ModeToggleRootProps as ModeToggleProps };
export const ModeToggle = assembleCompound('ModeToggle', Root, {});
