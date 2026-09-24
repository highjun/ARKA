import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { usePortalContainer } from "#lib/portal";
import { Icon } from "#ui/Icon";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./Select.module.css";
import * as Dropdown from "@radix-ui/react-dropdown-menu";

export interface SelectProps {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: ReactNode;
}

interface SelectTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "children" | "value"> {
  readonly ref?: Ref<HTMLButtonElement>;
  readonly visual?: ReactNode;
  readonly value?: string;
  readonly disabled?: boolean;
}

interface SelectContentProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
}

interface SelectItemProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  readonly value: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
}

const ValueContext = createContext<{
  value?: string;
  setValue: (value: string) => void;
}>({ setValue: () => undefined });

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

const SelectTrigger = ({ className, visual, value, ref, ...props }: SelectTriggerProps) => {
  const { value: current } = useContext(ValueContext);

  return (
    <Dropdown.Trigger {...props} ref={ref} className={clsx(className, styles["trigger"])}>
      {visual}
      <span className={styles["value"]}>{value ?? current}</span>
      <Icon iconId="chevronDown" size="sm" />
    </Dropdown.Trigger>
  );
};

const SelectContent = ({ className, children, ref, ...props }: SelectContentProps) => {
  const container = usePortalContainer();

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
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
};

const SelectItem = ({ className, children, value, selected, ...props }: SelectItemProps) => {
  const { value: current, setValue } = useContext(ValueContext);
  const isSelected = selected ?? current === value;

  return (
    <Dropdown.Item
      {...props}
      className={clsx(className, styles["item"])}
      role="menuitemradio"
      aria-checked={isSelected}
      onSelect={() => {
        setValue(value);
      }}
    >
      <span className={styles["indicator"]}>{isSelected ? <Icon iconId="check" size="sm" /> : null}</span>
      {children}
    </Dropdown.Item>
  );
};

export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
});
