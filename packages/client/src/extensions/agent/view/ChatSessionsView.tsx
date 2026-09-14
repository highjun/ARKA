import { useViewModel } from "#core/viewmodel";
import { Spinner } from "@primer/react";
import { Blankslate } from "@primer/react/experimental";
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

  return (
    <SessionList
      className={styles["root"]}
      heading="에이전트"
      sessions={viewModel.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status ?? undefined,
        timestamp: session.timestamp,
        archived: session.archived,
      }))}
      emptyLabel={viewModel.sessionsFailure ?? "대화가 없다 — 새로 시작하세요."}
      onActiveChange={(session) => open(session.id, session.title)}
      onCreateSession={() => {
        void viewModel.createSession().then((id) => {
          if (id !== null) open(id, "새 대화");
        });
      }}
      createLabel="새 대화"
    />
  );
};
