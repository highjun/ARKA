import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { usePortalContainer } from "#utils/portal";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./Menu.module.css";
import * as Context from "@radix-ui/react-context-menu";
import * as Dropdown from "@radix-ui/react-dropdown-menu";

type MenuKind = "dropdown" | "context";

export interface MenuProps {
  readonly kind?: MenuKind;
  readonly children?: ReactNode;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

interface MenuTriggerProps extends ComponentPropsWithoutRef<"button"> {
  readonly ref?: Ref<HTMLButtonElement>;
  readonly asChild?: boolean;
  readonly disabled?: boolean;
}

interface MenuContentProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
}

interface MenuItemProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  readonly disabled?: boolean;
  readonly shortcut?: ReactNode;
  readonly onSelect?: (event: Event) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MenuLabelProps extends ComponentPropsWithoutRef<"div"> {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MenuSeparatorProps extends ComponentPropsWithoutRef<"div"> {}

const KindContext = createContext<MenuKind>("dropdown");

const useKind = (): MenuKind => useContext(KindContext);

const MenuRoot = ({ kind = "dropdown", open, defaultOpen = false, onOpenChange, children, ...props }: MenuProps) => {
  const [isOpen, setOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
    caller: "Menu",
  });
  const body = <KindContext value={kind}>{children}</KindContext>;

  return kind === "context" ? (
    <Context.Root {...props} open={isOpen} onOpenChange={setOpen}>
      {body}
    </Context.Root>
  ) : (
    <Dropdown.Root {...props} open={isOpen} onOpenChange={setOpen}>
      {body}
    </Dropdown.Root>
  );
};

const MenuTrigger = ({ className, children, ref, ...props }: MenuTriggerProps) => {
  const shared = { className, ...props };

  return useKind() === "context" ? (
    <Context.Trigger {...shared}>{children}</Context.Trigger>
  ) : (
    <Dropdown.Trigger {...shared} ref={ref}>
      {children}
    </Dropdown.Trigger>
  );
};

const MenuContent = ({ className, children, ref, ...props }: MenuContentProps) => {
  const kind = useKind();
  const container = usePortalContainer();
  const shared = {
    ...props,
    ref,
    "data-component": "Menu",
    "data-kind": kind,
    className: clsx(className, styles["content"]),
  };

  return kind === "context" ? (
    <Context.Portal container={container}>
      <Context.Content {...shared}>{children}</Context.Content>
    </Context.Portal>
  ) : (
    <Dropdown.Portal container={container}>
      <Dropdown.Content {...shared} align="end" sideOffset={4}>
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
};

const MenuItem = ({ className, shortcut, children, ...props }: MenuItemProps) => {
  const shared = { className: clsx(className, styles["item"]), ...props };
  const body = (
    <>
      {children}
      {shortcut === undefined ? null : <span className={styles["itemShortcut"]}>{shortcut}</span>}
    </>
  );

  return useKind() === "context" ? (
    <Context.Item {...shared}>{body}</Context.Item>
  ) : (
    <Dropdown.Item {...shared}>{body}</Dropdown.Item>
  );
};

const MenuLabel = ({ className, ...props }: MenuLabelProps) => {
  const shared = { className: clsx(className, styles["label"]), ...props };

  return useKind() === "context" ? <Context.Label {...shared} /> : <Dropdown.Label {...shared} />;
};

const MenuSeparator = ({ className, ...props }: MenuSeparatorProps) => {
  const shared = { className: clsx(className, styles["separator"]), ...props };

  return useKind() === "context" ? <Context.Separator {...shared} /> : <Dropdown.Separator {...shared} />;
};

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Label: MenuLabel,
  Separator: MenuSeparator,
});
