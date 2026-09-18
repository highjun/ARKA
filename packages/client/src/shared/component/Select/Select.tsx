import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { usePortalContainer } from "#utils/portal";
import { Icon } from "#component/Icon";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./Select.module.css";
import * as Dropdown from "@radix-ui/react-dropdown-menu";

/**
 * 값 하나를 고르는 목록. `Menu`의 `RadioGroup`·`RadioItem`이었던 것을 떼어 냈다(2026-09-18) —
 * 메뉴는 동작 목록이고 값을 고르는 것은 다른 부품이다(Figma 의 오버레이 분류와 맞춘다).
 *
 * `Menu`와 같은 이유로 Radix 를 쓴다(→ ADR 0009). 우클릭 `kind`는 없다 — 값 고르기는 늘 단추가 연다.
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 계약이 라이브러리를 따라 바뀌지 않게.
 */
export interface SelectProps {
  /** 제어 모드의 지금 값. */
  readonly value?: string;
  /** 비제어 모드의 처음 값. */
  readonly defaultValue?: string;
  /** 다른 값을 고르면 호출된다(제어 여부와 무관). */
  readonly onValueChange?: (value: string) => void;
  /** 제어 모드의 열림 여부. */
  readonly open?: boolean;
  /** 비제어 모드의 초기 열림 여부. 기본값 `false`. */
  readonly defaultOpen?: boolean;
  /** 열림 여부가 바뀔 때마다 호출된다. */
  readonly onOpenChange?: (open: boolean) => void;
  /** `Trigger`·`Content` 를 둔다. */
  readonly children?: ReactNode;
}

/** 목록을 여는 단추. 보이는 것은 소비자가 넣는다 — 지금 값을 적은 `Button` 처럼. */
interface SelectTriggerProps extends ComponentPropsWithoutRef<"button"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLButtonElement>;
  /** true면 Radix가 속성을 자식에 병합만 하고 자기 태그는 안 그린다 — 자식이 이미 버튼일 때. */
  readonly asChild?: boolean;
  /** true면 눌러도 열리지 않는다. */
  readonly disabled?: boolean;
}

/** 고를 수 있는 줄들을 담는 면. 포탈로 나가므로 조상의 `overflow`에 잘리지 않는다. */
interface SelectContentProps extends ComponentPropsWithoutRef<"div"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
}

/** 값 한 줄. 고른 줄에 체크가 선다. */
interface SelectItemProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  /** 이 줄이 나타내는 값. */
  readonly value: string;
  /** true면 고를 수 없고 흐리게 표시된다. */
  readonly disabled?: boolean;
}

/** `Content`가 루트의 값 상태를 읽는 통로 — Radix `RadioGroup`은 `Content` 안에 있어야 한다. */
const ValueContext = createContext<{
  value?: string;
  setValue: (value: string) => void;
}>({ setValue: () => undefined });

/** 값과 열림 상태를 든다 — 자기 DOM은 그리지 않는다. 보이는 것은 `Trigger`와 `Content`다. */
const SelectRoot = ({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: SelectProps) => {
  const [isOpen, setOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
    caller: "Select",
  });
  // 값은 "아직 고른 것 없음"이 있어 `string | undefined` 다. 바깥엔 고른 값만 알린다.
  const [current, setCurrent] = useControllableState<string | undefined>({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
    caller: "Select",
  });

  return (
    <Dropdown.Root open={isOpen} onOpenChange={setOpen}>
      <ValueContext value={{ value: current, setValue: setCurrent }}>{children}</ValueContext>
    </Dropdown.Root>
  );
};

const SelectTrigger = ({ ref, ...props }: SelectTriggerProps) => <Dropdown.Trigger {...props} ref={ref} />;

/** 줄들을 담는 면. 루트의 값을 Radix `RadioGroup`으로 내려 고른 줄에 표시가 붙게 한다. */
const SelectContent = ({ className, children, ref, ...props }: SelectContentProps) => {
  const container = usePortalContainer();
  const { value, setValue } = useContext(ValueContext);

  return (
    <Dropdown.Portal container={container}>
      <Dropdown.Content
        {...props}
        ref={ref}
        data-component="Select"
        className={clsx(className, styles["content"])}
        align="end"
        sideOffset={4}
      >
        <Dropdown.RadioGroup value={value} onValueChange={setValue}>
          {children}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Portal>
  );
};

/**
 * 값 한 줄. 표시를 `ItemIndicator`로 그리고 자리를 항상 차지하게 둔다(`.indicator`) — 고른 줄만
 * 들여쓰기가 생기면 목록이 들쭉날쭉해진다.
 */
const SelectItem = ({ className, children, ...props }: SelectItemProps) => (
  <Dropdown.RadioItem {...props} className={clsx(className, styles["item"])}>
    <span className={styles["indicator"]}>
      <Dropdown.ItemIndicator>
        <Icon iconId="check" size="sm" />
      </Dropdown.ItemIndicator>
    </span>
    {children}
  </Dropdown.RadioItem>
);

/** 부품 함수 이름이 `Select<부품>`인 것은 react-docgen-typescript 가 최상위 export 만 컴포넌트로 보기 때문이다(`Menu`와 같다). */
export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
});
