import type { URI } from "#contracts";
import type { Descriptor, Registry } from "#core/registry";
import type { ComponentType, ReactNode } from "react";

/**
 * 탭 내용이 받는 것. **커널은 탭 안을 모른다** — id만 넘긴다. 자리 지정(anchor)은 나중에 다시 본다.
 *
 * `reveal`은 계약 밖이다 — 검색 결과의 줄·열이 아직 셸을 거쳐 오기 때문에 잠시 실어 나른다.
 * `arka.filesystem.reveal` 명령이 생기면(R12) 빠진다.
 */
export interface TabContentProps {
  readonly tabId: string;
  readonly reveal?: { readonly line: number; readonly column: number; readonly seq: number } | null;
}

/**
 * 탭 안에 그릴 것. **레지스트리가 아니다** — `openTab`이 만들어 돌려주는 값이다.
 * 텍스트·PDF·`.db`·설정 화면이 전부 이 하나로 꽂힌다.
 *
 * **provider가 쥔 MobX observable 객체다.** `title`·`isDirty`를 바꾸면 화면이 따라온다 —
 * 이름 없는 문서가 저장되며 이름을 얻을 때, 더티가 켜지고 꺼질 때. observable로 안 만들면 조용히 안 바뀐다.
 */
export interface TabDescriptor {
  readonly icon: ReactNode;
  readonly title: string;
  /** 저장 안 한 변경이 있나. 커널이 ● 표시와 닫기 확인에 쓴다. */
  readonly isDirty: boolean;
  readonly Content: ComponentType<TabContentProps>;
}

/**
 * 탭 시스템에 창을 띄우는 것. **확장이 신고하고 커널이 고른다** — 커널은 확장 이름을 모른다.
 * `id`가 `OpenTab.kind`가 된다 — 복원할 때 같은 것을 다시 찾는 열쇠다.
 *
 * 패턴이 아니라 함수인 이유: 텍스트 확장은 "텍스트면 전부"라 확장자 목록으로 표현할 수 없다.
 */
export interface TabProviderDescriptor extends Descriptor {
  /** 클수록 먼저 묻는다. 텍스트 확장이 바닥이다 — 다들 거절한 뒤에야 바이트를 읽어 판정한다. */
  readonly priority: number;
  /**
   * 열 수 있으면 그릴 것을 돌려준다. 못 열면 `undefined` — 다음 것에게 넘어간다.
   * 판정에 I/O가 필요하면(텍스트인가) 여기서 한다. **커널은 바이트를 모른다.**
   */
  readonly openTab: (uri: URI) => Promise<TabDescriptor | undefined>;
}

/** `open`에 딸리는 것. */
export interface OpenOptions {
  /** 미리보기 자리에 연다 — 전역 하나라 다음 미리보기가 이 탭을 갈아 끼운다. 한 번 더 열면 고정된다. */
  readonly preview?: boolean;
}

declare module "#core/di" {
  /** 탭 시스템 기여 지점 — 확장이 `activate`에서 provider를 더한다. */
  interface InstanceMap {
    "arka.workbench.tabSystem": Registry<TabProviderDescriptor>;
  }
}
