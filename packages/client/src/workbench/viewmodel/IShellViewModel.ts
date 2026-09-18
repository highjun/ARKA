import type { URI } from "#contracts";
import type { Container, Disposable } from "#core/di";
import type { PaneId } from "../model/ITabLayout";
import type { OpenOptions, TabDescriptor } from "../model/ITabProviderDescriptor";

/**
 * `Tab`의 `TabSplitOrientation`·`SplitEdgeDropPosition`과 값이 같다 — ViewModel도 Model과
 * 같은 이유로 외부 라이브러리를 직접 import 하지 않는다(`MODEL-13`, ViewModel도 대상이다). Model이
 * `TabSplitOrientation`을 이미 선언해 뒀지만 그걸 가져다 쓰는 대신 여기서도 다시 선언한다 —
 * 가져다 쓰면 이 파일이 `export type { TabSplitOrientation }`로 다시 내보내야 View 층까지
 * 닿는데, 재수출 전용 statement는 `model-type-only`(`type.ts`는 타입 선언만 담는다)에 걸린다.
 */
type TabSplitOrientation = "horizontal" | "vertical";
/** 새 분할을 만드는 넷. 합치기(`center`)는 여기 없다. */
export type SplitEdgeDropPosition = "left" | "right" | "top" | "bottom";

/** 탭 우클릭 메뉴(`menuId: 'shell.tab.context'`) 커맨드가 받는 대상 — 어느 pane의 어느 탭인지. */
export type TabContextTarget = { readonly leafId: PaneId; readonly tabId: string };

/**
 * 화면이 그릴 탭 한 줄.
 *
 * Model 의 `OpenTab` 과 거의 같지만 **내용(`ReactNode`)은 없다** — View가 `descriptorOf`로 그 탭의
 * `TabDescriptor`를 꺼내 아이콘과 본문을 그린다. 제목·더티는 descriptor를 따라 여기서 파생된다.
 */
export type ShellTabRow = {
  /** 탭 id — 연 uri의 문자열이다. */
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  /** 미리보기 자리에 있다 — 다음 파일을 열면 이 탭이 갈린다. 화면은 기울임으로 알린다. */
  readonly isPreview: boolean;
  /** 저장 안 된 변경이 있다. 답은 그 탭의 `TabDescriptor`가 주고, 셸은 무엇이 더러운지 모른다. */
  readonly isDirty: boolean;
};

/**
 * 화면이 그릴 탭 트리 한 조각. Model 의 `TabPaneNode` 와 재귀 구조가 같다(leaf/split) — 다만
 * leaf 의 탭 목록이 `OpenTab[]`이 아니라 `ShellTabRow[]`다(위 `ShellTabRow` 주석과 같은 이유,
 * `isPreview`가 여기서 파생된다).
 */
export interface ShellTabPaneLeaf {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly ShellTabRow[];
  readonly activeTabId: string | null;
  readonly size?: number;
}
/** `ShellTabPaneLeaf`와 짝을 이루는 분할 노드. */
interface ShellTabPaneSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: TabSplitOrientation;
  readonly children: readonly ShellTabPaneNode[];
  readonly size?: number;
}
/** `kind`로 갈리는 판별 유니온이다. */
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
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
};

declare module "#core/di" {
  /** `IShellViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.shellViewModel": IShellViewModel;
  }
}
/**
 * Shell 의 화면 상태.
 *
 * 자기 상태를 하나도 갖지 않는다 — 전부 Model 에서 파생한다. 그럼에도 이 계층이 있는 이유는
 * **파생이 컴포넌트 밖에 있어야** 하기 때문이다. `activities` 는 Model 에 아예 없는 목록이라
 * 여기서 만들어진다(활동이 무엇무엇인지는 화면의 사정이다).
 *
 * 관찰 property는 전부 값 그대로다. 구현은 MobX observable 클래스고, 화면은 `observer`로 감싸 따라온다.
 */
export interface IShellViewModel extends Disposable {
  readonly activities: readonly ShellActivityRow[];

  readonly tree: ShellTabPaneNode;
  /** 지금 포커스된 pane(leaf). Split이 여러 개여도 "지금 조작 대상"은 하나뿐이다. */
  readonly activeLeafId: PaneId;
  /** 활성 leaf의 활성 탭. 없으면 `null`. 익스텐션 커맨드("지금 파일의 미리보기")가 조립부를 통해 읽는다. */
  readonly activeTab: { readonly id: string; readonly kind: string; readonly uri: URI } | null;

  selectActivity(id: string): void;
  selectTab(leafId: PaneId, tabId: string): void;
  closeTab(leafId: PaneId, tabId: string): void;

  /**
   * 저장 안 된 탭을 닫을 때 확인을 구하는 흐름 — 그 탭의 `TabDescriptor.isDirty`가 거짓이면 바로
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
   * 기본값으로 택했다. 인자를 생략하면 descriptor에 물어 스스로 채운다.
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
  /**
   * 파일 탭의 경로가 바뀌었다 — `oldPrefix` 로 시작하는 `file:` 탭을 전부 `newPrefix` 로 옮긴다.
   * 탭 id가 uri라 id도 바뀐다 — 옮긴 탭은 provider에게 다시 물어 그릴 것을 새로 받는다.
   */
  retargetTabs(oldPrefix: string, newPrefix: string): void;

  /**
   * 파일을 **미리보기로** 연다(`open`의 `preview: true`). 한 번 더 열면 고정된다. 열리면 모바일 드로어를 닫는다.
   * `arka.workbench.open` 명령이 생기면(R12) 사이드바가 그것을 직접 부르고 이 메서드는 빠진다.
   */
  previewFile(path: string, position?: { readonly line: number; readonly column: number }): Promise<void>;

  /**
   * 마지막 위치 요청 — 어느 탭의 몇 줄·몇 열. View가 그 탭의 내용에 넘긴다. `seq`는 요청마다 오른다.
   * 없으면 `null`. 셸은 파일을 모르므로 "탭 id와 위치"만 든다.
   */
  readonly reveal: {
    readonly tabId: string;
    readonly line: number;
    readonly column: number;
    readonly seq: number;
  } | null;

  /** 무엇이든 탭으로 연다 — `ITabSystem.open`에 위임한다. 지금 포커스된 leaf 기준이다. */
  open(uri: URI, options?: OpenOptions): Promise<void>;

  /** 그 탭이 그릴 것 — View가 아이콘과 본문을 여기서 꺼낸다. 아직 없으면(복원 중) `undefined`. */
  descriptorOf(tabId: string): TabDescriptor | undefined;
  /**
   * 그 탭의 자식 컨테이너 — View가 탭 본문을 `ContainerProvider`로 감쌀 때 쓴다.
   * @throws DescriptorNotFoundError 그 id의 탭이 없다.
   */
  containerOf(tabId: string): Container;

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
  /** 워크스페이스 이름 — VSCode 창 제목의 폴더 이름 자리. 아직 못 읽었으면 빈 문자열. */
  readonly workspaceName: string;
  /**
   * 서버가 말하는 프로토콜 버전이 이 클라이언트의 것과 다르다 — 캐시된 PWA가 낡았다.
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
   * 활동을 **켠다** — `selectActivity`와 달리 같은 것을 다시 골라도 끄지 않고, 드로어도 연다.
   * 커맨드·단축키(`<title> 보기`)가 부른다.
   */
  showActivity(id: string): void;

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
   * 커맨드 팔레트가 열려 있는가. 옛 `CommandCenterModel`(2026-09-05, `ICommandService`로
   * 분해)이 갖고 있던 유일한 atom — 여는 트리거(`shell.openCommandPalette` 커맨드의 `execute`)가
   * React 컴포넌트가 아니라 커맨드 실행이라, 컴포넌트 로컬 state로는 닿지 않는다는 이유가 여전히
   * 같아 `isSidebarOpen`과 같은 성격의 shell UI 상태로 옮겨왔다.
   */
  readonly isPaletteOpen: boolean;
  setPaletteOpen(open: boolean): void;
}
