export type { SidebarAction, SidebarDescriptor } from "./model/ISidebarDescriptor";
export type {
  OpenOptions,
  TabContentProps,
  TabDescriptor,
  TabProviderDescriptor,
} from "./model/ITabProviderDescriptor";
export type { ITabSystem } from "./model/ITabSystem";
export type { BottomDescriptor } from "./model/IBottomDescriptor";
export type { IWorkspace } from "./model/IWorkspace";
export type { ITabLayout, OpenTab, PaneId, PaneLeaf, PaneNode, PaneSplit, SplitOrientation } from "./model/ITabLayout";
export type { IColorMode } from "./model/IColorMode";
export type { IAppLifetime } from "./model/IAppLifetime";
export type { INotifications, Notification, Severity } from "./model/INotifications";
export type { IErrorLog } from "./model/IErrorLog";

export type {
  ActiveBottom,
  ActiveSidebar,
  BottomRow,
  IShellViewModel,
  SidebarActionRow,
  SidebarRow,
} from "./viewmodel/IShellViewModel";
export type {
  ITabSystemViewModel,
  PaneRowLeaf,
  PaneRowNode,
  PaneRowSplit,
  SplitEdge,
  TabContextTarget,
  TabRow,
} from "./viewmodel/ITabSystemViewModel";
export type { INotificationViewModel } from "./viewmodel/INotificationViewModel";
export type { IAppStatusViewModel } from "./viewmodel/IAppStatusViewModel";
export type { ISettingsViewModel, SettingsRow } from "./viewmodel/ISettingsViewModel";
export type { CommandRow, ICommandPaletteViewModel } from "./viewmodel/ICommandPaletteViewModel";
export type { IKeybindingViewModel, KeybindingRow } from "./viewmodel/IKeybindingViewModel";

export type { ShellProps } from "./component/Shell";
export type { ActivityBarBottomProps, ActivityBarRootProps, ActivityBarTopProps } from "./component/ActivityBar";
export type { TabGroupProps, TabHeaderProps, TabProps, TabSplitProps } from "./component/Tab";
export type { CommandPaletteProps } from "./component/CommandPalette/CommandPalette";
