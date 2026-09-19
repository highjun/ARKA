# ADR 0014: 확장은 모듈 하나로 커널을 만나고, 기여 지점은 레지스트리에 직접 더한다

## 맥락:
조립부(`registerServices.tsx`)가 확장의 내용을 손으로 알았다 — 활동 바·사이드바·탭 종류를 하나하나 `add`하고, 탭은 `kind → 컴포넌트` 조회였다. 확장을 더하면 조립부를 고쳐야 했고, "텍스트 에디터도 확장"이라는 대칭이 코드에 없었다. `docs/contracts/`가 v1.0 To-be를 정했고(2026-09-17), 이 ADR은 그 계약의 결정 중 코드 구조를 정하는 것을 적는다.

## 결정:
- **확장은 `ExtensionModule` 값 하나다** — `{ id, provides, activate }`. 매니페스트가 따로 없다. 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜지므로 코드를 켜기 전에 읽어야 하는 것이 없다.
- **두 단계로 켠다.** 1단계 `provides`는 모든 모듈이 자기 서비스·ViewModel을 지도(`InstanceMap`)에 물린다 — 아무것도 꺼내지 않는다. 2단계 `activate`는 꽂힐 자리(`arka.workbench.sidebar`·`tabSystem`·`bottom`, `ICommandService`, `ISettings.schema`)를 꺼내 `add`한다. 부팅 때 돌아야 하는 것은 따로 신고하지 않는다 — `activate`에서 `resolve`하면 그때 만들어져 켜진다.
- **셸도 같은 모양의 모듈이다**(`workbench`). 조립부는 `[workbench, ...extensions]`를 한 컨테이너에 켜고, 못 켠 모듈을 알림으로 남기고, 탭을 복원한다. 배럴 순서가 켜는 순서다.
- **레지스트리에 직접 더하고, 등록 취소는 없다.** 확장이 꺼지는 일이 없다 — 앱과 함께 산다. 사용자 재정의(단축키)는 레지스트리를 고치지 않고 `ICommandService.overrides`가 따로 든다.
- **화면의 세 슬롯만 낸다** — Sidebar·TabSystem·Bottom. 탭은 레지스트리가 아니라 provider가 `uri`를 받아 `TabDescriptor`를 돌려주는 함수다 — "텍스트면 전부"를 패턴으로 적을 수 없어서다. 커널이 탭에 대해 아는 것은 `uri`와 더티 여부뿐이다.
- **쥐는 쪽이 정해져 있다.** 탭의 자식 컨테이너는 `TabSystem`이 탭 목록에서 파생해 따고 dispose한다 — 부르는 자리가 없어 빠뜨릴 수 없다. 어느 사이드바가 열렸는지는 `ShellViewModel`이 든다 — Model에 그 값이 없다. 전부 singleton이다 — 탭마다 따로여야 하는 인스턴스가 아직 없고, scoped면 탭 안에서 꺼낸 것이 셸이 보는 것과 갈린다.
- **슬라이스끼리는 명령과 문맥으로만 말한다.** 파일을 여는 것도 `arka.workbench.open` 명령이고, 지금 보는 탭은 `tab.active.uri` 문맥이다. 확장이 셸의 ViewModel을 부르지 않는다.

## 기각:
- **확장이 컨테이너에서 이웃의 ViewModel을 꺼내 부르기** — 동작은 하지만 확장이 셸의 모양을 알게 된다. 명령 하나로 갈라 두면 셸이 바뀌어도 확장은 그대로다.
- **탭을 `kind → 컴포넌트` 레지스트리로 두기** — 파일이 어느 종류인지 판정하는 자리가 없어 조립부의 로컬 상수가 됐다. provider 함수는 판정에 I/O(텍스트인가)가 필요할 때 그 자리에서 한다.
- **등록 취소를 두기** — 쓰는 곳이 없다. 있으면 "누가 언제 빼는가"를 매번 물어야 한다.
- **테스트 대역을 컨테이너를 돌려받은 뒤 자식에 다시 물리기** — 활성화가 곧 만드는 것이라 늦다. 대역도 모듈로 끼운다(`createApplication([mocks])`) — 같은 id를 나중에 물리면 이긴다.

## 대가:
- **부팅이 곧 생성이다.** `activate`에서 꺼낸 것은 그 자리에서 만들어진다 — 늦게 만들고 싶은 것은 꺼내지 않아야 하고, 그 판단이 모듈마다 든다.
- **레지스트리가 굳는 시점이 규약이다.** `activate` 밖에서 `add`해도 막는 것이 없다 — 늦게 더한 것을 화면이 놓칠 수 있다.
- **계약 밖 표면이 남았다.** `ITabSystem.descriptorOf/hasAnyDirty/onDidChange`, `IShellViewModel.colorMode/isSidebarOpen`, `ITabSystemViewModel.closeTab/containerOf`, `Shell.brand/actions/onSettingsSelect` — 계약에 되돌릴지는 검토에서 정한다.

## 강제:
- **타입** `ExtensionModule.provides`는 `InstanceMap`의 id와 타입이 짝지어 움직인다 — 틀린 짝은 컴파일에서 잡힌다.
- **테스트** `workbench/registerServices.test.tsx` — 셸 모듈과 확장이 기여 지점을 채우는지, 못 켠 모듈이 알림으로 남는지.
- **린트** `no-restricted-syntax` — `view/`의 `resolve` 금지. 확장이 셸 ViewModel에 닿는 길을 막지는 못한다 — 그건 리뷰다.

## 상태:
승인됨 (2026-09-18, 사후 기록 — 결정은 `docs/contracts/` 검토에서 났고 PR #60의 코드가 그대로다).
