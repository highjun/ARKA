import { useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEventHandler, PointerEventHandler, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Tab.module.css";
import type { SplitOrientation } from "./shared";

const SASH_LABEL = "칸 크기 조절";
const KEYBOARD_STEP_PX = 24;

/**
 * 끄는 손잡이. 포인터와 방향키만 알고 기하는 모른다 —
 * 잡은 자리에서부터 움직인 거리를 px로 알리고, 그게 몇 %인지는 `Tab.Split`이 자기 상자로 잰다.
 * 방향키 한 번도 한 번의 끌기로 친다(`start → resize → end`).
 */
export interface TabSashProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onResize"> {
  readonly ref?: Ref<HTMLDivElement>;
  /** 나란히 놓인 방향. `"horizontal"`이면 좌우로 끈다. */
  readonly orientation: SplitOrientation;
  readonly onResizeStart?: () => void;
  /** 잡은 자리에서부터의 이동량(px). */
  readonly onResize?: (deltaPx: number) => void;
  readonly onResizeEnd?: () => void;
  readonly disabled?: boolean;
}

export const Sash = ({
  orientation,
  onResizeStart,
  onResize,
  onResizeEnd,
  disabled = false,
  className,
  ref,
  ...props
}: TabSashProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const isHorizontal = orientation === "horizontal";

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const start = isHorizontal ? event.clientX : event.clientY;
    setIsResizing(true);
    onResizeStart?.();

    const onMove = (moveEvent: globalThis.PointerEvent) =>
      onResize?.((isHorizontal ? moveEvent.clientX : moveEvent.clientY) - start);
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setIsResizing(false);
      onResizeEnd?.();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (disabled) return;
    const backward = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const forward = isHorizontal ? "ArrowRight" : "ArrowDown";
    if (event.key !== backward && event.key !== forward) return;

    event.preventDefault();
    onResizeStart?.();
    onResize?.(event.key === forward ? KEYBOARD_STEP_PX : -KEYBOARD_STEP_PX);
    onResizeEnd?.();
  };

  return (
    // ARIA 의 창 분할선은 초점을 받고 방향키로 움직이는 것이 제 모습이다 —
    // 같은 판단이 eslint.config.ts 의 `no-noninteractive-tabindex` 예외에도 이미 적혀 있다.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      aria-label={SASH_LABEL}
      {...props}
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      data-orientation={orientation}
      data-resizing={isResizing ? "" : undefined}
      data-component="Tab/Sash"
      className={clsx(className, styles["sash"])}
    />
  );
};
