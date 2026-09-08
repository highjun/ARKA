import { createToken } from "#core/di";
import type { IActivityBarRegistry } from "./model/IActivityBarRegistry";
import type { IActivityModel } from "./model/IActivityModel";
import type { ISidebarContentRegistry } from "./model/ISidebarContentRegistry";
import type { IStorage } from "./model/IStorage";
import type { ITabContentRegistry } from "./model/ITabContentRegistry";
import type { ITabsModel } from "./model/ITabsModel";
import type { IThemeModel } from "./model/IThemeModel";
import type { IShellViewModel } from "./viewmodel/IShellViewModel";

export const StorageToken = createToken<IStorage>("storage");
export const ActivityModelToken = createToken<IActivityModel>("activityModel");
export const TabsModelToken = createToken<ITabsModel>("tabsModel");
export const ThemeModelToken = createToken<IThemeModel>("themeModel");
export const ActivityBarRegistryToken = createToken<IActivityBarRegistry>("activityBarRegistry");
export const SidebarContentRegistryToken =
  createToken<ISidebarContentRegistry>("sidebarContentRegistry");
export const TabContentRegistryToken = createToken<ITabContentRegistry>("tabContentRegistry");
export const ShellViewModelToken = createToken<IShellViewModel>("shellViewModel");
