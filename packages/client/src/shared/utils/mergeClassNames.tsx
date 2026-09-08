import clsx from 'clsx';
import type { ClassValue } from 'clsx';

/**
 * 사용자 `className`을 앞에, 컴포넌트 자체 스타일(CSS Module 클래스)을 뒤에 두는 병합 순서를
 * 함수 시그니처(첫 인자 = 사용자, 나머지 = 내부)로 고정한다(Radix `Slot`처럼) — 매 호출부마다
 * `clsx()` 인자 순서를 맞게 썼는지 볼 필요가 없어진다.
 */
export function mergeClassNames(userClassName: string | undefined, ...moduleClasses: readonly ClassValue[]): string {
  return clsx(userClassName, ...moduleClasses);
}
