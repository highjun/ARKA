import { createToken } from '#core/di';
import type { PaneId } from '../model/ITabsModel';

/**
 * `shared/components`의 `TabSplitOrientation`·`SplitEdgeDropPosition`과 값이 같다 — ViewModel도 Model과
 * 같은 이유로 외부 라이브러리를 직접 import 하지 않는다(`MODEL-13`, ViewModel도 대상이다). Model이
 * `TabSplitOrientation`을 이미 선언해 뒀지만 그걸 가져다 쓰는 대신 여기서도 다시 선언한다 —
 * 가져다 쓰면 이 파일이 `export type { TabSplitOrientation }`로 다시 내보내야 View 층까지
 * 닿는데, 재수출 전용 statement는 `model-type-only`(`type.ts`는 타입 선언만 담는다)에 걸린다.
 */
export type TabSplitOrientation = 'horizontal' | 'vertical';
export type SplitEdgeDropPosition = 'left' | 'right' | 'top' | 'bottom';

/** 탭 우클릭 메뉴(`menuId: 'shell.tab.context'`) 커맨드가 받는 대상 — 어느 pane의 어느 탭인지. */
export type TabContextTarget = { readonly leafId: PaneId; readonly tabId: string };

/**
 * 화면이 그릴 탭 한 줄.
 *
 * Model 의 `OpenTab` 과 거의 같지만 **내용(`ReactNode`)은 없다** — `ITabContentRegistry`가
 * `kind`로 찾아 그린다(View가 안다, ViewModel은 모른다). 아이콘은 탭마다 registry 조회가
 * 필요해 View에서 병합한다.
 */
export type ShellTabRow = {
  /** 워크스페이스 루트 기준 경로다. */
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  /** 미리보기 자리에 있다 — 다음 파일을 열면 이 탭이 갈린다. 화면은 기울임으로 알린다. */
  readonly isPreview: boolean;
  /** 저장 안 된 변경이 있다. 답은 `ITabDirtyState`가 주고, 셸은 무엇이 더러운지 모른다. */
  readonly isDirty: boolean;
};

/**
 * 화면이 그릴 탭 트리 한 조각. Model 의 `TabPaneNode` 와 재귀 구조가 같다(leaf/split) — 다만
 * leaf 의 탭 목록이 `OpenTab[]`이 아니라 `ShellTabRow[]`다(위 `ShellTabRow` 주석과 같은 이유,
 * `isPreview`가 여기서 파생된다).
 */
export interface ShellTabPaneLeaf {
  readonly kind: 'leaf';
  readonly id: PaneId;
  readonly tabs: readonly ShellTabRow[];
  readonly activeTabId: string | null;
  readonly size?: number;
}
/** `ShellTabPaneLeaf`와 짝을 이루는 분할 노드. */
export interface ShellTabPaneSplit {
  readonly kind: 'split';
  readonly id: PaneId;
  readonly orientation: TabSplitOrientation;
  readonly children: readonly ShellTabPaneNode[];
  readonly size?: number;
}
export type ShellTabPaneNode = ShellTabPaneLeaf | ShellTabPaneSplit;

/**
 * 화면이 그릴 사이드바 활동 한 줄.
 *
 * `iconId`가 있다 — `IActivityBarRegistry`에서 나온 문자열 하나일 뿐이라(React 컴포넌트가 아니다)
 * ViewModel이 들고 있어도 일반 MVVM 원칙에서 크게 벗어나지 않는다고 본다.
 */
export type ShellActivityRow = {
  readonly id: string;
  readonly title: string;
  readonly iconId: string;
  readonly isActive: boolean;
};

/** 알림 한 줄 — `INotificationService`의 것에서 화면이 쓰는 필드만. */
export type ShellNotificationRow = {
  readonly id: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
};

export const ShellViewModelToken = createToken<IShellViewModel>("shellViewModel");
/**
 * Shell 의 화면 상태.
 *
 * 자기 상태를 하나도 갖지 않는다 — 전부 Model 에서 파생한다. 그럼에도 이 계층이 있는 이유는
 * **파생이 컴포넌트 밖에 있어야** 하기 때문이다. `activities` 는 Model 에 아예 없는 목록이라
 * 여기서 만들어진다(활동이 무엇무엇인지는 화면의 사정이다).
 *
 * atom은 React 경계를 넘지 않는다((C), 2026-09-05) — 관찰 property는 전부 값 그대로다. 구현은
 * `ViewModelBase.observe()`로 atom을 감싸 값을 getter로 노출한다.
 */
export interface IShellViewModel {
  /**
   * `useViewModel`이 Shell 마운트/언마운트에 자동으로 건다(`view-only-uses-view-model` — View는
   * 이 훅을 직접 걸 수 없다, `core`의 `useViewModel` 생명주기 참고). 열린 파일 감시 시작·
   * 정지를 여기 얹는다 — Shell은 앱 전체에서 한 번만 마운트되는 루트라 그 생명주기가 곧 "앱이
   * 사는 동안"과 같다.
   */
  onMount(): void;
  onDispose(): void;

  readonly activities: readonly ShellActivityRow[];

  readonly tree: ShellTabPaneNode;
  /** 지금 포커스된 pane(leaf). Split이 여러 개여도 "지금 조작 대상"은 하나뿐이다. */
  readonly activeLeafId: PaneId;

  selectActivity(id: string): void;
  selectTab(leafId: PaneId, tabId: string): void;
  closeTab(leafId: PaneId, tabId: string): void;

  /**
   * 저장 안 된 탭을 닫을 때 확인을 구하는 흐름 — `ITabDirtyState`에 물어 거짓이면 바로
   * `closeTab`과 같다. 참이면
   * `pendingTabClose`를 채워 View의 `Dialog`가 뜨게 하고, `confirmCloseTab`/`cancelCloseTab`이
   * 이어받는다. 네이티브 `window.confirm` 대신이다(2026-09-04 — UI 일관성).
   */
  readonly pendingTabClose: { readonly leafId: PaneId; readonly tabId: string } | null;
  requestCloseTab(leafId: PaneId, tabId: string): void;
  confirmCloseTab(): void;
  cancelCloseTab(): void;

  /**
   * `leafId` 안에서 `tabId`만 남기고 나머지를 닫는다. `protectedTabIds`에 있는 탭은 저장 안 된
   * 변경을 잃지 않도록 건너뛰고 남긴다 — 확인창을 여러 개 띄우는 대신 조용히 보존하는 쪽을
   * 기본값으로 택했다. 인자를 생략하면 `ITabDirtyState`에 물어 스스로 채운다.
   */
  closeOtherTabs(leafId: PaneId, tabId: string, protectedTabIds?: readonly string[]): void;
  /** `leafId` 안에서 `tabId`보다 뒤에 있는 탭을 전부 닫는다. `protectedTabIds`는 `closeOtherTabs`와 같다. */
  closeTabsToRight(leafId: PaneId, tabId: string, protectedTabIds?: readonly string[]): void;

  /** 드래그로 재정렬한 결과 — 순서만 바뀐 id 목록이다(내용은 View 가 이미 들고 있다). */
  reorderTabs(leafId: PaneId, nextTabIds: readonly string[]): void;
  /** `sourceLeafId` 의 `tabId` 를 떼어내 가장자리(`position`) 방향에 새 pane 을 만든다. */
  splitTab(sourceLeafId: PaneId, tabId: string, position: SplitEdgeDropPosition): void;
  /** `branchId` split 노드 안 `childId` 자식의 비율을 바꾼다. */
  resizeNode(branchId: PaneId, childId: PaneId, nextSize: number): void;
  /** 파일 탭의 경로가 바뀌었다 — `oldPrefix` 로 시작하는 탭을 전부 `newPrefix` 로 옮긴다. */
  retargetTabs(oldPrefix: string, newPrefix: string): void;

  /**
   * 파일을 **미리보기로** 연다. 한 번 더 열면 고정된다. **지금 포커스된 leaf 기준**이다 —
   * 사이드바에서 고른 파일이 지금 보고 있는 pane 에 뜨는 게 자연스럽다.
   *
   * 탭 제목은 경로가 아니라 파일 이름이다 — 폰의 좁은 스트립에 경로 전체가 들어가지 않는다.
   */
  previewFile(path: string): void;

  /**
   * 파일이 아닌 탭을 **고정으로** 연다 — 대화, 설정 같은 것. 이미 열려 있으면 그 탭으로 간다.
   * `kind`는 `ITabContentRegistry`가 아는 것이어야 화면에 내용이 생긴다. 지금 포커스된 leaf 기준이다.
   */
  openTab(tab: { readonly id: string; readonly kind: string; readonly title: string }): void;

  /**
   * 미리보기 탭(`isPreview`)을 고정한다 — 이미 고정돼 있으면(또는 다른 탭이 미리보기 자리에
   * 있으면) 아무 일도 없다. `previewFile`의 "같은 파일을 다시 열면 고정된다"와 같은 동작을
   * 탭 스트립 쪽 상호작용(미리보기 탭 더블클릭)에서도 쓸 수 있게 별도로 연다.
   */
  pinTab(tabId: string): void;

  /**
   * `'light'` | `'dark'`. View 가 이 값을 문서에 칠한다.
   *
   * 부팅 시 되돌리는 메서드가 따로 없다 — `IThemeModel`이 생성자에서 스스로 저장된 값을 복원하므로
   * View 가 명시적으로 부를 게 없다.
   */
  /** 화면 구석에 띄울 빌드 표시. 아직 못 읽었거나 실패했으면 빈 문자열이다. */
  readonly buildId: string;
  /**
   * 서버가 말하는 프로토콜 버전이 이 클라이언트의 것과 다르다 — 캐시된 PWA가 낡았다(→ ADR 0017).
   * 화면은 "다시 불러오기"를 권하는 띠를 띄운다. 서버 정보를 못 읽었으면 `false`다.
   */
  readonly isClientOutdated: boolean;
  /** 앱을 다시 불러온다. 낡은 클라이언트 띠의 버튼이 부른다. */
  reloadApp(): void;

  /** 화면 구석에 쌓인 알림. 닫을 때까지 남는다. */
  readonly notifications: readonly ShellNotificationRow[];
  dismissNotification(id: string): void;
  readonly theme: string;
  toggleTheme(): void;

  /**
   * 모바일 드로어가 열려 있는가.
   *
   * `AppFrame` 이 스스로도 관리할 수 있는데(controlled/uncontrolled 하이브리드) 굳이 여기서 갖는
   * 이유는, **"파일을 열면 드로어를 닫는다"를 컴포넌트가 알 수 없기** 때문이다. 하이브리드
   * 계약은 정확히 이런 때를 위한 것이다.
   *
   * **활동 선택과 뒤섞지 않는다.** 활동을 고르는 것은 패널 안에서 하는 일이라, 그걸로 드로어를
   * 닫으면 데스크톱에서 사이드바가 통째로 사라지는 엉뚱한 동작이 된다.
   *
   * `tablet` 이상에서는 사이드바가 열림 상태와 무관하게 보이므로(`AppFrame/styled.tsx` 의
   * `tablet:translate-x-0`), 닫기는 데스크톱에서 아무 일도 하지 않는다.
   */
  readonly isSidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;

  /**
   * 커맨드 팔레트가 열려 있는가. 옛 `CommandCenterModel`(2026-09-05, `ICommandCenterRegistry`로
   * 분해)이 갖고 있던 유일한 atom — 여는 트리거(`shell.openCommandPalette` 커맨드의 `execute`)가
   * React 컴포넌트가 아니라 커맨드 실행이라, 컴포넌트 로컬 state로는 닿지 않는다는 이유가 여전히
   * 같아 `isSidebarOpen`과 같은 성격의 shell UI 상태로 옮겨왔다.
   */
  readonly isPaletteOpen: boolean;
  setPaletteOpen(open: boolean): void;
}
