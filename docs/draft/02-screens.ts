/**
 * v1.0 화면과 컴포넌트 — 판정 초안.
 *
 * 방법과 판정 어휘는 [01-kernel-api.ts](./01-kernel-api.ts)에 있다. **지금 있는 컴포넌트도 전부
 * 판정 대상이다** — 열일곱 개가 컨셉이 서기 전에 만들어졌다.
 *
 * **그림이 아직 없다.** Figma 브리지가 안 붙었고 스크린샷도 없다. 그래서 여기 적는 props는
 * **대략**이다 — 그림이 나오면 상당수가 다시 쓰인다. 그래도 지금 정할 수 있는 것이 있다:
 * 화면이 몇 개인가, 무엇이 무엇을 드는가, 좁은 화면에서 어떻게 접히는가.
 */

/* ------------------------------------------------------------------------ *
 * 1. v1.0의 화면
 * ------------------------------------------------------------------------ */

/**
 * ## 1-1. 커널이 그리는 것
 *
 * - **셸** — 확장이 꽂히는 자리 그 자체
 *   - 활동 바 — 사이드바를 고르는 아이콘 줄
 *   - 사이드바 — 크롬(제목·액션 줄)은 커널이 두르고 본문만 확장이 그린다
 *   - 에디터 그룹 — 탭 띠, 분할, 끌어서 재배치
 *   - 패널 — 터미널이 사는 아래 칸
 *   - **상태 표시줄** — 지금 없다. 확장이 칸을 기여한다
 *   - 구역 경계 끌기
 * - **명령 팔레트** — 명령 레지스트리에 등록된 것을 보여준다
 * - **단축키 표** — 등록된 키바인딩과 충돌
 * - **알림 목록** · **크래시 화면**
 *
 * ### 좁은 화면에서 접히는 방식 — 컨셉이 정한 것
 *
 * - **탭 목록은 한 벌이고 보여주는 법만 다르다.** 좁은 화면은 탭을 줄로 늘어놓지 않고
 *   **한 번에 하나만** 보여준다(목록에서 골라 간다)
 * - **설정값은 기기가 아니라 화면 폭으로 갈라진다**
 * - 사이드바·패널은 겹쳐 뜬다(나란히 둘 폭이 없다)
 *
 * `물음` 활동 바가 좁은 화면에서 어디로 가나 — 아래 고정 줄? 햄버거? 지금 결정에 없다.
 */

/**
 * ## 1-2. 확장이 그리는 것
 *
 * 각각 탭 하나 또는 사이드바 뷰 하나다.
 *
 * - **탐색기** (사이드바) — 트리, 만들기·이름 바꾸기·옮기기
 * - **검색** (사이드바) — 폴더 전체 찾기·바꾸기, 검색 결과 문서
 * - **텍스트 에디터** (탭) — CodeMirror 6. LSP 없음
 * - **PDF 뷰어** (탭) — 직접 만든다
 * - **`.db` 뷰어** (탭) — 직접 만든다
 * - **이미지·오디오·비디오** (탭) — 브라우저가 URL을 직접 문다
 * - **웹 한 칸** (탭) — 원격 노드 포트만
 * - **터미널** (패널)
 * - **설정 화면** (탭) — 커널에 등록된 스키마를 그린다
 * - **코드 조각 관리** (탭)
 * - **로컬 히스토리** — `물음` 어디에 붙나. 탭인가, 사이드바인가, 파일 메뉴인가
 */

/* ------------------------------------------------------------------------ *
 * 2. 지금 있는 컴포넌트 열일곱 — 전부 판정한다
 * ------------------------------------------------------------------------ */

/**
 * ## 2-1. `shared/component/` 열
 *
 * | 이름 | 출처 | 의심 | 판정 |
 * | --- | --- | --- | --- |
 * | `Text` | 자작 | props 바탕이 `HTMLAttributes`다 — ADR 0008이 금지한 형태(예외 둘 중 하나) | |
 * | `Container` | 자작 | 없다 | |
 * | `Panel` | 자작 | 없다 | |
 * | `Icon` | 자작(codicon·octicon) | `IconId`가 닫힌 집합인데 기여 지점들은 `iconId: string`으로 푼다 | |
 * | `IconButton` | Primer 래퍼 | 없다 | |
 * | `ModeToggle` | Primer 래퍼 | **`useControllableState`를 안 쓰고 손으로 `useState`를 둔다** — ADR 0008 위반이 살아 있다 | |
 * | `Menu` | Radix 래퍼 | 없다 — ADR 0009가 명시한 예외다 | |
 * | `Timestamp` | 자작 | 없다 | |
 * | `CodeBlock` | 자작 | 텍스트 에디터가 CodeMirror로 서면 강조 경로가 둘이 된다 | |
 * | `Markdown` | 자작 | **마크다운 프리뷰가 v1.0 목록에 없다.** 쓸 자리가 있나 | |
 */

/**
 * ## 2-2. `workbench/component/` 일곱
 *
 * | 이름 | 의심 | 판정 |
 * | --- | --- | --- |
 * | `Shell` | 슬롯 여덟을 props로 받는다(ADR 0008의 "셋 이상이면 부품" 예외). **상태 표시줄 자리가 없다** | |
 * | `ActivityBar` | 좁은 화면에서 어디로 가는지 정해져 있지 않다 | |
 * | `Tab` | **좁은 화면 접힘이 없다** — 컨셉이 "한 번에 하나"로 정했다. 그리고 31키 `TabClassNames` context가 ADR 0008의 "클래스 맵을 만들지 않는다"에 걸린 채 유예돼 있다(TASK-58) | |
 * | `CommandPalette` | 없다 | |
 * | `NotificationList` | 커널이 알림을 드는 것이 맞는지가 계약 쪽 물음이다(→ 01의 6-1) | |
 * | `KeybindingTable` | 없다 | |
 * | `CrashScreen` | 없다 | |
 */

/**
 * ## 2-3. 확장의 컴포넌트 여섯
 *
 * | 이름 | 슬라이스 | 의심 | 판정 |
 * | --- | --- | --- | --- |
 * | `FileTree` | filesystem | props 바탕이 `HTMLAttributes`다(예외 둘 중 둘째) | |
 * | `FileIcon` | filesystem | 없다 | |
 * | `TextEditor` | filesystem | **CodeMirror 6 위에 서야 한다.** 그리고 컨셉이 텍스트 에디터를 별도 확장으로 갈랐으니 `filesystem`에 남을 자리가 아니다 | |
 * | `SearchResultList` | search | 없다 | |
 * | `ChangeList` | git | **VCS는 v1.1이다.** v1.0에서 빠진다 | |
 * | `DiffView` | git | 위와 같다 | |
 *
 * `agent`의 여섯(`ChatRoom`·`InputComposer`·`Message`·`SessionList`·`StatusIndicator`·`StepBlock`)도
 * **에이전트가 v1.2라 v1.0 밖이다.** 지우나, 두고 안 켜나가 판정 거리다.
 */

/* ------------------------------------------------------------------------ *
 * 3. 새로 만들 것 여섯 — props 초안
 * ------------------------------------------------------------------------ */

/**
 * ## 3-1. 상태 표시줄
 *
 * 커널이 그리고 확장이 칸을 기여한다. 지금 셸에 자리 자체가 없다.
 *
 * `물음` 칸을 기여하는 통로가 `ExtensionApi`에 필요하다 — `contributeStatusBarItem`.
 *        01의 `ExtensionApi`에 그 칸이 빠져 있다.
 */
export type StatusBarItem = {
  readonly id: string;
  readonly align: "left" | "right";
  readonly text: string;
  readonly iconId?: string;
  readonly tone?: "default" | "warning" | "danger";
  readonly tooltip?: string;
  /** 누르면 실행할 명령. 명령 레지스트리의 id다. */
  readonly commandId?: string;
};

export type StatusBarProps = {
  readonly items: readonly StatusBarItem[];
  readonly onItemActivate?: (id: string) => void;
};

/**
 * ## 3-2. 터미널
 *
 * 출력은 서버가 소켓으로 밀어주고 입력은 같은 소켓으로 올린다. 화면은 xterm 위에 얇게.
 *
 * `물음` 출력을 props로 받나, 컴포넌트가 구독하나. props로 받으면 초당 수백 번 렌더가 돈다 —
 *        xterm은 명령형 `write()`라 ref로 밀어 넣는 것이 보통이다. 그러면 "props만 받아 그린다"는
 *        ADR 0007의 `component/` 규칙과 부딪힌다.
 */
export type TerminalProps = {
  readonly sessionId: string;
  readonly onInput: (data: string) => void;
  readonly onResize: (cols: number, rows: number) => void;
  /** 다시 붙었을 때 서버가 준 스크롤백을 한 번 뿌린다. */
  readonly initialOutput?: string;
};

/**
 * ## 3-3. PDF 뷰어
 *
 * VSCode에 대응이 없다. 직접 만든다.
 *
 * `물음` 본문을 어떻게 받나. 파일 본문은 HTTP로 가기로 했으니 `src` URL이 자연스럽다 —
 *        그러면 이 컴포넌트가 네트워크를 알게 된다(ADR 0007이 `component/`에 금지한 것).
 *        `<img src>`와 같은 부류라 예외로 볼 수 있는지가 판정 거리다.
 */
export type PdfViewProps = {
  readonly src: string;
  readonly page?: number;
  readonly onPageChange?: (page: number) => void;
};

/**
 * ## 3-4. `.db` 뷰어
 *
 * SQLite를 표로 본다. 직접 만든다.
 *
 * `물음` 읽기 전용인가. 컨셉의 프리뷰 결정은 "텍스트는 편집까지, 나머지는 보기만"이었다 —
 *        그러면 읽기 전용이고 `onRowEdit` 같은 것이 없다.
 * `물음` 질의를 칠 수 있나. 그건 뷰어가 아니라 도구다 — v1.0 밖으로 보인다.
 */
export type DbViewProps = {
  readonly tables: readonly string[];
  readonly activeTable: string | null;
  readonly columns: readonly string[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly onTableSelect: (name: string) => void;
  /** 행이 많으면 서버가 잘라 준다 — 더 달라고 하는 자리. */
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
};

/**
 * ## 3-5. 미디어 뷰어
 *
 * 이미지·오디오·비디오. 브라우저가 URL을 직접 물어야 스트리밍이 된다 — 그래서 본문이 HTTP다.
 *
 * `물음` 셋을 한 컴포넌트로 두나, 셋으로 가르나. 그리는 원소가 `<img>`·`<audio>`·`<video>`로
 *        다르고 컨트롤도 다르다. ADR 0008의 "이 축이 변형인가 다른 컴포넌트인가"가 그대로 걸린다.
 */
export type MediaViewProps = {
  readonly src: string;
  readonly kind: "image" | "audio" | "video";
  /** 이미지일 때만. 없으면 파일 이름을 쓴다. */
  readonly alt?: string;
};

/**
 * ## 3-6. 웹 한 칸
 *
 * 원격 노드의 포트를 iframe으로 본다. **바깥 사이트는 v3다.**
 *
 * `물음` 주소창·뒤로가기를 다나. 원격 노드 포트는 우리 origin이라 same-origin으로 만들 수 있고,
 *        그러면 둘 다 된다 — 다만 v1.0에 필요한지가 판정 거리다.
 */
export type WebFrameProps = {
  readonly port: number;
  readonly path?: string;
  readonly onPathChange?: (path: string) => void;
};

/* ------------------------------------------------------------------------ *
 * 4. 새 컴포넌트가 무는 값
 * ------------------------------------------------------------------------ */

/**
 * `packages/client/test/structure.test.ts`가 컴포넌트마다 **파일 다섯**을 강제한다.
 *
 * ```text
 * <Name>/<Name>.tsx
 * <Name>/<Name>.module.css
 * <Name>/<Name>.stories.tsx      기본 / 빈 / 로딩 / 에러 — 그 상태가 실제로 있는 것만
 * <Name>/<Name>.test.tsx         하네스 넷: className · data-component · ref · axe
 * <Name>/index.ts
 * ```
 *
 * 그룹 배럴(`component/index.ts`)은 금지다. **여섯 개면 파일 서른이다.** 그래서 이것은 한
 * 라운드가 아니라 최소 여섯 라운드다 — 컴포넌트 하나가 한 라운드다.
 */

/* ------------------------------------------------------------------------ *
 * 5. 새 CSS를 쓰기 전에 정할 것 둘
 * ------------------------------------------------------------------------ */

/**
 * 둘 다 **문서와 코드가 어긋나 있다.** 새 컴포넌트를 쓰기 전에 어느 쪽이 정본인지 정해야
 * 서른 개 파일이 둘로 갈리지 않는다.
 *
 * ## 5-1. 변형 선택자
 *
 * - ADR 0008과 `CONVENTIONS.md`는 **`:where([data-x])`**를 요구한다(특이성을 한 겹으로 두려고)
 * - `packages/client/src` 전체에 `:where([data-` 가 **0건**이다. 실제는 전부 `.root[data-x]`
 *
 * ⓓ 판정 — 문서를 코드에 맞추나, 코드를 문서에 맞추나
 *
 * ## 5-2. 루트 클래스 이름
 *
 * - `.root` — `Container` `Panel` `Menu` `IconButton` `ModeToggle` `Markdown` `CodeBlock`
 * - `.<Name>` — `Text` `Timestamp` `Icon` `FileIcon` `StatusIndicator`
 *
 * ⓓ 판정 — 어느 쪽으로 통일하나
 */
export type CssConventionNeedsVerdict = never;

/* ------------------------------------------------------------------------ *
 * 6. 그림이 나오면 다시 쓸 것
 * ------------------------------------------------------------------------ */

/**
 * 위 props는 **무엇을 드는가**까지만 정한 것이다. 그림이 나오면 아래가 바뀐다.
 *
 * - 변형 축(`size`·`density`·`tone`) — 지금은 짐작이다
 * - 슬롯 수 — 둘까지면 `ReactNode` prop, 셋 이상이면 부품이다(ADR 0008). 그림 없이는 못 센다
 * - 좁은 화면의 접힘 — 활동 바가 어디로 가는지, 사이드바가 겹치는지 미는지
 *
 * 그림이 필요한 자리와 아닌 자리를 갈라 둔 것이 이 초안의 값이다.
 */
export type NeedsDesign = never;
