import { Children, useRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref, RefCallback } from "react";
import { clsx } from "clsx";
import styles from "./Tab.module.css";
import { Sash } from "./Sash";
import type { SplitOrientation } from "./shared";

const MIN_SIZE_PERCENT = 10;
const MAX_SIZE_PERCENT = 90;

const clampSize = (size: number): number =>
  Math.min(MAX_SIZE_PERCENT, Math.max(MIN_SIZE_PERCENT, Number(size.toFixed(2))));

const mergeRefs =
  <T,>(...refs: ReadonlyArray<Ref<T> | null | undefined>): RefCallback<T> =>
  (node) => {
    for (const current of refs) {
      if (current == null) continue;
      if (typeof current === "function") current(node);
      else (current as { current: T | null }).current = node;
    }
  };

/** 자식을 한 줄로 세우고 **사이마다** Sash를 끼운다. 자식이 n개면 Sash는 n-1개다. */
export interface TabSplitProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onResize"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly children?: ReactNode;
  readonly orientation: SplitOrientation;
  /** 자기가 또 다른 Split의 자식일 때 차지할 비율(%). */
  readonly size?: number;
  /** Sash를 끌면 그 앞 자식의 새 비율(%)을 알린다. 없으면 Sash를 안 그린다. */
  readonly onResize?: (childIndex: number, nextSize: number) => void;
}

export const Split = ({
  children,
  orientation,
  size,
  onResize,
  className,
  style,
  ref,
  ...props
}: TabSplitProps) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  /** 끌기를 시작한 순간의 자식 크기와 상자 크기. 이동량(px)을 비율(%)로 옮기는 기준이다. */
  const grabRef = useRef<{ index: number; childPx: number; boxPx: number } | null>(null);
  const nodes = Children.toArray(children);
  const isHorizontal = orientation === "horizontal";

  const beginResize = (index: number) => {
    const box = boxRef.current;
    // Sash가 자식 사이에 하나씩 끼므로 i번째 자식은 DOM에서 2i번째다.
    const child = box?.children[index * 2];
    if (!box || !(child instanceof HTMLElement)) return;

    const boxRect = box.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    grabRef.current = {
      index,
      childPx: isHorizontal ? childRect.width : childRect.height,
      boxPx: isHorizontal ? boxRect.width : boxRect.height,
    };
  };

  const applyResize = (deltaPx: number) => {
    const grab = grabRef.current;
    if (!grab || grab.boxPx === 0) return;
    onResize?.(grab.index, clampSize(((grab.childPx + deltaPx) / grab.boxPx) * 100));
  };

  return (
    <div
      ref={mergeRefs(boxRef, ref)}
      {...props}
      style={size === undefined ? style : { ...style, flexBasis: `${size}%`, flexGrow: 0, flexShrink: 0 }}
      data-orientation={orientation}
      data-component="Tab/Split"
      className={clsx(className, styles["split"])}
    >
      {nodes.flatMap((node, index) =>
        onResize === undefined || index === nodes.length - 1
          ? [node]
          : [
              node,
              <Sash
                key={`sash-${String(index)}`}
                orientation={orientation}
                onResizeStart={() => beginResize(index)}
                onResize={applyResize}
              />,
            ],
      )}
    </div>
  );
};
