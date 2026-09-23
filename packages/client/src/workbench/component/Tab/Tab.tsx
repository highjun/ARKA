import type { Ref } from "react";
import { buildClassNames } from "./TabContext";
import { TabHeader } from "./Header";
import { StripItems, StripRootImpl } from "./Strip";
import type { TabStripProps } from "./Strip";
import { GroupImpl } from "./Group";
import type { TabGroupProps } from "./Group";
import { SplitRootImpl } from "./Split";
import type { TabSplitProps } from "./Split";

const StripRoot = ({ className, ...props }: TabStripProps) => (
  <StripRootImpl {...props} classNames={buildClassNames()} className={className} />
);

const TabStrip = Object.assign(StripRoot, { Items: StripItems });

const TabGroup = ({ className, chrome, ref, ...props }: TabGroupProps) => (
  <GroupImpl
    {...props}
    ref={ref}
    classNames={buildClassNames()}
    className={className}
    data-chrome={chrome ?? "bordered"}
    data-component="Tab"
  />
);
TabGroup.displayName = "Tab.Group";

const TabSplit = ({ className, chrome, ref, ...props }: TabSplitProps) => (
  <SplitRootImpl
    {...props}
    ref={ref}
    classNames={buildClassNames()}
    className={className}
    data-chrome={chrome ?? "bordered"}
    data-component="Tab"
  />
);
TabSplit.displayName = "Tab.Split";

export type TabProps = (TabSplitProps | (TabGroupProps & { readonly tree?: never })) & {
  readonly ref?: Ref<HTMLElement>;
};

const TabRoot = ({ ref, ...props }: TabProps) =>
  props.tree ? <TabSplit {...props} ref={ref} /> : <TabGroup {...props} ref={ref} />;
TabRoot.displayName = "Tab";

export const Tab = Object.assign(TabRoot, { Header: TabHeader, Strip: TabStrip, Group: TabGroup, Split: TabSplit });

export type { PaneRowLeaf, PaneRowSplit, TabRow } from "./shared";
export type { TabGroupProps } from "./Group";
