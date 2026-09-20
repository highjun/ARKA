import { createContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { Container } from "#component/Container";
import type { TabChrome, TabClassNames, TabId, TabRow } from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { StripRootImpl } from "./Strip";

export interface GroupState {
  readonly activeTabId: TabId | null;
  readonly selectedTab?: TabRow;
  readonly hasPanel: boolean;
}

export interface TabGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect" | "content"> {
  readonly ref?: Ref<HTMLElement>;
  readonly tabs: readonly TabRow[];
  readonly activeTabId: TabId | null;
  readonly isNarrow?: boolean;
  readonly content?: ReactNode;
  readonly onSelect?: (tabId: TabId) => void;
  readonly onClose?: (tabId: TabId) => void;
  readonly onReorder?: (nextTabIds: readonly TabId[]) => void;
  readonly onPin?: (tabId: TabId) => void;
  readonly renderTabMenu?: (tabId: TabId) => ReactNode;
  readonly emptyMessage?: ReactNode;
  readonly chrome?: TabChrome;
}

interface GroupImplExtras {
  readonly classNames?: TabClassNames;
  readonly panelLabel?: string;
  readonly renderContent?: (tabId: TabId) => ReactNode;
  readonly panelOverlay?: ReactNode;
  readonly stripOverlay?: ReactNode;
}

const getGroupState = (tabs: readonly TabRow[], activeTabId: TabId | null): GroupState => {
  const selected = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return {
    activeTabId: selected?.id ?? activeTabId,
    selectedTab: selected,
    hasPanel: Boolean(selected),
  };
};

const GroupContext = createContext<GroupState | null>(null);

export const GroupImpl = ({
  tabs,
  activeTabId,
  isNarrow,
  content,
  onSelect,
  onClose,
  onReorder,
  onPin,
  renderTabMenu,
  emptyMessage = "No selected tab",
  panelLabel = "Tab panel",
  renderContent,
  panelOverlay,
  stripOverlay,
  className,
  classNames: providedClassNames,
  ref,
  ...props
}: TabGroupProps & GroupImplExtras) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const state = getGroupState(tabs, activeTabId);
  const selected = state.selectedTab;

  return (
    <ClassNamesContext value={classNames}>
      <GroupContext value={state}>
        <div
          {...props}
          ref={ref as Ref<HTMLDivElement>}
          data-narrow={isNarrow ? "" : undefined}
          className={clsx(className, classNames.group)}
        >
          {tabs.length > 0 ? (
            <StripRootImpl
              className={classNames.groupStrip}
              tabs={tabs}
              activeTabId={state.activeTabId}
              overlay={stripOverlay}
              onSelect={onSelect}
              onClose={onClose}
              onReorder={onReorder}
              onPin={onPin}
              renderTabMenu={renderTabMenu}
            />
          ) : null}
          <div className={classNames.groupPanelWrapper}>
            {selected ? (
              <Container chrome="none" className={classNames.groupPanel}>
                <div className={classNames.groupPanelContent} role="tabpanel" aria-label={panelLabel}>
                  {renderContent ? renderContent(selected.id) : (content ?? <selected.Content tabId={selected.id} />)}
                </div>
              </Container>
            ) : (
              <div className={classNames.groupPanelEmpty} role="tabpanel" aria-label={panelLabel}>
                {emptyMessage}
              </div>
            )}
            {panelOverlay}
          </div>
        </div>
      </GroupContext>
    </ClassNamesContext>
  );
};
GroupImpl.displayName = "Tab.Group";
