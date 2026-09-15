import { useViewModel } from "#core/viewmodel";
import { Spinner } from "@primer/react";
import { Blankslate } from "@primer/react/experimental";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Menu } from "#component/Menu";
import { SessionList } from "../component/SessionList";
import { ChatViewModelToken } from "../viewmodel/IChatViewModel";
import styles from "./ChatSessionsView.module.css";

/** 탭의 kind. 조립부의 `TabContentRegistry` 등록과 같아야 한다. */
export const CHAT_TAB_KIND = "chat";

/**
 * 사이드바의 세션 목록. 세션을 고르면 대화 **탭**을 연다 — 폰의 드로어는 대화를 담기엔 좁다
 * (VSCode의 "에디터에서 채팅 열기"와 같다).
 */
export const ChatSessionsView = ({
  onOpenTab,
}: {
  readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
}) => {
  const viewModel = useViewModel(ChatViewModelToken);
  const open = (id: string, title: string) => onOpenTab({ id, kind: CHAT_TAB_KIND, title });

  if (viewModel.sessionsLoading && viewModel.sessions.length === 0) {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <Spinner size="medium" srText="세션을 읽는 중" />
        </Blankslate.Visual>
      </Blankslate>
    );
  }

  // 머리는 커널이 그린다(`SidebarContentDescriptor`) — 그래서 거르는 것도 여기서 한다.
  const visible = viewModel.showArchived
    ? viewModel.sessions
    : viewModel.sessions.filter((session) => !session.archived);

  return (
    <SessionList
      chrome="none"
      className={styles["root"]}
      sessions={visible.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status ?? undefined,
        timestamp: session.timestamp,
        archived: session.archived,
      }))}
      emptyLabel={viewModel.sessionsFailure ?? "대화가 없다 — 새로 시작하세요."}
      onActiveChange={(session) => open(session.id, session.title)}
    />
  );
};

/** 패널 머리에 그대로 놓이는 것 — 새 대화 하나다(`SidebarContentDescriptor.InlineActions`). */
export const ChatSessionsInlineActions = ({
  onOpenTab,
}: {
  readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
}) => {
  const viewModel = useViewModel(ChatViewModelToken);
  return (
    <IconButton
      variant="invisible"
      size="small"
      aria-label="새 대화"
      onClick={() => {
        void viewModel.createSession().then((id) => {
          if (id !== null) onOpenTab({ id, kind: CHAT_TAB_KIND, title: "새 대화" });
        });
      }}
      icon={() => <Icon iconId="add" size="sm" />}
    />
  );
};

/** `'...'` 뒤로 접히는 것(`SidebarContentDescriptor.MenuActions`). */
export const ChatSessionsMenuActions = () => {
  const viewModel = useViewModel(ChatViewModelToken);
  return (
    <Menu.Item onSelect={() => viewModel.setShowArchived(!viewModel.showArchived)}>
      {viewModel.showArchived ? <Icon iconId="check" size="sm" /> : null}
      보관된 세션 표시
    </Menu.Item>
  );
};
