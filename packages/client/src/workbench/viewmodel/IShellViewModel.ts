import type { Disposable } from "#core/di";
import type { IconId } from "#component/Icon";
import type { BottomDescriptor } from "../model/IBottomDescriptor";
import type { SidebarDescriptor } from "../model/ISidebarDescriptor";

/** 활동 레일에 그릴 사이드바 한 줄. **활성은 줄이 들지 않는다** — `activeSidebarId` 하나가 든다. */
export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
}

/** 사이드바 머리의 버튼 한 줄. `label`은 명령의 것이다 — 툴팁으로 쓴다. */
interface SidebarActionRow {
  readonly actionId: string;
  readonly iconId: IconId;
  readonly label: string;
}

/** 열린 사이드바 하나를 그리는 데 필요한 전부. */
export interface ActiveSidebar {
  readonly id: string;
  readonly title: string;
  readonly Content: SidebarDescriptor["Content"];
  readonly actions: readonly SidebarActionRow[];
}

/** 아래 창의 탭 한 줄. */
export interface BottomRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

/** 열린 아래 창 하나를 그리는 데 필요한 전부. */
export interface ActiveBottom {
  readonly id: string;
  readonly Content: BottomDescriptor["Content"];
}

declare module "#core/di" {
  /** `IShellViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.shellViewModel": IShellViewModel;
  }
}
/**
 * 뼈대. 루트 컨테이너에 살므로 이 VM의 수명이 "앱이 사는 동안"이다.
 *
 * 어느 사이드바·아래 창이 열려 있는지는 이 VM이 든다 — Model에 그 값이 없다(계약 구멍 W12). 관찰 property는 전부
 * 값 그대로다. 구현은 MobX observable 클래스고, 화면은 `observer`로 감싸 따라온다.
 */
export interface IShellViewModel extends Disposable {
  readonly sidebars: readonly SidebarRow[];
  /** 지금 열린 사이드바. 없으면 `null`. 레일의 활성 표시가 이것 하나로 갈린다. */
  readonly activeSidebarId: string | null;
  /** 지금 열린 사이드바. VM이 레지스트리에서 풀어 준다 — **View는 레지스트리를 모른다.** */
  readonly activeSidebar: ActiveSidebar | null;
  /** 같은 것을 다시 고르면 사이드바가 닫힌다. */
  toggleSidebar(id: string): void;
  /** 명령·단축키가 부른다. 이미 열려 있으면 그대로 둔다. 모바일 드로어도 연다. */
  revealSidebar(id: string): void;
  readonly bottoms: readonly BottomRow[];
  /** 지금 열린 아래 창. 위와 같다. */
  readonly activeBottom: ActiveBottom | null;
  toggleBottom(id: string): void;
  /** 좁은 화면인가. 탭을 띠로 늘어놓지 않고 하나만 보여줄지를 이것으로 가른다. */
  readonly isNarrow: boolean;

  /** 밝기 모드 — 헤더의 토글이 바꾼다. 계약 밖이다(W16). */
  readonly colorMode: "light" | "dark";
  toggleColorMode(): void;

  /**
   * 모바일 드로어가 열려 있는가. 계약 밖이다 — 컴포넌트가 스스로도 들 수 있지만 "보던 탭이 바뀌면 닫는다"를
   * 컴포넌트가 알 수 없어 여기 둔다. 활동 선택과 뒤섞지 않는다 — 활동을 고르는 것은 패널 안에서 하는 일이다.
   */
  readonly isSidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
}
