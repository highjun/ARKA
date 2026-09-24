import { CommandService } from "#core/commands";
import type { Disposable } from "#core/di";
import type { ExtensionModule } from "#core/extensions";
import { Registry } from "#core/registry";
import { Settings, type ISettings } from "#core/settings";
import { URI } from "#contracts";
import { createDocumentDensity, DENSITY_SETTING_ID } from "./infra/DocumentDensity";
import { createDocumentTheme } from "./infra/DocumentTheme";
import { createErrorNotifier } from "./infra/ErrorNotifier";
import { createGlobalErrorHandlers } from "./infra/GlobalErrorHandlers";
import { createGlobalKeybindings } from "./infra/GlobalKeybindings";
import { createServerInfoPort } from "./infra/HttpServerInfo";
import { createStoragePort } from "./infra/LocalStorage";
import { createUnloadGuard } from "./infra/UnloadGuard";
import { createUpdateNotifier } from "./infra/UpdateNotifier";
import { createUpdateWatch } from "./infra/UpdateWatch";
import { createViewportQuery } from "./infra/ViewportQuery";
import { AppLifetime } from "./model/AppLifetime";
import { ColorMode } from "./model/ColorMode";
import { ErrorLog } from "./model/ErrorLog";
import type { ServerInfo } from "./model/IServerInfo";
import { Notifications } from "./model/Notifications";
import { findLeaf } from "./model/paneTree";
import { TabLayout } from "./model/TabLayout";
import { TabSystem } from "./model/TabSystem";
import { Workspace } from "./model/Workspace";
import { notificationsTabProvider } from "./notifications.contribution";
import { settingsTabProvider } from "./settings.contribution";
import { AppStatusViewModel } from "./viewmodel/AppStatusViewModel";
import { CommandPaletteViewModel } from "./viewmodel/CommandPaletteViewModel";
import { KeybindingViewModel } from "./viewmodel/KeybindingViewModel";
import { NotificationViewModel } from "./viewmodel/NotificationViewModel";
import { SettingsViewModel } from "./viewmodel/SettingsViewModel";
import { ShellViewModel } from "./viewmodel/ShellViewModel";
import { TabSystemViewModel } from "./viewmodel/TabSystemViewModel";

declare module "#core/di" {
  interface InstanceMap {
    "arka.settings": ISettings;
    "arka.workbench.globalErrorHandlers": Disposable;
    "arka.workbench.errorNotifier": Disposable;
    "arka.workbench.documentTheme": Disposable;
    "arka.workbench.documentDensity": Disposable;
    "arka.workbench.globalKeybindings": Disposable;
    "arka.workbench.unloadGuard": Disposable;
    "arka.workbench.updateWatch": Disposable;
    "arka.workbench.updateNotifier": Disposable;
  }
}

const KEYBINDING_OVERRIDES_KEY = "workbench.keybindings";
const SETTINGS_KEY = "workbench.settings";

const isOpenContext = (value: unknown): value is { readonly uri: URI; readonly preview?: boolean } =>
  typeof value === "object" && value !== null && "uri" in value && value.uri instanceof URI;
const isRetargetContext = (value: unknown): value is { readonly oldPrefix: string; readonly newPrefix: string } =>
  typeof value === "object" &&
  value !== null &&
  "oldPrefix" in value &&
  typeof value.oldPrefix === "string" &&
  "newPrefix" in value &&
  typeof value.newPrefix === "string";

export const workbench: ExtensionModule = {
  id: "arka.workbench",
  provides: [
    { id: "arka.workbench.storage", lifetime: "singleton", create: createStoragePort },
    {
      id: "arka.workbench.serverInfo",
      lifetime: "singleton",
      create: () => {
        const port = createServerInfoPort();
        let loading: Promise<ServerInfo | null> | undefined;
        return {
          load: () =>
            (loading ??= port.load().finally(() => {
              loading = undefined;
            })),
        };
      },
    },
    {
      id: "arka.commands",
      lifetime: "singleton",
      create: (c) => {
        const storage = c.resolve("arka.workbench.storage");
        return new CommandService({
          overridesStore: {
            load: () => JSON.parse(storage.get(KEYBINDING_OVERRIDES_KEY) ?? "{}") as Record<string, string | null>,
            save: (overrides) => storage.set(KEYBINDING_OVERRIDES_KEY, JSON.stringify(overrides)),
          },
          reportError: (error) => c.resolve("arka.workbench.errorLog").report(error, "command"),
        });
      },
    },
    {
      id: "arka.settings",
      lifetime: "singleton",
      create: (c) => {
        const storage = c.resolve("arka.workbench.storage");
        return new Settings({
          store: {
            load: () => JSON.parse(storage.get(SETTINGS_KEY) ?? "{}") as Record<string, unknown>,
            save: (values) => storage.set(SETTINGS_KEY, JSON.stringify(values)),
          },
        });
      },
    },
    { id: "arka.workbench.sidebar", lifetime: "singleton", create: () => new Registry() },
    { id: "arka.workbench.bottom", lifetime: "singleton", create: () => new Registry() },
    { id: "arka.workbench.tabSystem", lifetime: "singleton", create: () => new Registry() },
    { id: "arka.workbench.viewport", lifetime: "singleton", create: createViewportQuery },
    { id: "arka.workbench.errorLog", lifetime: "singleton", create: () => new ErrorLog() },
    { id: "arka.workbench.notifications", lifetime: "singleton", create: () => new Notifications() },
    {
      id: "arka.workbench.appLifetime",
      lifetime: "singleton",
      create: (c) =>
        new AppLifetime({ serverInfo: c.resolve("arka.workbench.serverInfo"), reload: () => location.reload() }),
    },
    {
      id: "arka.workbench.workspace",
      lifetime: "singleton",
      create: (c) => new Workspace({ serverInfo: c.resolve("arka.workbench.serverInfo") }),
    },
    {
      id: "arka.workbench.tabLayout",
      lifetime: "singleton",
      create: (c) => new TabLayout({ storage: c.resolve("arka.workbench.storage") }),
    },
    {
      id: "arka.workbench.tabs",
      lifetime: "singleton",
      create: (c) =>
        new TabSystem({
          layout: c.resolve("arka.workbench.tabLayout"),
          providers: c.resolve("arka.workbench.tabSystem"),
          notifications: c.resolve("arka.workbench.notifications"),
          root: c,
        }),
    },
    {
      id: "arka.workbench.colorMode",
      lifetime: "singleton",
      create: (c) => new ColorMode({ storage: c.resolve("arka.workbench.storage") }),
    },
    {
      id: "arka.workbench.shellViewModel",
      lifetime: "singleton",
      create: (c) =>
        new ShellViewModel({
          sidebars: c.resolve("arka.workbench.sidebar"),
          bottoms: c.resolve("arka.workbench.bottom"),
          colorMode: c.resolve("arka.workbench.colorMode"),
          viewport: c.resolve("arka.workbench.viewport"),
          tabLayout: c.resolve("arka.workbench.tabLayout"),
          commands: c.resolve("arka.commands"),
        }),
    },
    {
      id: "arka.workbench.tabSystemViewModel",
      lifetime: "singleton",
      create: (c) =>
        new TabSystemViewModel({
          tabLayout: c.resolve("arka.workbench.tabLayout"),
          tabs: c.resolve("arka.workbench.tabs"),
          commands: c.resolve("arka.commands"),
          copyToClipboard: (text) => void navigator.clipboard.writeText(text),
        }),
    },
    {
      id: "arka.workbench.notificationViewModel",
      lifetime: "singleton",
      create: (c) =>
        new NotificationViewModel({
          notifications: c.resolve("arka.workbench.notifications"),
          commands: c.resolve("arka.commands"),
        }),
    },
    {
      id: "arka.workbench.appStatusViewModel",
      lifetime: "singleton",
      create: (c) =>
        new AppStatusViewModel({
          appLifetime: c.resolve("arka.workbench.appLifetime"),
          workspace: c.resolve("arka.workbench.workspace"),
        }),
    },
    {
      id: "arka.workbench.settingsViewModel",
      lifetime: "singleton",
      create: (c) => new SettingsViewModel({ settings: c.resolve("arka.settings") }),
    },
    {
      id: "arka.workbench.commandPaletteViewModel",
      lifetime: "singleton",
      create: (c) => new CommandPaletteViewModel({ commands: c.resolve("arka.commands") }),
    },
    {
      id: "arka.workbench.keybindingViewModel",
      lifetime: "singleton",
      create: (c) => new KeybindingViewModel({ commands: c.resolve("arka.commands") }),
    },
    {
      id: "arka.workbench.globalErrorHandlers",
      lifetime: "singleton",
      create: (c) => createGlobalErrorHandlers({ errorLog: c.resolve("arka.workbench.errorLog") }),
    },
    {
      id: "arka.workbench.errorNotifier",
      lifetime: "singleton",
      create: (c) =>
        createErrorNotifier({
          errorLog: c.resolve("arka.workbench.errorLog"),
          notifications: c.resolve("arka.workbench.notifications"),
        }),
    },
    {
      id: "arka.workbench.documentTheme",
      lifetime: "singleton",
      create: (c) => createDocumentTheme({ colorMode: c.resolve("arka.workbench.colorMode") }),
    },
    {
      id: "arka.workbench.documentDensity",
      lifetime: "singleton",
      create: (c) => createDocumentDensity({ settings: c.resolve("arka.settings") }),
    },
    {
      id: "arka.workbench.globalKeybindings",
      lifetime: "singleton",
      create: (c) => createGlobalKeybindings({ commands: c.resolve("arka.commands") }),
    },
    {
      id: "arka.workbench.unloadGuard",
      lifetime: "singleton",
      create: (c) => createUnloadGuard({ tabs: c.resolve("arka.workbench.tabs") }),
    },
    {
      id: "arka.workbench.updateWatch",
      lifetime: "singleton",
      create: (c) => createUpdateWatch({ appLifetime: c.resolve("arka.workbench.appLifetime") }),
    },
    {
      id: "arka.workbench.updateNotifier",
      lifetime: "singleton",
      create: (c) =>
        createUpdateNotifier({
          appLifetime: c.resolve("arka.workbench.appLifetime"),
          notifications: c.resolve("arka.workbench.notifications"),
        }),
    },
  ],
  activate: (c) => {
    c.resolve("arka.settings").schema.add({
      id: DENSITY_SETTING_ID,
      title: "밀도",
      type: "enum",
      default: "auto",
      options: ["auto", "compact", "touch"],
    });
    const tabProviders = c.resolve("arka.workbench.tabSystem");
    tabProviders.add(settingsTabProvider);
    tabProviders.add(notificationsTabProvider);

    const commands = c.resolve("arka.commands");
    const activeTab = () => {
      const layout = c.resolve("arka.workbench.tabLayout");
      const leaf = findLeaf(layout.tree, layout.activePaneId);
      return leaf?.tabs.find((tab) => tab.id === leaf.activeTabId) ?? null;
    };
    commands.contexts.add({ id: "tab.active.uri", value: () => activeTab()?.uri ?? null });
    commands.contexts.add({ id: "tab.active.kind", value: () => activeTab()?.kind ?? null });
    commands.actions.add({
      id: "arka.workbench.open",
      label: "탭으로 열기",
      execute: (context) => {
        if (!isOpenContext(context)) return;
        void c.resolve("arka.workbench.tabs").open(context.uri, { preview: context.preview === true });
      },
    });
    commands.actions.add({
      id: "arka.workbench.retargetTabs",
      label: "탭: 옮겨진 경로 따라가기",
      execute: (context) => {
        if (!isRetargetContext(context)) return;
        c.resolve("arka.workbench.tabSystemViewModel").retargetTabs(context.oldPrefix, context.newPrefix);
      },
    });

    c.resolve("arka.workbench.globalErrorHandlers");
    c.resolve("arka.workbench.errorNotifier");
    c.resolve("arka.workbench.documentTheme");
    c.resolve("arka.workbench.documentDensity");
    c.resolve("arka.workbench.globalKeybindings");
    c.resolve("arka.workbench.unloadGuard");
    c.resolve("arka.workbench.updateWatch");
    c.resolve("arka.workbench.updateNotifier");
    c.resolve("arka.workbench.shellViewModel");
    c.resolve("arka.workbench.tabSystemViewModel");
    c.resolve("arka.workbench.commandPaletteViewModel");
    c.resolve("arka.workbench.appStatusViewModel");
    c.resolve("arka.workbench.notificationViewModel");
  },
};
