# ARKA

ARKA는 개인 워크스페이스 기반의 Integrated Development Environment(IDE)로 다음의 내용을 핵심 키워드로 삼는다.

- **Agent**: 에이전트를 통한 작업 수행이 주축이다
- **Knowledge & Retrieval**: 개인 지식 관리 시스템으로서, 사용자가 아는 것과 그 맥락을 에이전트와 공유한다
- **Archiving**: 사용자가 데이터를 개인 워크스페이스에 명시적으로 쌓는다

## 차별성

- **폰에서도 되는 편집기.** 파일과 무거운 프로세스는 원격 노드에 두고 PWA(설치되는 웹앱)로 붙는다. 데스크톱과 기능이 같고 화면 크기에서 오는 편의만 다르다.
- **에이전트가 관제탑이 아니라 편집기 안에 있다.** 에이전트 전용 도구는 코드를 직접 만질 자리가 없고, 에디터에 얹은 보조 기능은 세션이 부속이다. ARKA는 세션과 파일 사이를 오가는 것이 기본 동선이다.
- **사용자를 모델링한다.** 사용자가 무엇을 알고 무엇을 모르는지를 맥락으로 들어, 설명 수준을 맞추고 틀린 전제를 먼저 경고한다. 코드베이스만 읽는 도구는 이것을 못 한다.
- **남는 자리가 내 것이다.** 대화와 산출물이 벤더 서버가 아니라 내 개인 워크스페이스에 쌓인다.

## 제품 원칙

- **결정은 사용자가, 경고는 에이전트가.** 사용자가 항상 옳다고 전제하지 않는다. 모르거나 틀릴 수 있으므로 에이전트는 정확한 맥락에 근거해 전문가로서 미리 경고한다.
- **대상은 개발자가 아니라 지식노동자 전체다.** 개발자라고 모든 개발 지식에 정통하지 않고 오개념이 있을 수 있다. 사용자가 무엇을 안다고 믿지 않는다.
- **코드 편집이 핵심이다.** 에이전트 관제용 도구가 아니다.
- **워크플로는 과하지 않고 자연스러워야 한다.** 에이전트 세션과 파일 에디터 사이를 자유롭게 오갈 수 있어야 한다.

## 전제

- 서버는 사용자 PC 한 대에서 돈다. 바깥에는 cloudflared Tunnel(바깥에서 이 PC로 들어오는 통로) + Cloudflare Access로만 연다. **앱은 인증을 모른다.**
- 클라이언트는 설치 가능한 PWA다. 앱 셸만 캐시하고 API는 캐시하지 않는다.
- 프로토콜 버전은 요청 헤더가 싣고 서버가 판단한다.
- 데스크톱이 본작업, 모바일이 보조작업이되 **기능은 동등하다**. 화면 크기와 인터랙션 방식에서 오는 편의만 다르다.
- 사용자는 한 명이다.

원본 아키텍처 문서는 저장소 밖에 있다. 리포에 넣지 않는다 — 한 번 통째로 넣었다가 리뷰 불가로 롤백한 전례가 있고, 결정의 요지는 각 ADR이 스스로 담는다. 그 문서는 자체 번호표를 갖고 있으므로 `ADR NNNN`은 언제나 `docs/adr/`의 번호다.

## 아키텍처 (v1)

- 전체 구조: **클라이언트 - PWA** / **서버 - 개인 원격노드** / **연결 - Cloudflare Tunnel + Access**
  - 클라이언트는 React 기반의 PWA로써 모바일과 데스크톱을 동시에 지원할 수 있도록 한다.
  - 파일과 무거운 프로세스는 모두 사용자의 원격 개인 노드에서 실행하는 **서버 방식**. (VSCode SSH Server와 유사)
- 코드의 핵심 구조 1: 마이크로 커널 구조
  - **플러그인 간 직접 참조 금지.** 모든 접근은 커널 레지스트리를 통해서만 한다.
  - **자체 Extension Host**: VSCode의 익스텐션 생태계(Open VSX 등)는 포기하고 **작은 자체 extension host**로 유지
- Leveraging VSCode OSS
  - 대부분의 v1 기능은 VSCode와 겹치되, 실제 사용자가 인터랙션하는 클라이언트를 재설계하는 부분이 크다.
  - VSCode의 검증된 계약을 벤치마킹하되, 우리가 원하는 기능에 맞춰서 단순화하여 가져온다.
- VSCode 대비 변경 1: 에디터 코어 - **CodeMirror 6**
  - VSCode에서 제공하는 Monaco는 무겁고, 모바일을 지원하지 않는다.
  - 따라서, Mobile 지원 커버가 가능한 CodeMirror 6를 활용한다.

## 범위

### v1 — "IDE의 확장"

#### v1.0 — 기본 셸과 편집

- 기초가 되는 필요 내용들으 Model과 UI로 나누어 정리
- UI: Shell
- Model: FileSystem (읽기, 쓰기, 열린 파일 감시, 디렉토리 감시)
  - FileTree 표시와 에디터 코어에 쓰이는 모든 파일 I/O 관련 기능
- UI: 에디터 코어
  - CodeMirror 6 기반으로 VSCode Monaco 수준
  - 단, LSP 연동은 Ver 1에서 제외
- UI: 개별 파일 프리뷰
  - Markdown, PDF, 이미지, 비디오/오디오
- Model: Settings
- Model: Terminal
- UI: Terminal

프리뷰가 다루는 것: ① 텍스트 파일 ② 문서(PDF·XLSX·Slides·PPTX) ③ `.db` ④ 미디어(이미지·비디오·오디오).

---

**여기부터는 아직 범위가 아니라 고를 거리다.** VSCode가 실제로 하는 일을 코어·내장 익스텐션·써드파티로 갈라 적었다(`microsoft/vscode` `main`, 2026-09-15). 여기서 추려 낸 것이 위 목록에 합쳐진다.

##### 코어 — 에디터가 하는 일

- 커서와 선택
  - 다중 커서 — 커서를 여럿 두고 한꺼번에 고친다
  - 열 선택 — 네모 모양으로 집는다
  - 의미 단위 넓히기·좁히기 — 낱말 → 구문 → 블록으로 선택을 키운다
  - 낱말·낱말 조각 단위 이동과 삭제 — `camelCase` 안에서도 끊는다
  - 줄 단위 선택
  - 닻 기준 선택 — 한 점을 찍고 거기까지 집는다
  - 커서 이동만 되돌리기 — 글자는 그대로 두고 커서 자리만
  - Tab 키를 들여쓰기로 쓸지 포커스 이동으로 쓸지 전환
- 글 고치기
  - 줄 복제·이동·삭제·정렬·중복 제거
  - 잘라내기·복사·붙여넣기
  - 텍스트를 끌어서 옮기기
  - 끌어놓거나 붙여넣을 때 무엇으로 바꿀지 고르기 — 이미지 파일을 놓으면 마크다운 이미지 문법으로
  - 들여쓰기 — 탭·스페이스 변환, 파일을 열 때 감지
  - 파일 끝 빈 줄 자동 삽입
  - 짝 태그 함께 고치기 — 여는 태그를 고치면 닫는 태그도
  - 값을 다음·이전 후보로 바꾸기 — `true` ↔ `false`
  - 코드 조각(snippet) — 자리표시자를 Tab으로 건너뛴다
  - 주석 토글
  - 이상한 줄끝 문자 처리
- 찾기
  - 찾기·바꾸기 — 정규식, 선택 영역 안에서만
  - 커서 아래 낱말을 파일 전체에서 강조
  - 경로·URL을 눌러서 열기
  - 헷갈리는 유니코드 표시 — 보이지 않는 글자, 비슷하게 생긴 글자
- 보기
  - 접기 — 블록 단위, 들여쓰기 기준, 구획 주석 기준
  - 붙는 스크롤 — 지금 있는 블록의 머리를 화면 위에 고정
  - 글꼴 크기 조절
  - 짝 괄호 강조
  - 색 값 옆에 색상판
  - 빈 에디터 안내 문구
  - 미니맵
  - 아주 긴 줄·큰 파일 다루기
- 언어 지능 — 언어 서버(LSP)가 채운다. **v1에서 제외하기로 한 자리다**
  - 자동완성 목록
  - 인자 힌트 — 함수를 부르는 중에 몇 번째 인자인지
  - 마우스를 올리면 설명
  - 빠른 수정·리팩터
  - 선언 위 정보 줄(CodeLens) — 참조 수, 테스트 실행
  - 이름 한꺼번에 바꾸기
  - 서식 맞추기 — 파일 전체, 선택 영역, 입력하는 중
  - 파일 안 기호 목록과 기호로 이동
  - 오류·경고로 이동
  - 자리를 안 옮기고 들여다보기(Peek)
  - 본문에 겹쳐 쓰는 타입·인자 이름(inlay hint)
  - 회색으로 미리 보이는 제안(inline completion)
  - 의미 기반 색칠 — 같은 이름이라도 변수냐 타입이냐로 다르게

##### 코어 — 워크벤치가 하는 일

- 화면 골격
  - 액티비티 바 — 사이드바를 고르는 아이콘 줄
  - 사이드바와 보조 사이드바
  - 에디터 그룹 — 탭, 분할, 끌어서 재배치
  - 패널 — 터미널·문제·출력·디버그 콘솔
  - 상태 표시줄
  - 구역 경계를 끌어 크기 조절
  - 트리·목록 공통 부품 — 키보드 이동, 다중 선택, 필터
- 명령과 이동
  - 명령 팔레트
  - 빠른 열기 — 파일 이름으로, 기호로, 줄 번호로
  - 단축키 — 표 화면, 충돌 감지, 내보내기
- 파일
  - 탐색기 — 트리, 만들기·이름 바꾸기·옮기기, 여러 개 한꺼번에
  - 열기·저장·자동 저장, 바깥 변경 감지, 충돌 처리
  - 로컬 히스토리 — 저장할 때마다 자국을 남겨 되돌린다
  - 타임라인 — 한 파일에 일어난 일(저장·커밋)을 시간순으로
  - 작업 폴더와 다중 루트 워크스페이스
- 찾기
  - 폴더 전체 찾기·바꾸기 — 정규식, 포함·제외 글롭
  - 검색 결과를 편집 가능한 문서로(Search Editor)
- 편집기 주변
  - 여러 파일을 한 번에 고치는 미리보기(bulk edit)
  - 차이 보기 — 두 파일, 여러 파일 한 화면(multi diff)
  - 병합 편집기 — 충돌을 셋으로 놓고 고른다
  - 사용자 지정 편집기 — 확장이 자기 화면으로 파일을 연다
  - 웹뷰 — 확장이 그리는 임의의 화면
  - 노트북 — 셀 실행, 결과 렌더러, REPL
  - 개요(outline) — 파일 안 구조를 사이드바에
  - 코드에 달린 리뷰 코멘트
  - 호출 계층·타입 계층
- 터미널
  - 통합 터미널 — 여러 개, 분할, 프로필
  - 셸 통합 — 명령 단위로 자르기, 종료 코드 표시, 출력으로 이동
  - 링크 감지 — 출력의 경로를 눌러 연다
  - 바깥 터미널 열기
- 소스 제어
  - SCM 뷰 — 변경 목록, 스테이징, 커밋, 브랜치
- 실행과 진단
  - 디버그 — 중단점, 단계 실행, 변수·조사식, 디버그 콘솔
  - 테스트 — 테스트 트리, 실행, 결과 표시
  - 태스크 — 빌드·감시 명령을 정의해 돌린다
  - 문제 패널 — 오류·경고 모음
  - 출력 채널, 로그
  - 성능·프로세스 탐색기
- 확장
  - 확장 뷰 — 찾기, 설치, 켜고 끄기, 권장 목록
  - 확장 개발 거들기 — `package.json` 기여 지점 검사
- 설정
  - 설정 화면과 `settings.json`
  - 코드 조각 관리
  - 테마 — 색 테마, 아이콘 테마, 제품 아이콘
  - 프로필 — 설정·확장 묶음을 갈아 끼운다
  - 설정 동기화 — 기기 사이
  - 현지화
- 원격
  - 원격 접속 — 서버 쪽에서 돌고 화면만 이쪽에
  - 터널 — 바깥에서 들어오는 통로
  - 편집 세션 — 저장 안 한 편집을 다른 기기로 넘긴다
  - 공유
- 에이전트·AI
  - 채팅
  - 인라인 채팅 — 에디터 안에서 바로
  - 인라인 제안
  - MCP — 바깥 도구를 부르는 규약
  - 음성 입력
  - 원격 코딩 에이전트
- 접근성
  - 스크린 리더 대응
  - 소리·신호 — 오류 줄, 중단점 같은 것을 소리로
- 열기와 인증
  - URI 열기 — 바깥 링크, `vscode://` 처리
  - 인증 — 계정 연결과 토큰 보관
  - 비밀값 암호화 저장
- 언어 감지
  - 확장자·내용으로 언어 판정
  - 언어별 상태 표시
- 온보딩
  - 시작 화면, 둘러보기, 빈 뷰 안내
- 운영
  - 업데이트, 다시 시작
  - 원격 측정·설문·이슈 신고

##### 내장 익스텐션 97개

- 언어 기본 48개 — 문법 색칠, 들여쓰기 규칙, 짝 괄호, 코드 조각. 언어마다 하나씩이다
  - `bat` `clojure` `coffeescript` `cpp` `csharp` `css` `dart` `diff` `docker` `dotenv` `fsharp` `go` `groovy` `handlebars` `hlsl` `html` `ini` `java` `javascript` `json` `julia` `latex` `less` `log` `lua` `make` `markdown-basics` `objective-c` `perl` `php` `powershell` `prompt-basics` `pug` `python` `r` `razor` `restructuredtext` `ruby` `rust` `scss` `shaderlab` `shellscript` `sql` `swift` `typescript-basics` `vb` `xml` `yaml`
- 언어 지능 6개 — 서버가 붙어 자동완성·정의 이동·진단까지 한다
  - `typescript-language-features` — TS·JS. `tsserver`를 물고 있다
  - `html-language-features` — HTML. 안에 든 CSS·JS까지
  - `css-language-features` — CSS·SCSS·Less
  - `json-language-features` — JSON. 스키마로 검사한다
  - `markdown-language-features` — 마크다운. 미리보기, 링크 검증, 목차
  - `php-language-features` — PHP 문법 검사
- 기능 26개
  - `git` — 소스 제어 본체. 스테이징·커밋·브랜치·원격
  - `git-base` — 다른 확장이 쓰는 git 기초 API
  - `github` — 이슈·PR 연동, 리포지터리 열기
  - `github-authentication` · `microsoft-authentication` — 계정 로그인
  - `merge-conflict` — 충돌 표시자를 눌러서 고르기
  - `emmet` — `div.a>ul>li*3` 같은 축약을 펼친다
  - `npm` — `package.json` 스크립트를 태스크로, 의존성 자동완성
  - `grunt` · `gulp` · `jake` — 각 빌드 도구의 작업을 태스크로
  - `references-view` — 참조·호출 계층을 사이드바 트리로
  - `search-result` — 검색 결과 파일(`.code-search`)을 다룬다
  - `simple-browser` — 편집기 안에 웹 브라우저 한 칸
  - `media-preview` — 이미지·오디오·비디오 미리보기
  - `notebook-renderers` — 노트북 출력(이미지·HTML·에러)을 그린다
  - `ipynb` — Jupyter 노트북 파일 읽기·쓰기
  - `markdown-math` — 마크다운 안 수식(KaTeX)
  - `mermaid-markdown-features` — 마크다운 안 다이어그램
  - `configuration-editing` — `settings.json`·`launch.json` 자동완성과 검사
  - `extension-editing` — 확장 만들 때 `package.json` 검사
  - `debug-auto-launch` — Node 프로세스가 뜨면 디버거를 자동으로 붙인다
  - `debug-server-ready` — 서버가 준비되면 브라우저를 연다
  - `terminal-suggest` — 터미널에서 명령·경로 자동완성
  - `tunnel-forwarding` — 포트를 바깥으로 연다
  - `copilot` — AI 기능 진입점
- 테마·아이콘 12개
  - `theme-defaults` — Dark+/Light+ 기본
  - `theme-abyss` `theme-kimbie-dark` `theme-monokai` `theme-monokai-dimmed` `theme-quietlight` `theme-red` `theme-solarized-dark` `theme-solarized-light` `theme-tomorrow-night-blue`
  - `theme-seti` — 파일 아이콘
  - `theme-modern-icons` — 제품 아이콘
- 저장소 안에만 있는 것 5개 — 제품이 아니다
  - `types` `vscode-api-tests` `vscode-colorize-tests` `vscode-colorize-perf-tests` `vscode-test-resolver`

##### 써드파티 — 많이 쓰는 것과 결이 다른 것

- 서식·검사
  - Prettier — 저장할 때 코드 모양을 맞춘다
  - ESLint — JS·TS 정적 검사, 빠른 수정
  - Code Spell Checker — 주석·식별자의 오타
  - Error Lens — 오류·경고를 그 줄 끝에 바로 띄운다
- Git
  - GitLens — 줄마다 누가 언제 왜 고쳤는지, 이력 그래프
  - Git Graph — 브랜치 그래프
  - GitHub Pull Requests — PR을 편집기 안에서 읽고 리뷰한다
- 언어·런타임
  - Python (+ Pylance) — 인터프리터 고르기, 디버깅, 타입 검사
  - C/C++ — IntelliSense, 디버깅
  - Java Extension Pack
  - Jupyter — 노트북 실행
  - Tailwind CSS IntelliSense — 클래스 이름 자동완성과 미리보기
- AI
  - GitHub Copilot — 인라인 제안과 채팅
  - IntelliCode — 쓰던 패턴을 보고 자동완성 순서를 바꾼다
- 원격·컨테이너
  - Remote - SSH — 원격 기계에서 편집한다
  - Dev Containers — 컨테이너 안에서 편집한다
  - Docker — 이미지·컨테이너를 사이드바에서
  - Live Share — 같은 세션을 둘이 연다
- 바깥과 통신
  - REST Client — `.http` 파일로 요청을 쏜다
  - Thunder Client — 화면으로 API를 친다
  - SQLTools / Database Client — DB에 붙어 질의한다
- 편집 보조
  - Path Intellisense — 경로 문자열 자동완성
  - Auto Rename Tag — 짝 태그 함께 고치기
  - Markdown All in One — 목차, 표 정렬, 단축키
  - Todo Tree — 코드의 `TODO`를 트리로 모은다
  - Better Comments — 주석을 종류별로 색을 달리
  - indent-rainbow — 들여쓰기 깊이를 색으로
- 겉모습·조작
  - Material Icon Theme — 파일 아이콘
  - VSCodeVim — Vim 키 조작
- 그리기
  - Draw.io Integration — 편집기 안에서 다이어그램
  - Live Server — 정적 파일을 띄우고 고치면 새로고침

#### v1.1 — VCS

- VCS(버전 관리) 시스템

#### v1.2 — 에이전트

- Context 관리 — 대화가 아니라 tooling으로 다룬다
- Tooling 관리 — MCP(에이전트가 바깥 도구를 부르는 규약)를 포함한다
- 권한 관리
- LLM API 연동

### v2 — "지식 관리 시스템"

**기간·방법 모두 미정.** RAG(찾아온 자료를 붙여 답을 만드는 방식)를 놓고 두 가지가 안 풀렸다 — 검색해 온 것을 어디까지 믿을지, 지식을 무엇에 담을지.

### v3 — "기록의 수집"

**미정.** SNS·웹·논문에서 기록을 모아 개인 워크스페이스에 쌓는 자리다.
