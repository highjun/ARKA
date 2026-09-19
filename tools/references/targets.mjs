/**
 * **무엇을 어디서 어떻게 찍는지의 정본.** `capture.mjs`는 이것을 도는 장치일 뿐이다.
 *
 * `description`은 **일부러 비어 있다.** 찍기 전에 쓰면 "있을 법한 것"을 적게 된다 — 실제로 그렇게
 * 틀린 적이 있다. 캡처가 `.output/references/probe.json`에 본 것을 남기면 그것을 보고 뒤에 채운다.
 *
 * **출처는 이름이 선언된 것만 고른다.**
 * - VSCode — DOM 클래스가 제품 자신의 part 이름이다. `source`에 그것을 정의하는 소스 경로를 적는다.
 * - Primer 스토리북 — 스토리 id가 곧 컴포넌트 이름이다(`primer.mjs`가 목록에서 펴 온다).
 */
import { primerTargets, primerUrl } from "./primer.mjs";

/** `concept.md`의 기능 구분. 이 밖의 값은 `capture.mjs`가 캡처 전에 거부한다. */
export const CATEGORIES = [
  "shell",
  "command",
  "explorer",
  "editor",
  "search",
  "terminal",
  "preview",
  "settings",
  "notification",
  "vcs",
  "agent",
  "knowledge",
  "responsive",
  "primitive",
];

const VSCODE = "http://127.0.0.1:13000/?folder=/home/coder/project";

// ── VSCode를 모는 손 ──────────────────────────────────────────────────────────

/**
 * 명령 팔레트로 명령 하나를 실행한다. **줄을 골라 누른다** — 그냥 Enter를 치면 맨 윗줄이 잡히는데
 * 그것이 원하는 명령이 아닌 일이 있다("Color Theme"을 치면 "Browse Color Themes…"가 먼저 온다).
 */
const command = async (page, label) => {
  await page.keyboard.press("Control+Shift+KeyP");
  await page.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
  await page.keyboard.type(label, { delay: 12 });
  await page.waitForTimeout(1200);
  await page.locator(".quick-input-list .monaco-list-row", { hasText: label }).first().click();
  await page.waitForTimeout(2000);
};

/** 열린 탭을 전부 닫는다. **서버가 연 것을 기억하므로** 타깃마다 여기서 출발해야 한다. */
const reset = async (page) => {
  await page.keyboard.press("Control+KeyK");
  await page.keyboard.press("Control+KeyW");
  await page.waitForTimeout(1200);
  const dontSave = page.locator(".monaco-dialog-box a.monaco-button", { hasText: /Don't Save/u }).first();
  if ((await dontSave.count()) > 0) {
    await dontSave.click();
    await page.waitForTimeout(1200);
  }
};

/**
 * 활동 바 아이콘으로 사이드바 뷰를 연다.
 *
 * 키로 못 여는 것이 있다 — 소스 제어는 `Ctrl+Shift+G G` 화음이다. 그리고 **배지가 아이콘을 덮어
 * 보통 클릭이 막히므로**(`pending changes` 배지) 강제로 누른다.
 */
const openView = async (page, icon) => {
  const item = page.locator(`.part.activitybar .action-item:has(.codicon-${icon}-view-icon)`).first();
  // **이미 그 뷰면 누르지 않는다** — 활동 바는 토글이라 다시 누르면 사이드바가 접힌다.
  const active =
    (await item.evaluate((el) => el.classList.contains("checked")).catch(() => false)) &&
    (await page
      .locator(".part.sidebar")
      .isVisible()
      .catch(() => false));
  if (!active) {
    await item.locator("a").first().click({ force: true });
    await page.waitForTimeout(4000);
  }
};

/** 파일 하나를 연다. 이름은 워크스페이스 기준이다. */
const open = async (page, name) => {
  await page.keyboard.press("Control+KeyP");
  await page.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
  await page.keyboard.type(name, { delay: 12 });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
};

const TS_FILE = "ThemeModel.ts";
const MD_FILE = "concept.md";

/**
 * VSCode 그림마다 **그 그림에 보이는 것**을 적는다. 전부 `.output/references/probe.json`에 남은
 * 관찰(원소의 실제 글자·자식 구조·크기)을 보고 썼고, 글자가 없어 모자란 것(터미널 캔버스·아이콘·
 * 웹뷰)은 그림을 열어 확인했다. 워크스페이스는 이 저장소의 사본이라 파일 이름이 우리 것이다.
 */
const VSCODE_NOTES = {
  // 셸
  "shell-workbench":
    "1440×900 셸 전체 — 왼쪽부터 48px 활동 바, 300px 사이드바, 에디터, 맨 아래 22px 상태 표시줄. 구역 사이에 끌 수 있는 경계가 있다",
  "shell-title-bar":
    "제목 줄 35px — 가운데에 워크스페이스 이름이 든 명령 칸이 놓이고, 오른쪽 끝에 레이아웃 토글 넷이 선다",
  "shell-activity-bar":
    "48px 세로 레일. 아이콘 여섯이 위에 붙고 계정·설정이 아래에 붙으며, 소스 제어 아이콘에 변경 수 배지(3)가 얹힌다",
  "shell-activity-bar-item": "레일 항목 하나 48×48 — 아이콘, 오른쪽 아래 배지, 왼쪽에 활성 표시 막대가 겹쳐 있다",
  "shell-side-bar": "사이드바 300px — 위에 크롬(EXPLORER 제목 줄), 아래에 확장이 그리는 본문. 본문은 파일 트리다",
  "shell-side-bar-title": "사이드바 크롬만 35px — 왼쪽에 대문자 제목(EXPLORER), 오른쪽에 제목 액션과 전역 액션 자리",
  "shell-pane-header": "사이드바 안 구역 머리 22px — 접기 삼각형, 구역 아이콘, 대문자 제목(PROJECT), 오른쪽 액션 자리",
  "shell-tab-strip":
    "탭 띠 57px — 탭 둘(ThemeModel.ts · concept.md)이 왼쪽에 붙고 그 아래 빵부스러기 줄이 한 겹 더 깔린다",
  "shell-tab": "탭 하나 155×35 — 파일 아이콘·이름·닫기 자리. 배경 칠과 위아래 테두리가 각각 따로 겹쳐 있다",
  "shell-editor-actions": "에디터 그룹 오른쪽 위 도구 묶음 64×35 — 아이콘만 둘이다(분할·넘침)",
  "shell-breadcrumbs":
    "빵부스러기 22px — 폴더 다섯, 파일 하나, 그리고 파일 안 기호 둘(ThemeModel › theme)까지 한 줄로 잇는다",
  "shell-editor-split": "좌우로 가른 에디터 그룹 — 그룹마다 탭 띠·빵부스러기·미니맵을 따로 들고, 활성 그룹의 탭만 밝다",
  "shell-panel":
    "아래 패널 300px — 탭 다섯(PROBLEMS·OUTPUT·DEBUG CONSOLE·TERMINAL·PORTS)과 오른쪽 액션, 본문은 터미널이다",
  "shell-status-bar":
    "상태 표시줄 22px 한 벌 — 왼쪽은 브랜치와 문제 개수, 오른쪽은 커서 위치·들여쓰기·인코딩·줄끝·언어와 알림 종",
  "shell-status-bar-left":
    "상태 표시줄 왼쪽 묶음 773×22 — 원격 표시, 브랜치(`chore/untrack-draft*`, 더티라 별표), 동기화 화살표, 오류 1·경고 0, 열린 포트 0이 칸 다섯으로 붙는다",
  "shell-status-bar-right":
    "상태 표시줄 오른쪽 묶음 — 레이아웃·언어·줄끝·인코딩·들여쓰기·커서 위치·블레임이 칸 열로 붙는다",
  "shell-status-bar-item": "상태 표시줄 칸 하나 34×22 — 아이콘만 든 알림 종이다",

  // 탐색기
  "explorer-view":
    "파일 트리 — 루트 아래 폴더가 펼쳐지고 한 단계마다 들여쓰기 안내선이 그어진다. 행마다 파일 종류 아이콘이 앞에 붙는다",
  "explorer-row": "트리 행 하나 22px — 접기 삼각형 자리, 폴더 아이콘, 이름",
  "explorer-row-selected": "선택된 트리 행 — 배경이 칠해지고 왼쪽에 표시선이 선다",
  "explorer-open-editors": "열린 편집기 목록 — 파일 이름 옆에 흐린 글씨로 그 경로가 붙는다",

  // 에디터
  "editor-text": "에디터 본문 — 줄 번호 거터, 들여쓰기 안내선, 문법 색칠, 오른쪽에 미니맵과 개요 눈금",
  "editor-gutter": "왼쪽 거터 66px — 글리프 자리와 줄 번호가 나란히 서고, 접기 삼각형이 그 사이에 든다",
  "editor-minimap": "미니맵 96px — 코드를 축소해 그린 캔버스 위에 현재 보이는 범위가 밝은 띠로 얹힌다",
  "editor-find-widget":
    "에디터 안 찾기 위젯 419×33 — 오른쪽 위에 떠서 본문을 밀지 않는다. 왼쪽 삼각형으로 바꾸기 줄을 펼치고, 결과가 없으면 'No results'를 안에 적는다",
  "editor-suggest":
    "자동완성 목록 432×230 — 줄마다 종류 아이콘과 이름이 서고, **고른 줄에만** 오른쪽에 서명이 흐린 글씨로 같은 줄에 덧붙는다. 별도 설명 칸은 접혀 있고 네 변이 모두 끌 수 있는 경계다",
  "editor-markdown-preview":
    "마크다운 프리뷰가 앉은 에디터 칸 — 제목·문단·불릿·굵은 글씨가 본문 폭 안에 렌더된다. 웹뷰가 탭 하나로 꽂힌 모양이다",

  // 검색
  "search-view":
    "검색 사이드바 — 위에 찾기·바꾸기 줄, 가운데 '526 results in 90 files'와 'Open in editor', 아래에 파일별로 접히는 결과 트리",
  "search-widget":
    "찾기 줄 285×26 — 왼쪽 삼각형이 바꾸기 줄을 펼치고, 입력칸 안쪽 오른쪽에 대소문자·낱말·정규식 토글이 든다",
  "search-result-row":
    "검색 결과 행 22px — 파일 머리 줄은 아이콘·이름·매치 수를, 매치 줄은 해당 줄 내용과 강조를 담는다",

  // 터미널
  "terminal-view":
    "터미널 칸 — 프롬프트(`coder@…:~/project$`)와 블록 커서가 보이고, 왼쪽 여백에 셸 통합이 찍은 명령 표식(점)이 줄마다 선다",
  "terminal-screen": "xterm 화면 754×264 — 캔버스로 그린다. 링크 층·장식 층이 본문 위에 따로 겹친다",

  // 버전 관리
  "vcs-view":
    "소스 제어 사이드바 — 커밋 메시지 입력칸, 꽉 찬 폭의 Commit 버튼, 접히는 'Changes' 머리와 개수 배지(3). 파일 줄마다 이름·폴더·오른쪽 상태 글자(D·M·U)가 붙고 지운 파일은 이름에 취소선이 그어진다. 마우스를 얹은 줄에만 인라인 액션 셋이 나타난다",
  "vcs-row": "소스 제어 행 34px — 커밋 메시지 입력칸이 목록의 첫 줄로 들어가 있다",
  "vcs-diff":
    "나란히 비교 에디터 — 왼쪽이 원본, 오른쪽이 고친 것. 가운데 물받이가 바뀐 덩어리를 잇고 오른쪽 끝에 변경 위치를 요약한 띠가 선다",

  // 설정·명령
  "settings-editor":
    "설정 화면 1150×657 — 위에 검색칸과 User/Remote/Workspace 범위 탭, 왼쪽에 범주 트리, 가운데에 항목마다 제목·설명·컨트롤",
  "settings-toc": "설정 범주 트리 200×560 — Commonly Used부터 Extensions까지 한 단계 목록",
  "settings-row": "범주 트리 행 22px — 글자만 든 한 줄이다",
  "command-palette":
    "명령 팔레트 602×408 — `>`가 든 입력칸 아래 '785 Results'와 명령 목록. 줄마다 오른쪽에 단축키 칩이 붙는다",
  "command-palette-row": "팔레트 목록 행 22px — 명령 이름 한 줄이다",
  "command-quick-open":
    "같은 위젯의 파일 열기 모드 602×50 — 접두를 떼면 명령이 아니라 파일을 고른다. 결과가 없으면 높이가 입력칸 한 줄로 줄어든다",
  "command-keybindings":
    "단축키 표 792×807 — 위에 검색칸, 아래에 명령·키·조건(When)·출처 네 열의 표. 머리글에 '3196 Keybindings'를 적는다",
  "command-keybindings-row": "단축키 표의 행 하나 24px — 명령·키 칩·조건식·출처가 네 칸에 나뉜다",

  // 알림·메뉴
  "notification-center": "알림 센터 452×37 — 머리 줄과 목록 칸으로 나뉘고, 비어 있으면 'NO NEW NOTIFICATIONS'만 든다",
  "primitive-context-menu":
    "에디터 우클릭 메뉴 310×617 — 항목을 구분선으로 묶고 오른쪽에 단축키를 적는다. 하위 메뉴가 있는 줄은 화살표를 단다",

  // 에이전트
  "agent-chat-panel":
    "오른쪽 보조 사이드바 300px에 붙은 대화 칸 — 크롬은 사이드바와 같은 35px 제목 줄이고, 본문은 빈 상태 안내와 아래 입력칸이다",
  "agent-composer": "요청 입력칸 276×78 — 여러 줄 입력 영역 아래에 도구 줄이 한 겹 붙는다",
  "agent-composer-toolbar":
    "입력칸 아래 도구 줄 262×22 — 왼쪽에 첨부·모드(Agent)·모델 고르개, 오른쪽에 보내기. 아래 줄에 실행 위치(Local)와 권한(Default permissions)이 칩으로 적힌다",
  "agent-extension-panel":
    "Open VSX에서 설치한 에이전트 확장이 사이드바에 꽂힌 모양 — 여기서는 시작 화면이다(제공자 고르기 라디오 넷과 Continue·Login 버튼). **키가 없으면 여기까지다** — 대화·도구 승인 화면은 못 얻었다",

  // 좁은 화면
  "responsive-workbench":
    "390×844에서 같은 셸 — **VSCode는 접지 않는다.** 48px 활동 바와 340px 사이드바가 그대로 남아 편집기 자리가 사라지고, 남은 폭을 보조 사이드바(채팅)가 차지한다. 탭 띠는 2px로 눌린다",
  "responsive-activity-bar": "390px에서도 48px 세로 레일 그대로다. 390 중 48은 12%다",
};

const vscode = (id, category, extra) => ({
  id: `vscode-${id}`,
  product: "VSCode",
  page: "vscode",
  category,
  description: VSCODE_NOTES[id],
  ...extra,
});

/** VSCode 소스에서 그 part를 정의하는 자리. 이름이 내 짐작이 아님을 보이는 근거다. */
const PART = "microsoft/vscode:src/vs/workbench/browser/parts";
const CONTRIB = "microsoft/vscode:src/vs/workbench/contrib";

export const RECIPES = {
  vscode: {
    url: () => VSCODE,
    local: true,
    ready: async (page) => {
      await page.locator(".monaco-workbench").waitFor({ state: "visible", timeout: 90_000 });
      await page.waitForTimeout(4000);
      // 워크스페이스 신뢰 대화상자. 안 닫으면 그 뒤 모든 조작이 막힌다.
      const trust = page.locator(".monaco-dialog-box a.monaco-button", { hasText: /Yes, I trust/u }).first();
      if ((await trust.count()) > 0) {
        await trust.click();
        await page.waitForTimeout(2500);
      }
      await reset(page);
    },
    /**
     * **테마는 서버에 산다.** 브라우저 컨텍스트가 아니라 컨테이너의 설정이라, 한 번 바꾸면 그 뒤
     * 전부에 걸린다. 그래서 어두운 것을 먼저 다 찍고 한 번 바꾼 뒤 밝은 것을 찍는다.
     */
    theme: async (page, theme) => {
      await page.keyboard.press("Control+KeyK");
      await page.keyboard.press("Control+KeyT");
      await page.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(1000);
      await page.keyboard.type(theme === "light" ? "Light Modern" : "Dark Modern", { delay: 20 });
      await page.waitForTimeout(1500);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
    },
  },

  primer: { url: primerUrl, ready: (page) => page.waitForTimeout(2500) },

  codemirror: { url: () => "https://codemirror.net/", ready: (page) => page.waitForTimeout(6000) },
  datasette: {
    url: () => "https://global-power-plants.datasettes.com/global-power-plants/global-power-plants",
    ready: (page) => page.waitForTimeout(6000),
  },
  /**
   * Obsidian Publish로 띄운 공식 도움말. 데스크톱 앱을 못 여니 이것이 유일하게 살아 있는
   * Obsidian UI다. 테마는 `<body>`의 `theme-dark`/`theme-light` 한 쌍이다.
   */
  "obsidian-publish": {
    url: () => "https://help.obsidian.md/",
    ready: (page) => page.waitForTimeout(7000),
    theme: async (page, theme) => {
      await page.evaluate(
        (mode) => {
          document.body.classList.remove("theme-dark", "theme-light");
          document.body.classList.add(`theme-${mode}`);
        },
        theme === "light" ? "light" : "dark",
      );
      await page.waitForTimeout(1000);
    },
  },
};

const VSCODE_TARGETS = [
  // ── 셸 ──
  vscode("shell-workbench", "shell", {
    selector: ".monaco-workbench",
    source: `${PART}/../workbench.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-title-bar", "shell", { selector: ".part.titlebar", source: `${PART}/titlebar/titlebarPart.ts` }),
  vscode("shell-activity-bar", "shell", {
    selector: ".part.activitybar",
    source: `${PART}/activitybar/activitybarPart.ts`,
  }),
  vscode("shell-activity-bar-item", "shell", {
    selector: ".part.activitybar .action-item.checked",
    source: `${PART}/activitybar/activitybarPart.ts`,
    states: ["default", "hover"],
  }),
  vscode("shell-side-bar", "shell", { selector: ".part.sidebar", source: `${PART}/sidebar/sidebarPart.ts` }),
  vscode("shell-side-bar-title", "shell", {
    selector: ".part.sidebar .composite.title",
    source: `${PART}/sidebar/sidebarPart.ts`,
  }),
  vscode("shell-pane-header", "shell", {
    selector: ".part.sidebar .pane-header",
    source: `${PART}/../../../base/browser/ui/splitview/paneview.ts`,
    states: ["default", "hover"],
  }),
  vscode("shell-tab-strip", "shell", {
    selector: ".title.tabs",
    source: `${PART}/editor/tabsTitleControl.ts`,
    setup: async (p) => {
      await open(p, TS_FILE);
      await open(p, MD_FILE);
    },
  }),
  vscode("shell-tab", "shell", {
    selector: ".tab.active",
    source: `${PART}/editor/tabsTitleControl.ts`,
    states: ["default", "hover"],
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-editor-actions", "shell", {
    selector: ".editor-actions",
    source: `${PART}/editor/editorActions.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-breadcrumbs", "shell", {
    selector: ".monaco-breadcrumbs",
    source: `${PART}/editor/breadcrumbsControl.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-editor-split", "shell", {
    selector: ".part.editor",
    source: `${PART}/editor/editorPart.ts`,
    setup: async (p) => {
      await open(p, TS_FILE);
      await p.keyboard.press("Control+Backslash");
      await p.waitForTimeout(2000);
    },
  }),
  vscode("shell-panel", "shell", {
    selector: ".part.panel",
    source: `${PART}/panel/panelPart.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Backquote");
      await p.waitForTimeout(4000);
    },
  }),
  vscode("shell-status-bar", "shell", {
    selector: ".part.statusbar",
    source: `${PART}/statusbar/statusbarPart.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-status-bar-left", "shell", {
    selector: ".part.statusbar .left-items",
    source: `${PART}/statusbar/statusbarPart.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-status-bar-right", "shell", {
    selector: ".part.statusbar .right-items",
    source: `${PART}/statusbar/statusbarPart.ts`,
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("shell-status-bar-item", "shell", {
    selector: ".part.statusbar .right-items .statusbar-item",
    source: `${PART}/statusbar/statusbarItem.ts`,
    states: ["default", "hover"],
    setup: (p) => open(p, TS_FILE),
  }),

  // ── 탐색기 ──
  vscode("explorer-view", "explorer", {
    selector: ".explorer-folders-view",
    source: `${CONTRIB}/files/browser/views/explorerView.ts`,
    setup: (p) => openView(p, "explorer"),
  }),
  vscode("explorer-row", "explorer", {
    selector: ".explorer-folders-view .monaco-list-row",
    source: `${CONTRIB}/files/browser/views/explorerViewer.ts`,
    states: ["default", "hover"],
    setup: (p) => openView(p, "explorer"),
  }),
  vscode("explorer-row-selected", "explorer", {
    selector: ".explorer-folders-view .monaco-list-row.selected",
    source: `${CONTRIB}/files/browser/views/explorerViewer.ts`,
    setup: async (p) => {
      await openView(p, "explorer");
      await open(p, TS_FILE);
    },
  }),
  vscode("explorer-open-editors", "explorer", {
    selector: ".open-editors",
    source: `${CONTRIB}/files/browser/views/openEditorsView.ts`,
    setup: async (p) => {
      await open(p, TS_FILE);
      await command(p, "Explorer: Focus on Open Editors View");
    },
  }),

  // ── 에디터 ──
  vscode("editor-text", "editor", {
    selector: ".monaco-editor",
    source: "microsoft/vscode:src/vs/editor/browser/widget/codeEditorWidget.ts",
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("editor-gutter", "editor", {
    selector: ".monaco-editor .margin",
    source: "microsoft/vscode:src/vs/editor/browser/viewParts/margin",
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("editor-minimap", "editor", {
    selector: ".monaco-editor .minimap",
    source: "microsoft/vscode:src/vs/editor/browser/viewParts/minimap",
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("editor-find-widget", "editor", {
    selector: ".find-widget",
    source: "microsoft/vscode:src/vs/editor/contrib/find/browser/findWidget.ts",
    setup: async (p) => {
      await open(p, TS_FILE);
      await p.locator(".monaco-editor").first().click();
      await p.keyboard.press("Control+KeyF");
      await p.waitForTimeout(1500);
    },
  }),
  vscode("editor-suggest", "editor", {
    selector: ".suggest-widget",
    source: "microsoft/vscode:src/vs/editor/contrib/suggest/browser/suggestWidget.ts",
    setup: async (p) => {
      await open(p, TS_FILE);
      await p.locator(".monaco-editor").first().click();
      await p.keyboard.press("Control+Space");
      await p.waitForTimeout(2500);
    },
  }),
  vscode("editor-markdown-preview", "editor", {
    selector: ".part.editor .editor-group-container:last-child .editor-container",
    source: `${CONTRIB}/markdown/browser/markdownPreview.ts`,
    setup: async (p) => {
      await open(p, MD_FILE);
      await p.locator(".monaco-editor").first().click();
      await p.keyboard.press("Control+Shift+KeyV");
      await p.waitForTimeout(8000);
    },
  }),

  // ── 검색 ──
  vscode("search-view", "search", {
    selector: ".search-view",
    source: `${CONTRIB}/search/browser/searchView.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Shift+KeyF");
      await p.waitForTimeout(1500);
      await p.keyboard.type("workspace", { delay: 25 });
      await p.waitForTimeout(4000);
    },
  }),
  vscode("search-widget", "search", {
    selector: ".search-view .search-widget",
    source: `${CONTRIB}/search/browser/searchWidget.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Shift+KeyF");
      await p.waitForTimeout(1500);
      await p.keyboard.type("workspace", { delay: 25 });
      await p.waitForTimeout(3000);
    },
  }),
  vscode("search-result-row", "search", {
    selector: ".search-view .monaco-list-row",
    source: `${CONTRIB}/search/browser/searchResultsView.ts`,
    states: ["default", "hover"],
    setup: async (p) => {
      await p.keyboard.press("Control+Shift+KeyF");
      await p.waitForTimeout(1500);
      await p.keyboard.type("workspace", { delay: 25 });
      await p.waitForTimeout(4000);
    },
  }),

  // ── 터미널 ──
  vscode("terminal-view", "terminal", {
    selector: ".terminal-outer-container",
    source: `${CONTRIB}/terminal/browser/terminalView.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Backquote");
      await p.waitForTimeout(6000);
      await p.keyboard.type("ls docs\n", { delay: 30 });
      await p.waitForTimeout(2500);
    },
  }),
  vscode("terminal-screen", "terminal", {
    selector: ".xterm-screen",
    source: `${CONTRIB}/terminal/browser/xterm/xtermTerminal.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Backquote");
      await p.waitForTimeout(6000);
      await p.keyboard.type("git status --short\n", { delay: 30 });
      await p.waitForTimeout(2500);
    },
  }),

  // ── 버전 관리 ──
  vscode("vcs-view", "vcs", {
    selector: ".scm-view",
    source: `${CONTRIB}/scm/browser/scmViewPane.ts`,
    setup: (p) => openView(p, "source-control"),
  }),
  vscode("vcs-row", "vcs", {
    selector: ".scm-view .monaco-list-row",
    source: `${CONTRIB}/scm/browser/scmViewPane.ts`,
    states: ["default", "hover"],
    setup: (p) => openView(p, "source-control"),
  }),
  vscode("vcs-diff", "vcs", {
    selector: ".monaco-diff-editor",
    source: "microsoft/vscode:src/vs/editor/browser/widget/diffEditor",
    setup: async (p) => {
      await openView(p, "source-control");
      await p.locator(".scm-view .monaco-list-row", { hasText: "concept.md" }).first().click();
      await p.waitForTimeout(5000);
    },
  }),

  // ── 설정·명령 ──
  vscode("settings-editor", "settings", {
    selector: ".settings-editor",
    source: `${CONTRIB}/preferences/browser/settingsEditor2.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Comma");
      await p.waitForTimeout(5000);
    },
  }),
  vscode("settings-toc", "settings", {
    selector: ".settings-editor .settings-toc-container",
    source: `${CONTRIB}/preferences/browser/tocTree.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+Comma");
      await p.waitForTimeout(5000);
    },
  }),
  vscode("settings-row", "settings", {
    selector: ".settings-editor .monaco-list-row",
    source: `${CONTRIB}/preferences/browser/settingsTree.ts`,
    states: ["default", "hover"],
    setup: async (p) => {
      await p.keyboard.press("Control+Comma");
      await p.waitForTimeout(5000);
    },
  }),
  vscode("command-palette", "command", {
    selector: ".quick-input-widget",
    source: "microsoft/vscode:src/vs/platform/quickinput/browser/quickInput.ts",
    setup: async (p) => {
      await p.keyboard.press("Control+Shift+KeyP");
      await p.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
      await p.waitForTimeout(1500);
    },
  }),
  vscode("command-quick-open", "command", {
    selector: ".quick-input-widget",
    source: "microsoft/vscode:src/vs/platform/quickinput/browser/quickInput.ts",
    setup: async (p) => {
      await p.keyboard.press("Control+KeyP");
      await p.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
      await p.waitForTimeout(1500);
    },
  }),
  vscode("command-palette-row", "command", {
    selector: ".quick-input-list .monaco-list-row",
    source: "microsoft/vscode:src/vs/platform/quickinput/browser/quickInputList.ts",
    states: ["default", "hover"],
    setup: async (p) => {
      await p.keyboard.press("Control+Shift+KeyP");
      await p.locator(".quick-input-widget").waitFor({ state: "visible", timeout: 20_000 });
      await p.waitForTimeout(1500);
    },
  }),
  vscode("command-keybindings", "command", {
    selector: ".keybindings-editor",
    source: `${CONTRIB}/preferences/browser/keybindingsEditor.ts`,
    setup: async (p) => {
      await p.keyboard.press("Control+KeyK");
      await p.keyboard.press("Control+KeyS");
      await p.waitForTimeout(5000);
    },
  }),
  vscode("command-keybindings-row", "command", {
    selector: ".keybindings-editor .monaco-list-row",
    source: `${CONTRIB}/preferences/browser/keybindingsEditor.ts`,
    states: ["default", "hover"],
    setup: async (p) => {
      await p.keyboard.press("Control+KeyK");
      await p.keyboard.press("Control+KeyS");
      await p.waitForTimeout(5000);
    },
  }),

  // ── 알림·메뉴 ──
  vscode("notification-center", "notification", {
    selector: ".notifications-center",
    source: `${PART}/notifications/notificationsCenter.ts`,
    setup: (p) => command(p, "Notifications: Show Notifications"),
  }),
  vscode("primitive-context-menu", "primitive", {
    selector: ".context-view .monaco-menu",
    source: "microsoft/vscode:src/vs/base/browser/ui/menu/menu.ts",
    setup: async (p) => {
      await open(p, TS_FILE);
      await p.locator(".monaco-editor").first().click({ button: "right" });
      await p.waitForTimeout(1800);
    },
  }),

  // ── 에이전트 (v1.2 자리) ──
  vscode("agent-chat-panel", "agent", {
    selector: ".part.auxiliarybar",
    source: `${PART}/auxiliarybar/auxiliaryBarPart.ts`,
    setup: (p) => p.waitForTimeout(3000),
  }),
  vscode("agent-composer", "agent", {
    selector: ".chat-input-container",
    source: `${CONTRIB}/chat/browser/chatInputPart.ts`,
    setup: (p) => p.waitForTimeout(3000),
  }),
  vscode("agent-composer-toolbar", "agent", {
    selector: ".chat-input-toolbars",
    source: `${CONTRIB}/chat/browser/chatInputPart.ts`,
    setup: (p) => p.waitForTimeout(3000),
  }),
  /**
   * Open VSX에서 설치한 열린 에이전트 확장(Cline). **로그인이나 API 키 없이는 온보딩 화면까지다** —
   * 대화·도구 승인 화면은 못 얻는다. 그 사실을 설명에 적는다.
   */
  vscode("agent-extension-panel", "agent", {
    selector: ".part.sidebar",
    source: "Open VSX: saoudrizwan.claude-dev v4.1.17",
    setup: async (p) => {
      await p.locator(".part.activitybar .action-item a[class*='claude-dev']").first().click({ force: true });
      await p.waitForTimeout(9000);
    },
  }),

  // ── 좁은 화면 ──
  vscode("responsive-workbench", "responsive", {
    selector: ".monaco-workbench",
    source: `${PART}/../workbench.ts`,
    viewport: "mobile",
    setup: (p) => open(p, TS_FILE),
  }),
  vscode("responsive-activity-bar", "responsive", {
    selector: ".part.activitybar",
    source: `${PART}/activitybar/activitybarPart.ts`,
    viewport: "mobile",
  }),
];

const OTHER_TARGETS = [
  {
    id: "codemirror-editor-default",
    product: "CodeMirror 6",
    page: "codemirror",
    category: "editor",
    selector: ".cm-editor",
    themes: [null],
    description:
      "CodeMirror 6 기본 차림 — 왼쪽 줄 번호 거터에 접기 삼각형이 붙고, 본문은 문법 색칠된 함수 하나다. 높이가 내용에 맞춰 줄어든다",
    source: "codemirror.net 첫 화면의 데모",
  },
  {
    id: "datasette-preview-table",
    product: "Datasette",
    page: "datasette",
    category: "preview",
    selector: ".table-wrapper",
    maxHeight: 760,
    themes: [null],
    description:
      "SQLite 테이블을 행·열 표로 보여준다. 열이 열아홉이라 표가 화면보다 훨씬 넓고 가로로 흐른다. 머리 줄의 정렬 화살표와 그 위 'Show charting options·Link' 줄이 같이 보인다",
    source: "datasette 표 화면",
  },
  {
    id: "datasette-preview-filters",
    product: "Datasette",
    page: "datasette",
    category: "preview",
    selector: "form.filters",
    themes: [null],
    description:
      "표 위의 거르개 — 검색칸 한 줄, 그 아래 열 고르개(열 이름이 전부 든 드롭다운)와 값 칸이 한 줄, 맨 아래 실행 줄. 줄을 더해 조건을 쌓는 모양이다",
    source: "datasette 표 화면",
  },
  ...[
    [
      "shell-left-sidebar",
      "shell",
      ".site-body-left-column",
      880,
      "왼쪽 사이드바 320px — 맨 위 언어 고르개, 그 아래 문서 트리가 한 단계 들여쓰기로 이어진다. 구분선 없이 여백으로만 묶는다",
    ],
    [
      "shell-right-sidebar",
      "shell",
      ".site-body-right-column",
      880,
      "오른쪽 보조 사이드바 320px — 위에 작은 그래프 칸, 아래에 현재 문서의 제목 목차(ON THIS PAGE)가 구역 둘로 쌓인다",
    ],
    [
      "knowledge-graph",
      "knowledge",
      ".graph-view-container",
      undefined,
      "문서 사이 연결을 점과 선으로 그린 272×260 그래프 칸. 오른쪽 위에 펼치기·전체 보기 아이콘 둘이 떠 있고 점마다 문서 이름이 붙는다",
    ],
    [
      "knowledge-backlinks",
      "knowledge",
      ".backlinks",
      undefined,
      "본문 아래 붙는 백링크 구역 — 대문자 머리글(LINKS TO THIS PAGE)과 이 문서를 가리키는 문서 목록",
    ],
    [
      "editor-reading-view",
      "editor",
      ".markdown-preview-view",
      860,
      "마크다운 읽기 모드 본문 — 제목·문단·내부 링크가 글 폭 제한 안에 놓인다. 제목 위계가 크기와 굵기로만 갈린다",
    ],
  ].map(([name, category, selector, maxHeight, description]) => ({
    id: `obsidian-${name}`,
    product: "Obsidian",
    page: "obsidian-publish",
    category,
    selector,
    maxHeight,
    description,
    source: "help.obsidian.md (Obsidian Publish)",
  })),
];

export const TARGETS = [...VSCODE_TARGETS, ...OTHER_TARGETS, ...(await primerTargets())];
