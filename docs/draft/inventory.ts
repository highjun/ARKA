/**
 * VSCode·OpenClaw의 익스텐션과 feature 목록 — 하나씩 판정하기 위한 체크리스트.
 *
 * 읽은 지점은 [00-method.ts](./00-method.ts)의 표와 같다.
 * VSCode `dbf2175d6405b226db97b27153bf27adf3f1bc7c`, OpenClaw `9894068e4f4d9273e317284121c5f016b3ac7321`.
 *
 * **체크박스의 뜻** — `- [ ]`는 아직 판정하지 않음, `- [x]`는 판정 끝남(사유가 옆에 있다).
 * 판정 어휘는 1단계 것을 쓴다 — 채택 / 부분 채택 / 참고 / 기각 / 미룸.
 *
 * **역할 설명에 `?`가 붙은 것은 이름만으로 짐작한 것이다.** 소스나 문서로 확인하지 못했다.
 */

/**
 * ## 0. 두 저장소가 feature를 가르는 축이 다르다 — 먼저 읽을 것
 *
 * 목록을 나란히 놓으면 **셈이 맞지 않는다.** 가르는 축이 다르기 때문이다.
 *
 * | | 확장 | 핵심 feature |
 * | --- | --- | --- |
 * | VSCode | `extensions/` 97개 — **대부분 언어 문법·테마**다. 진짜 기능은 소수 | `src/vs/workbench/contrib/` 100개 — **이것이 VSCode의 기능 목록**이다 |
 * | OpenClaw | `extensions/` 165개 — **대부분 프로바이더·채널 어댑터**다 | `src/` 77개 폴더 + `packages/` 24개 |
 *
 * **VSCode의 확장은 "편집기에 무엇을 더하나"**이고, **OpenClaw의 확장은 "바깥 서비스에 어떻게 붙나"**다.
 * 그래서 VSCode 확장의 대다수는 문법·테마이고 OpenClaw 확장의 대다수는 모델 제공자와 메신저다.
 *
 * ARKA는 어느 쪽인가 — **지금은 VSCode 쪽**이다. `extensions/` 다섯(agent·filesystem·git·markdown·search)이
 * 전부 화면에 무엇을 더하는 것이고, 바깥 서비스에 붙는 것은 없다(실행기 하나가 모델을 안다).
 * 이 축을 바꿀지가 이 검토의 큰 물음 하나다.
 */

/**
 * ## 1-A. VSCode 워크벤치 feature — `src/vs/workbench/contrib/` 100개
 *
 * **이것이 VSCode의 기능 목록이다.** 각각이 자기 폴더를 갖고 `*.contribution.ts`로 워크벤치에 자기를 끼운다.
 * ARKA의 `workbench/`와 `extensions/`를 합친 것에 해당한다.
 *
 * ### 편집기 핵심
 * - [ ] `files` — 파일 탐색기와 파일 열기·저장·이동. **ARKA `extensions/filesystem`이 대응**
 * - [ ] `search` — 파일에서 찾기. **ARKA `extensions/search`가 대응**
 * - [ ] `searchEditor` — 검색 결과를 편집 가능한 문서로 연다
 * - [ ] `scm` — 소스 제어 뷰. **ARKA `extensions/git`이 대응**
 * - [ ] `codeEditor` — 에디터 본체에 붙는 잡다한 기여(줄 번호·미니맵 동작 등)
 * - [ ] `codeActions` — 빠른 수정·리팩터링 실행과 전구 UI
 * - [ ] `folding` — 코드 접기
 * - [ ] `format` — 포맷터 선택과 저장 시 포맷
 * - [ ] `outline` — 문서 구조 트리
 * - [ ] `bulkEdit` — 여러 파일에 걸친 편집을 미리 보고 한 번에 적용
 * - [ ] `mergeEditor` — 3-way 병합 화면
 * - [ ] `multiDiffEditor` — 여러 파일 diff를 한 화면에
 * - [ ] `localHistory` — 파일의 로컬 변경 이력(git과 별개)
 * - [ ] `snippets` — 코드 조각
 * - [ ] `emmet` — HTML/CSS 축약 확장
 * - [ ] `inlayHints` — 타입·인자 이름을 코드 사이에 흐리게 표시
 * - [ ] `dropOrPasteInto` — 에디터에 드롭·붙여넣기 할 때 변환(이미지 → 마크다운 링크 등)
 * - [ ] `callHierarchy` — 호출 계층 뷰
 * - [ ] `typeHierarchy` — 타입 계층 뷰
 * - [ ] `languageDetection` — 확장자 없는 파일의 언어를 추론
 * - [ ] `languageStatus` — 언어 서버 상태를 상태 표시줄에
 * - [ ] `markers` — 문제(Problems) 패널. 진단 모음
 * - [ ] `comments` — 코드에 붙는 리뷰 코멘트 스레드
 * - [ ] `notebook` — 노트북 편집기
 * - [ ] `replNotebook` — REPL을 노트북으로
 * - [ ] `interactive` — 인터랙티브 실행 창
 * - [ ] `customEditor` — 확장이 만든 편집기 호스팅. **ARKA `ITabContentRegistry`가 대응**
 * - [ ] `markdown` — 마크다운 미리보기. **ARKA `extensions/markdown`이 대응**
 * - [ ] `scrollLocking` — 편집기 둘의 스크롤을 묶는다?
 *
 * ### 채팅·AI
 * - [ ] `chat` — 채팅 UI 전체. **가장 큰 contrib이고 ARKA `extensions/agent`가 대응**
 * - [ ] `inlineChat` — 에디터 안에서 바로 고치는 채팅
 * - [ ] `inlineCompletions` — 고스트 텍스트 자동완성
 * - [ ] `mcp` — MCP 서버 연결과 툴 노출
 * - [ ] `remoteCodingAgents` — 원격에서 도는 코딩 에이전트 세션
 * - [ ] `welcomeAgentSessions` — 에이전트 세션 시작 화면
 * - [ ] `agentsVoice` — 에이전트 음성 입출력?
 * - [ ] `editTelemetry` — 편집이 사람 것인지 AI 것인지 계측
 * - [ ] `limitIndicator` — 사용량 한도 표시?
 *
 * ### 실행·디버그·터미널
 * - [ ] `debug` — 디버거 UI 전체(중단점·호출 스택·변수)
 * - [ ] `terminal` — 내장 터미널
 * - [ ] `terminalContrib` — 터미널 부가 기능(링크 감지·제안 등)
 * - [ ] `externalTerminal` — 바깥 터미널 앱 열기
 * - [ ] `tasks` — 빌드·테스트 태스크 정의와 실행
 * - [ ] `testing` — 테스트 탐색·실행·결과 뷰
 * - [ ] `processExplorer` — VSCode 자신의 프로세스 목록
 *
 * ### 워크벤치 골격
 * - [ ] `commands` — 커맨드 기여와 실행. **ARKA `core/commands`가 대응**
 * - [ ] `keybindings` — 키바인딩 편집기. **ARKA `KeybindingsTabView`가 대응**
 * - [ ] `keybindingsExport` — 키바인딩 내보내기
 * - [ ] `preferences` — 설정 편집기. **ARKA `SettingsTabView`가 대응**
 * - [ ] `quickaccess` — 빠른 열기(`Ctrl+P`)와 그 위의 팔레트. **ARKA `CommandPalette`가 대응**
 * - [ ] `list` — 목록 위젯의 공통 동작(선택·키보드 이동). **ARKA `FileTree`가 이것을 본떴다**
 * - [ ] `sash` — 창을 가르는 손잡이. **ARKA `Tab/Split`이 대응**
 * - [ ] `themes` — 색 테마 적용. **ARKA `IThemeModel`이 대응(Primer 토큰)**
 * - [ ] `extensions` — 확장 관리 UI(설치·갱신·사용 설정). **ARKA에 대응 없음**
 * - [ ] `webview`·`webviewPanel`·`webviewView` — 확장이 임의 HTML을 그리는 샌드박스. **ARKA에 대응 없음**
 * - [ ] `output` — 출력 패널(확장이 로그를 뱉는 자리)
 * - [ ] `logs` — 로그 파일 뷰어
 * - [ ] `telemetry` — 계측 수집
 * - [ ] `performance` — 시작 성능 측정과 표시
 * - [ ] `update` — 업데이트 확인·적용. **ARKA `UpdateBanner`가 대응**
 * - [ ] `relauncher` — 재시작이 필요한 설정을 바꿨을 때 안내
 * - [ ] `splash` — 창이 뜨기 전 빈 화면 깜빡임을 막는 초기 그림
 * - [ ] `modernUI` — 새 UI로의 옵트인?
 * - [ ] `browserView` — 편집기 안의 브라우저 뷰?
 * - [ ] `imageCarousel` — 이미지 여러 장 넘겨 보기?
 * - [ ] `tags` — ? 확인 필요
 *
 * ### 워크스페이스·세션
 * - [ ] `workspace` — 워크스페이스 신뢰·폴더 관리
 * - [ ] `workspaces` — 여러 폴더 워크스페이스
 * - [ ] `editSessions` — 편집 중인 상태를 클라우드로 옮겨 다른 기기에서 잇는다
 * - [ ] `userDataProfile` — 설정·확장 묶음을 프로필로 갈아 끼운다
 * - [ ] `userDataSync` — 설정을 기기 간 동기화
 * - [ ] `timeline` — 파일의 시간축(git 커밋 + 로컬 이력)
 * - [ ] `share` — 코드 조각 공유 링크
 *
 * ### 원격·연결
 * - [ ] `remote` — 원격 개발(SSH·컨테이너·WSL)
 * - [ ] `remoteTunnel` — 터널로 원격 접속
 * - [ ] `tunnel-forwarding`(확장 쪽) — 포트 포워딩
 * - [ ] `meteredConnection` — 종량제 네트워크를 감지해 큰 다운로드를 미룬다
 * - [ ] `url` — `vscode://` 링크 처리
 * - [ ] `opener` — 링크를 무엇으로 열지
 * - [ ] `externalUriOpener` — 바깥 URL을 여는 처리자 선택
 *
 * ### 인증·보안
 * - [ ] `authentication` — 인증 제공자 등록과 계정 UI. **ARKA는 앱이 인증을 모른다**
 * - [ ] `encryption` — 비밀값 암호화 저장
 * - [ ] `policyExport` — 조직 정책 내보내기
 *
 * ### 접근성·현지화·음성
 * - [ ] `accessibility` — 스크린리더 지원과 접근성 도움말
 * - [ ] `accessibilitySignals` — 오류·중단점 등을 소리로 알림
 * - [ ] `localization` — 언어팩
 * - [ ] `speech` — 음성 인식·합성
 *
 * ### 온보딩·안내
 * - [ ] `onboarding` — 첫 실행 안내
 * - [ ] `welcomeGettingStarted` — 시작하기 화면
 * - [ ] `welcomeWalkthrough` — 단계별 둘러보기
 * - [ ] `welcomeViews` — 빈 뷰에 뜨는 안내(뷰가 비었을 때 무엇을 하라)
 * - [ ] `welcomeBanner` — 상단 배너 안내
 * - [ ] `welcomeOnboarding` — 온보딩 실험
 * - [ ] `surveys` — 설문 표시
 * - [ ] `emergencyAlert` — 긴급 공지(보안 등)
 * - [ ] `issue` — 이슈 리포터(환경 정보 수집)
 *
 * ### 레거시·기타
 * - [ ] `git` — git 통합의 워크벤치 쪽(확장 `git`과 짝)
 * - [ ] `github` — GitHub 연동(PR·이슈)
 * - [ ] `bracketPairColorizer2Telemetry` — 옛 확장 사용자 계측(레거시)
 * - [ ] `localHistory`·`markers` 등은 위에 이미 있다
 */

/**
 * ## 1-B. VSCode 내장 익스텐션 — `extensions/` 97개
 *
 * **대부분이 언어 지원과 테마다.** 갯수가 많다고 기능이 많은 것이 아니다 — 묶어서 센다.
 *
 * | 묶음 | 개수 | 무엇 | ARKA에 해당하나 |
 * | --- | --- | --- | --- |
 * | 언어 문법(`*-basics`·언어 이름만 있는 것) | 약 45 | 색칠·괄호 짝·주석 규칙만 든다. TextMate 문법 파일 | 없음 — 편집기가 아니다 |
 * | 언어 서버(`*-language-features`) | 6 | 자동완성·진단·정의로 이동. TS·JSON·CSS·HTML·PHP·마크다운 | 없음 |
 * | 색 테마(`theme-*`) | 12 | 색 팔레트 | Primer가 든다(→ ADR 0009) |
 * | 테스트용(`vscode-*-tests`·`types`·`test-resolver`) | 5 | VSCode 자신을 시험하는 확장 | 없음 |
 *
 * **남는 것이 진짜 기능 확장이다.** 이것만 하나씩 본다.
 *
 * - [ ] `git` — git 통합 본체. 상태·스테이지·커밋·브랜치. **ARKA `extensions/git`이 이 최소 집합**
 * - [ ] `git-base` — git 기본 개념(리포지토리 탐지)을 다른 확장에 제공
 * - [ ] `github` — GitHub 리포지토리 연동
 * - [ ] `github-authentication`·`microsoft-authentication` — 인증 제공자
 * - [ ] `copilot`·`copilot-proxy`(OpenClaw 쪽과 이름만 같다) — AI 보조
 * - [ ] `debug-auto-launch`·`debug-server-ready` — 디버거 자동 시작과 서버 준비 감지
 * - [ ] `emmet` — 축약 확장(contrib과 짝)
 * - [ ] `merge-conflict` — 충돌 표시와 해결 버튼
 * - [ ] `references-view` — 참조 목록 뷰
 * - [ ] `search-result` — 검색 결과 파일의 문법
 * - [ ] `npm`·`grunt`·`gulp`·`jake`·`make` — 태스크 자동 감지
 * - [ ] `simple-browser` — 편집기 안 브라우저
 * - [ ] `media-preview` — 이미지·오디오·비디오 미리보기
 * - [ ] `ipynb`·`notebook-renderers` — 노트북 읽기와 출력 그리기
 * - [ ] `markdown-language-features` — 마크다운 미리보기·링크 검사. **ARKA `extensions/markdown`이 대응**
 * - [ ] `markdown-math`·`mermaid-markdown-features` — 수식·다이어그램 렌더. **ARKA는 mermaid를 `ops`가 아니라 클라이언트에 둔다**
 * - [ ] `configuration-editing` — `settings.json` 편집 도움
 * - [ ] `extension-editing` — 확장 `package.json` 편집 도움. **확장 매니페스트의 스키마가 여기 있다**
 * - [ ] `terminal-suggest` — 터미널 명령 자동완성
 * - [ ] `tunnel-forwarding` — 포트 포워딩
 * - [ ] `docker`·`dotenv`·`ini`·`log`·`xml`·`yaml`·`sql` — 설정·로그 파일 문법
 * - [ ] `prompt-basics` — 프롬프트 파일(`.prompt.md`) 문법. **AI 시대에 생긴 새 언어**
 * - [ ] `diff` — diff 파일 문법
 */

/**
 * ## 2-A. OpenClaw 핵심 feature — `src/` 77개 폴더
 *
 * **이것이 OpenClaw의 기능 목록이다.** VSCode의 `contrib/`에 해당한다.
 *
 * ### 입구와 골격
 * - [ ] `gateway` — **중심.** WebSocket 제어 평면. 모든 클라이언트·노드가 여기 붙는다. **ARKA `server/app.ts`가 대응(단 REST+SSE)**
 * - [ ] `daemon` — 게이트웨이를 상주 프로세스로 띄우고 지킨다
 * - [ ] `bootstrap` — 시작 순서와 초기화
 * - [ ] `channels` — 메신저 어댑터 층(텔레그램·슬랙·디스코드…). 에이전트는 어디서 왔는지 모른다. **ARKA에 없음**
 * - [ ] `chat` — 대화 처리(입력 → 에이전트 → 응답)
 * - [ ] `cli` — 명령줄 진입점
 * - [ ] `commands` — 슬래시 명령 처리
 * - [ ] `tui` — 터미널 UI
 * - [ ] `web` — 웹 채팅 UI(정적)
 * - [ ] `interactive` — 대화형 프롬프트(사용자에게 되묻기)
 * - [ ] `wizard` — 설치·설정 마법사
 * - [ ] `status` — 상태 표시
 *
 * ### 에이전트
 * - [ ] `agents` — 에이전트 실행 전반. 가장 큰 폴더. **ARKA `features/agent`가 대응**
 * - [ ] `sessions` — 세션(대화 단위)과 저장소. **ARKA `ISessionStore`가 대응**
 * - [ ] `session-cards` — 세션을 카드로 요약해 보여 주기
 * - [ ] `transcripts` — 대화 기록 파일(JSONL)과 검색
 * - [ ] `trajectory` — 실행 궤적 파일과 보존 정책. 무엇을 어떤 순서로 했는지의 기록
 * - [ ] `context-engine` — 프롬프트에 무엇을 넣을지 고르는 층(압축·선별)
 * - [ ] `memory` — 장기 기억
 * - [ ] `memory-host-sdk` — 기억 제공자를 플러그인으로 꽂는 SDK
 * - [ ] `skills` — `SKILL.md` 마크다운이 곧 능력. 목록만 프롬프트에 넣고 본문은 필요할 때 읽는다. **ARKA에 없음**
 * - [ ] `system-agent` — 시스템이 스스로 돌리는 에이전트
 * - [ ] `claws` — ? 확인 필요(계획 도우미로 보인다)
 * - [ ] `auto-reply` — 자동 응답 규칙
 * - [ ] `hooks` — 실행 전후에 끼어드는 훅(`before_tool_call` 등)
 * - [ ] `routing` — 어느 에이전트·모델로 보낼지
 * - [ ] `flows` — 내장 진단 검사(doctor) 등록. 이름과 달리 워크플로가 아니다
 *
 * ### 모델
 * - [ ] `llm` — 모델 호출 추상
 * - [ ] `provider-runtime` — 프로바이더 실행 시 배선
 * - [ ] `model-catalog` — 어떤 모델이 있고 값이 얼만지
 * - [ ] `model-picker` — 모델 고르기 UI. **ARKA TASK-36이 열려 있는 자리**
 *
 * ### 툴과 실행
 * - [ ] `mcp` — MCP 서버 연결
 * - [ ] `process` — 자식 프로세스 관리
 * - [ ] `worker` — 작업자 프로세스
 * - [ ] `web-fetch` — 웹 페이지 가져오기 툴
 * - [ ] `web-search` — 웹 검색 툴
 * - [ ] `link-understanding` — 링크를 열어 내용을 이해
 * - [ ] `proxy-capture` — 트래픽 캡처
 * - [ ] `projects` — 프로젝트(작업 대상 리포) 복제·관리
 * - [ ] `cron` — 예약 실행. **ARKA에 없음**
 * - [ ] `tasks` — 할 일 원장
 * - [ ] `boards`·`workboard-contract` — 작업판(칸반) 위젯
 * - [ ] `canvas` — 그림판/문서 캔버스 호스팅
 *
 * ### 미디어·음성
 * - [ ] `media` — 미디어 처리 공통
 * - [ ] `media-generation`·`image-generation`·`video-generation`·`music-generation` — 생성
 * - [ ] `media-understanding` — 이미지·영상 이해
 * - [ ] `tts` — 음성 합성
 * - [ ] `realtime-transcription` — 실시간 받아쓰기
 * - [ ] `talk` — 실시간 음성 대화. 이름을 불러 깨우는 활성화 포함
 * - [ ] `meeting-bot` — 회의에 참석하는 봇
 *
 * ### 기기와 배치
 * - [ ] `node-host` — 노드(맥·iOS·안드로이드 등 실행 주체)를 호스팅. **ARKA에 없음**
 * - [ ] `pairing` — 기기 짝짓기와 승인
 * - [ ] `fleet` — 여러 대를 묶어 관리. 백업·복원 포함
 * - [ ] `snapshot` — 상태 스냅샷과 백업(전사 인덱스 재구성 등)
 * - [ ] `acp` — 에이전트 통신 프로토콜(다른 에이전트 도구와 붙는 표준)
 *
 * ### 설정·보안·운영
 * - [ ] `config` — 설정 스키마와 로딩
 * - [ ] `secrets` — 비밀값 보관과 참조(`SecretRef`)
 * - [ ] `security` — 보안 정책
 * - [ ] `audit` — 감사 원장. 메타데이터만 담고 프롬프트·툴 인자는 안 담는다
 * - [ ] `logging` — 로그
 * - [ ] `state` — 런타임 상태
 * - [ ] `plugin-state` — 플러그인별 상태 저장
 * - [ ] `infra` — 인프라 공통(파일·네트워크 등)
 * - [ ] `plugins` — **플러그인 로더와 매니페스트.** 가장 큰 폴더 중 하나
 * - [ ] `plugin-sdk` — 플러그인이 쓰는 공개 계약
 * - [ ] `compat` — 옛 버전 호환
 * - [ ] `shared`·`utils`·`types` — 공통
 * - [ ] `docs`·`scripts`·`test-fixtures`·`test-helpers`·`test-utils` — 문서와 시험 도구
 */

/**
 * ## 2-B. OpenClaw 패키지 — `packages/` 24개
 *
 * 계약과 재사용 가능한 조각을 npm 패키지로 떼어 낸 것. **ARKA의 `contracts`에 해당하는 자리가 여럿으로 갈려 있다.**
 *
 * - [ ] `gateway-protocol` — **WebSocket 프로토콜의 정본.** TypeBox 스키마 → JSON Schema → Swift 모델 생성
 * - [ ] `gateway-client` — 그 프로토콜을 말하는 클라이언트
 * - [ ] `plugin-sdk` — 플러그인이 import하는 공개 타입
 * - [ ] `plugin-package-contract` — 플러그인 패키지의 모양(매니페스트 계약)
 * - [ ] `agent-core` — 에이전트 루프와 툴 실행. **ARKA `IAgentRunner`가 대응**
 * - [ ] `llm-core` — 모델 호출 공통
 * - [ ] `model-catalog-core` — 모델 목록·가격
 * - [ ] `acp-core` — 에이전트 통신 프로토콜
 * - [ ] `sdk` — 바깥에서 쓰는 SDK
 * - [ ] `ai` — AI 유틸
 * - [ ] `memory-host-sdk` — 기억 제공자 SDK
 * - [ ] `session-url-contract` — 세션 URL의 모양
 * - [ ] `workboard-contract` — 작업판 계약
 * - [ ] `media-core`·`media-generation-core`·`media-understanding-common` — 미디어 공통
 * - [ ] `markdown-core` — 마크다운 처리
 * - [ ] `mermaid-renderer` — 다이어그램 렌더
 * - [ ] `terminal-core` — 터미널 공통
 * - [ ] `normalization-core` — 문자열·값 정규화
 * - [ ] `net-policy` — 네트워크 정책(SSRF 방어 등)
 * - [ ] `retry` — 재시도
 * - [ ] `tool-call-repair` — 모델이 잘못 만든 툴 호출을 고친다
 *
 * **눈에 띄는 것 둘** — `tool-call-repair`가 패키지로 있다는 것은 그 문제가 그만큼 흔하다는 뜻이고,
 * `net-policy`가 따로 있다는 것은 툴이 바깥에 닿는 순간 SSRF가 실제 위험이 된다는 뜻이다.
 * ARKA는 툴이 워크스페이스 안만 건드려 둘 다 아직 없다.
 */

/**
 * ## 2-C. OpenClaw 번들 익스텐션 — `extensions/` 165개
 *
 * **대부분이 바깥 서비스 어댑터다.** 묶어서 센다.
 *
 * | 묶음 | 대략 | 무엇 | 보기 |
 * | --- | --- | --- | --- |
 * | 모델 프로바이더 | 약 60 | 모델 API 하나에 붙는다 | `anthropic`·`openai`·`google`·`groq`·`mistral`·`ollama`·`vllm`·`openrouter` |
 * | 메신저 채널 | 약 25 | 대화 입구 하나 | `slack`·`discord`·`telegram`·`whatsapp`·`signal`·`imessage`·`matrix`·`line`·`msteams` |
 * | 음성·미디어 | 약 15 | 합성·인식·생성 | `elevenlabs`·`deepgram`·`azure-speech`·`fal`·`runway`·`pixverse` |
 * | 검색·수집 | 약 10 | 웹을 읽는다 | `brave`·`exa`·`tavily`·`firecrawl`·`searxng`·`duckduckgo`·`web-readability` |
 * | 기억 | 3 | 장기 기억 구현 | `memory-core`·`memory-lancedb`·`memory-wiki` |
 * | 코딩 에이전트 연동 | 약 8 | 다른 에이전트 도구를 붙인다 | `codex`·`opencode`·`kilocode`·`copilot`·`crabbox` |
 * | 운영·진단 | 약 8 | 계측과 점검 | `diagnostics-otel`·`diagnostics-prometheus`·`qa-lab`·`qa-channel`·`logbook` |
 * | 기기·접근 | 약 10 | 기기와 권한 | `device-pair`·`visitor-access`·`policy`·`vault`·`onepassword`·`radius` |
 * | 회의 | 4 | 회의 참석 | `zoom-meetings`·`google-meet`·`teams-meetings`·`meeting-bot` |
 * | 이름만으로 모르겠는 것 | 약 12 | 확인 필요 | `lobster`·`reef`·`raft`·`vydra`·`buzz`·`clickclack`·`tokenjuice`·`gradium`·`mxc`·`tlon`·`oc-path`·`arcee` |
 *
 * **ARKA에 해당하는 묶음은 지금 하나도 없다.** 모델 프로바이더만이 후보이고(TASK-36),
 * 나머지는 "여러 입구·여러 몸" 전제 위에 있어 단일 사용자 PWA에는 시나리오가 없다.
 */

/**
 * ## 3. 다음에 답할 것
 *
 * 이 체크리스트는 **판정을 위한 목록**이지 판정이 아니다. 하나씩 볼 때 물을 것은 셋이다.
 *
 * 1. **ARKA에 이 일이 있나** — 없으면 기각이고, 사유가 "우리 전제에 그 시나리오가 없다"여야 한다.
 * 2. **있으면 지금 어디가 그 일을 하나** — 자리가 없으면 그것이 구멍이다.
 * 3. **그 자리가 이 원본의 모양과 어떻게 다른가** — 그때 2단계(필드 검토)로 내려간다.
 *
 * 먼저 볼 만한 줄 셋을 꼽자면 —
 * - VSCode `extensions`(확장 관리 UI)와 `webview` — **ARKA에 대응이 없고, 없어도 되는지가 곧 "확장이 바깥에서 오나"라는 물음**이다.
 * - OpenClaw `skills` — 툴 설명을 프롬프트에 다 넣지 않는 방법. 툴이 늘면 바로 필요해진다.
 * - OpenClaw `audit`·`trajectory` — 무엇이 언제 돌았는지의 기록. ARKA는 이벤트 로그가 겸하고 있어 갈래가 없다.
 */
export type Inventory = never;
