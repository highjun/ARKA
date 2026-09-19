# 레퍼런스 캡처

바깥 제품의 UI를 **컴포넌트 단위로** 찍어 `docs/references/`에 색인과 함께 남긴다.

```bash
node tools/references/serve.mjs up      # VSCode OSS 컨테이너를 띄운다 (먼저)
node tools/references/capture.mjs       # 아직 없는 것만
node tools/references/capture.mjs --force --only vscode-shell
node tools/references/capture.mjs --list    # 계획만
node tools/references/capture.mjs --index   # 찍지 않고 색인만 다시 쓴다
node tools/references/serve.mjs down    # 컨테이너를 지운다
```

## 자리

| | |
| --- | --- |
| `targets.mjs` | **정본.** 무엇을 어디서 어떤 선택자로, 그리고 그 이름이 어디서 왔는지(`source`) |
| `primer.mjs` | Primer 스토리북 `index.json`을 타깃으로 편다 — 이름을 손으로 안 적는다 |
| `capture.mjs` | 매니페스트를 돌며 찍고, **본 것**을 `probe.json`에 남기고, 색인을 쓴다 |
| `serve.mjs` · `compose.yml` | openvscode-server와 저장소 사본 워크스페이스 |
| `docs/references/assets/<id>.png` | 추적 안 함 — 남의 UI라 공개 저장소에 안 싣는다 |
| `docs/references/description.json` | 색인. `<id>: { description, category, product }`. **이것만 커밋한다** |
| `.output/references/probe.json` | 캡처할 때 실제로 본 것. **설명의 근거** |

id는 `<product>-<category>-<name>[-<state>][-<theme>]`. 파일 이름이 곧 id다.

## 설명은 그림보다 먼저 쓰지 않는다

`targets.mjs`의 `description`은 **선택 항목**이고 비어 있으면 색인에 안 들어간다.
순서는 **찍기 → `probe.json` 읽기 → 설명 쓰기**다.

찍기 전에 쓰면 "있을 법한 것"을 적게 된다. 실제로 그렇게 틀린 적이 있다 — `vscode.dev`가 폴더를
못 열어 검색 뷰가 빈 패널이었는데 "파일별로 접히는 결과 트리"라고 적혀 있었다.

**설명에는 그 그림에 있는 것만 적는다.** "이건 우리 `FileTree` 자리다" 같은 것은 설계 판단이라
사람이 한다(→ [ADR 0008](../../docs/adr/0008-component-surface.md)·[ADR 0010](../../docs/adr/0010-ui-verification.md)).

## 이름이 선언된 출처만 쓴다

- **VSCode** — DOM 클래스가 제품 자신의 part 이름이다. `source`에 그것을 정의하는 소스 경로를 적는다.
- **Primer 스토리북** — 스토리 id가 곧 컴포넌트 이름이다(`components-button--default`).

GitHub·PDF.js와 "공식 문서 스크린샷 내려받기"는 쓰지 않는다 — 그림에 이름이 안 붙어 있어 짐작하는
자리가 된다. GitHub UI는 어차피 Primer라 스토리북이 같은 것을 이름과 함께 준다.

## 함정

- **`vscode.dev`로는 폴더를 못 연다.** 'GitHub Repositories' 확장이 로그인을 요구하고 취소하면
  곧바로 다시 묻는다. 그래서 openvscode-server를 컨테이너로 띄운다.
- **컨테이너에는 저장소 사본을 물린다**(`.output/references/workspace`). 진짜 워킹트리를 물리면
  일부러 더럽히는 편집이 그리로 간다.
- **서버 데이터 자리를 워크스페이스 밖으로 뺀다.** 기본값이 `/home/workspace/.openvscode-server`라
  서버가 자기 상태를 워크스페이스 안에 만들고, 그것이 탐색기 트리에 그대로 보인다.
- **VSCode의 테마와 열린 탭은 서버에 산다.** 브라우저 컨텍스트를 새로 만들어도 안 돌아간다 —
  그래서 어두운 것을 전부 찍고 한 번 바꾼 뒤 밝은 것을 찍고, 타깃마다 `Ctrl+K Ctrl+W`로 탭을 닫고 시작한다.
- **워크스페이스 신뢰 대화상자**를 안 닫으면 그 뒤 모든 조작이 막힌다.
- **명령 팔레트에서 그냥 Enter를 치면 안 된다.** 맨 윗줄이 원하는 명령이 아닌 일이 있다 —
  "Color Theme"을 치면 "Browse Color Themes…"가 먼저 온다. 줄을 글자로 골라 누른다.
- **Primer 스토리북의 테마는 `globals=colorScheme:dark`다**(실측). 기본이 밝은 쪽이다.
- **포털로 빠지는 컴포넌트**(다이얼로그·메뉴)는 `#storybook-root`가 납작하다. 그때는 화면을 찍는다.
- **목록·표·긴 문서는 원소 높이가 수천 픽셀이다.** `maxHeight`로 잘라야 참고할 수 있는 그림이 된다.

## 예의

공개 페이지만 본다. 로그인 뒤는 건드리지 않고, 사용자 에이전트를 속이지 않으며, 바깥 사이트는
타깃 사이에 간격을 둔다. **CI에 걸지 않는다** — 남의 사이트가 우리 빌드를 깨뜨리게 두지 않는다.
