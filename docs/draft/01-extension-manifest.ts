/**
 * feature 01 — 플러그인 매니페스트·확장 표면.
 *
 * 방법과 판정 어휘는 [00-method.ts](./00-method.ts)에 있다. 읽은 지점도 거기 표에 있다.
 *
 * 읽은 원본:
 * - VSCode `src/vs/platform/extensions/common/extensions.ts`
 * - VSCode `src/vscode-dts/vscode.d.ts` (`ExtensionContext`)
 * - VSCode `src/vs/workbench/services/extensions/common/extensionsRegistry.ts`
 * - OpenClaw `src/plugins/manifest-types.ts` (`PluginManifest`)
 * - OpenClaw `src/plugins/plugin-definition.types.ts` (`OpenClawPluginDefinition`)
 * - OpenClaw `src/plugins/plugin-api.types.ts` (`OpenClawPluginApi`)
 *
 * ARKA의 지금 자리: `client/src/extensions/<슬라이스>/index.ts`(배럴)와
 * `client/src/workbench/registerServices.tsx`(조립), `server/src/app.ts`와 `server/src/features/<슬라이스>/index.ts`.
 * 매니페스트는 없고, 확장이 무엇을 기여하는지는 조립부 코드를 읽어야만 알 수 있다.
 */

/**
 * ## 조사에서 나온 것 — 두 원본이 같은 자리를 갖는다
 *
 * VSCode와 OpenClaw는 서로를 모르는 채 **같은 둘로 갈라 놓았다**.
 *
 * | | 선언(데이터) | 명령(코드) |
 * | --- | --- | --- |
 * | VSCode | `package.json`의 `contributes` | `activate(context: ExtensionContext)` |
 * | OpenClaw | `openclaw.plugin.json`(`PluginManifest`) | `register(api: OpenClawPluginApi)` |
 *
 * 가른 이유도 같다 — **켜기 전에 알아야 하는 것**은 선언에, **켜야 알 수 있는 것**은 코드에 둔다.
 * 커맨드 이름·메뉴 자리·뷰 제목은 확장을 불러오기 전에 화면을 그리는 데 필요하고,
 * 그 커맨드가 실제로 하는 일은 불러와야 안다. OpenClaw는 이것을 필드 주석에 대놓고 적는다
 * ("cheap … metadata exposed before plugin runtime loads").
 *
 * 그래서 이 라운드의 물음은 "어느 쪽을 베끼나"가 아니다. **둘 다 같은 답을 내놓았으므로 그 답을 쓴다.**
 * 남는 물음은 아래 세 개다.
 */

/**
 * ## 사용자에게 남기는 물음
 *
 * **물음 1 — ARKA에 이 가름이 값을 하나?** 두 원본은 확장을 *나중에·바깥에서* 불러온다.
 * ARKA의 확장 다섯은 번들에 정적으로 들어 있고 셸이 뜰 때 전부 켜진다. 늦게 켤 일이 없으면
 * "켜기 전에 아는 것"이라는 가름의 원래 값은 없다. 남는 값은 둘이다 —
 * (가) 조립부가 손으로 든 목록이 아니라 매니페스트 순회가 된다,
 * (나) 무엇을 기여하는지가 코드가 아니라 데이터로 한자리에 모인다.
 * **이 둘만으로 매니페스트를 들일지는 판정이 필요하다.** 아니라고 보면 이 feature는 `기각`이고
 * 02(에이전트 이벤트)로 넘어간다.
 *
 * **물음 2 — 매니페스트 하나가 client·server를 함께 말하나?** 아래 초안은 하나로 뒀다.
 * VSCode도 `main`(노드)과 `browser`(웹)를 한 매니페스트에 두므로 원본에 어긋나지 않는다.
 * 가르면 `ClientExtensionManifest`·`ServerExtensionManifest` 둘이 되고, `contracts`에 둘 이유가 옅어진다.
 *
 * **물음 3 — `contracts`가 맞는 자리인가?** 매니페스트가 와이어를 타지 않는다면(지금 초안은 안 탄다)
 * `contracts`에 둘 근거는 "client·server가 같은 타입을 본다" 하나뿐이다.
 * TASK-38(`contracts/src`를 `shared/`·`features/`로)과 자리가 겹치므로 순서를 함께 정해야 한다.
 */

/**
 * ## 1단계 — 무엇을 가져오나
 *
 * | 원본 | 원본 이름 | ARKA 대응 | 판정 | 사유 |
 * | --- | --- | --- | --- | --- |
 * | VSCode | `IExtensionManifest` | 없음 | 부분 채택 | 배포·설치를 말하는 절반을 떼면 남는 것이 우리가 필요한 선언이다 |
 * | VSCode | `IExtensionContributions` | 레지스트리 다섯에 흩어져 있음 | 부분 채택 | 기여 지점 이름이 곧 우리 레지스트리 이름이다. 언어·문법·테마 계열은 시나리오가 없다 |
 * | VSCode | `ICommand`·`IKeyBinding`·`IMenu`·`IViewContainer`·`IView` | `core/action`·`core/menu`·`IActivityBarRegistry`·`ISidebarContentRegistry` | 채택 | 이미 같은 모양을 쓰고 있다. 선언 쪽 표현만 없다 |
 * | VSCode | `IToolContribution` | `AgentToolDefinition` | 부분 채택 | 툴을 선언으로 내놓는 자리가 우리에게 없다 |
 * | VSCode | `ExtensionContext` | `IExtensionApi`(없음) | 부분 채택 | `activate`가 받는 것의 원형. 저장소·비밀값·경로 계열은 우리 배치에 없다 |
 * | VSCode | `IExtensionPointDescriptor` | `core/registry`의 `Registry` | 참고 | 기여 지점을 스스로 등록하는 장치. 우리는 지점이 닫힌 집합이라 JSON 스키마 등록이 과하다 |
 * | VSCode | `ExtensionKind` | 없음 | 참고 | ui/workspace 가름이 client/server 가름과 같은 물음이다. 값은 우리 어휘로 다시 만든다 |
 * | VSCode | `IExtensionPoint`·`IExtensionPointUser`·`ExtensionMessageCollector`·`IExtensionCapabilities` | 없음 | 기각 | 신뢰 경계·확장 호스트 메시지 수집 장치. 확장이 전부 우리 코드라 경계가 없다 |
 * | OpenClaw | `OpenClawPluginDefinition` | 없음 | 채택 | 모듈이 매니페스트와 `register`를 함께 내보내는 모양. 우리 배럴이 이미 이것에 가깝다 |
 * | OpenClaw | `PluginManifest` | 없음 | 부분 채택 | id·이름·설명·`activation`·`contracts`만. 나머지는 아래 기각 묶음 |
 * | OpenClaw | `PluginManifestActivation` | 없음 | 부분 채택 | 늦게 켜는 장치. 지금은 전부 `onStartup`이라 껍데기만 가져온다 |
 * | OpenClaw | `PluginManifestContracts` | 없음 | 참고 | "무엇을 소유하는지를 매니페스트가 먼저 말한다"는 생각만. 목록은 우리 기여 지점으로 다시 만든다 |
 * | OpenClaw | `OpenClawPluginApi` 머리(`id`·`name`·`config`·`logger`·`runtime`·`registrationMode`) | 없음 | 부분 채택 | `activate`가 받는 것. VSCode `ExtensionContext`와 겹치므로 둘을 합쳐 하나로 |
 * | OpenClaw | `api.registerTool`·`registerHttpRoute`·`registerCommand`·`registerService` | 없음 | 채택 | 우리에게 대응하는 기여가 실제로 있다 |
 * | OpenClaw | `api.register*` 나머지 예순 | 없음 | 기각 | 아래 기각 묶음 |
 *
 * ### 기각 묶음 — 덮는 필드를 이름으로 적는다
 *
 * 1단계에서 기각한 묶음은 2단계 행을 갖지 않는다. 대신 무엇을 덮었는지 여기 적는다.
 *
 * - **배포·마켓플레이스** — VSCode `publisher`·`version`·`engines`·`preview`·`icon`·`categories`·`keywords`·
 *   `repository`·`bugs`·`scripts`·`extensionPack`·`extensionDependencies`·`extensionAffinity`·`api`·
 *   `enabledApiProposals`·`originalEnabledApiProposals`·`l10n`·`type`; OpenClaw `version`·`catalog`·`categories`·
 *   `legacyPluginIds`·`requiresPlugins`·`enabledByDefault`·`enabledByDefaultOnPlatforms`.
 *   → 확장이 전부 이 저장소의 코드이고 설치·갱신·목록이 없다. 사는 곳이 `packages/` 안이라 버전이 곧 저장소 버전이다.
 * - **언어 편집 기능** — VSCode `grammars`·`languages`·`snippets`·`themes`·`iconThemes`·`productIconThemes`·
 *   `colors`·`localizations`·`debuggers`·`debugVisualizers`·`jsonValidation`·`jsonValidationRegistry`·
 *   `notebooks`·`notebookRenderer`·`codeActions`·`walkthroughs`·`startEntries`·`authentication`.
 *   → 코드 편집기가 아니다. 테마는 Primer가, 색은 토큰이 든다(→ ADR 0009). 인증은 앱 밖이다(Cloudflare Access).
 * - **채널·노드·기기** — OpenClaw `channels`·`channelConfigs`·`channelAccountKeyPolicies`·`cliCommands`·
 *   `cliBackends`·`commandAliases`·`nodeHostCommands`·`api.registerChannel`·`registerNodeHostCommand`·
 *   `registerNodeInvokePolicy`·`registerNodeCliFeature`·`registerCli`·`registerGatewayDiscoveryService`.
 *   → 메신저 어댑터와 여러 기기 위의 실행 노드. 우리는 PWA 하나가 서버 하나에 붙는다.
 * - **모델·프로바이더·미디어** — OpenClaw `providers`·`providerEndpoints`·`providerRequest`·`providerAuthAliases`·
 *   `providerAuthChoices`·`providerUsageAuthEnvVars`·`providerCatalogEntry`·`modelSupport`·`modelCatalog`·
 *   `modelPricing`·`modelIdNormalization`·`syntheticAuthRefs`·`nonSecretAuthMarkers`·`secretProviderIntegrations`·
 *   `mediaUnderstandingProviderMetadata`·`imageGenerationProviderMetadata`·`videoGenerationProviderMetadata`·
 *   `musicGenerationProviderMetadata`·`api.register*Provider` 전부.
 *   → feature 15로 미룬 자리다. 지금은 실행기 하나(`AnthropicRunner`)가 모델을 안다.
 * - **운영 표면** — OpenClaw `doctorContract`·`doctorHealthChecks`·`qaRunners`·`dashboard`·`controlUi`·
 *   `backupResources`·`sessionRouteStateOwners`·`transcriptSources`·`mcpServers`·`skills`·`uiHints`·
 *   `configContracts`·`dangerousConfigFlags`·`api.registerWidgetPresenter`·`registerBoardWidgetContentKind`·
 *   `registerSessionCatalog`·`registerConfigMigration`·`registerMigrationProvider`·`registerAutoEnableProbe`·
 *   `registerSecurityAuditCollector`·`registerContextEngine`·`registerCompactionProvider`·`registerAgentHarness`.
 *   → 남이 만든 플러그인을 진단·이관·감사하는 장치다. 만드는 사람과 쓰는 사람이 같으면 값이 없다.
 *   `skills`는 feature 13으로 미뤘다.
 */

import { z } from "zod";

/**
 * 초안이 참조하는 기존 것. 실제 계약에서는 import로 바뀐다 — 여기서는 이 파일이 홀로 읽히도록 다시 적는다.
 */
declare namespace existing {
  /** `client/src/core/di`. */
  type Disposable = { dispose(): void };
  /** `server/src/features/agent/domain/IAgentTools.ts`. */
  type AgentToolDefinition = {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Record<string, unknown>;
  };
  /** `server/src/features/agent/domain/IAgentTools.ts`. */
  type ToolOutcome = { readonly output: unknown; readonly isError: boolean };
  /** React. */
  type ComponentType<P> = (props: P) => unknown;
  /** hono. */
  type Hono = unknown;
}

/**
 * ## 2단계 검토에서 걸린 것 — `when`이 데이터가 아니다
 *
 * 메뉴와 키바인딩을 매니페스트에 실으려면 `when`이 **문자열**이어야 한다. VSCode는 `"when": "editorFocus"`를
 * 파서(`ContextKeyExpr.deserialize`)가 식으로 바꾼다. ARKA의 `when`은 지금 **함수**다 —
 * `MenuItemDescriptor.when?(ctx): boolean`, `KeybindingDescriptor.when?(ctx): boolean`.
 * 함수는 JSON이 아니므로 선언에 들어갈 수 없다.
 *
 * 그래서 아래 초안의 `contributes`에는 **메뉴와 키바인딩이 없다.** 둘은 feature 04(커맨드·메뉴·when)가
 * `when`을 문자열 식으로 바꾼 뒤에 이 매니페스트로 돌아온다. **feature 04가 01의 메뉴 부분보다 앞이다.**
 *
 * 지금 억지로 넣으면 둘 중 하나가 된다 — `when`을 뺀 반쪽 메뉴 선언(파일 트리 맥락 메뉴가 못 쓴다),
 * 또는 매니페스트에 함수를 담는 것(선언이 아니게 되어 가른 값이 사라진다).
 */

/** 확장을 가리키는 값. 슬라이스 폴더 이름과 같다. */
export const ExtensionId = z.string().min(1);
export type ExtensionId = z.infer<typeof ExtensionId>;

/**
 * 커맨드 선언 — 원본 `ICommand`. 판정 `채택`.
 *
 * 하는 일(`execute`)은 여기 없다. 켜야 아는 것이라 `activate`가 `bindCommand`로 붙인다.
 */
export const CommandContribution = z.object({
  /**
   * ① 커맨드를 부르는 전역 유일 문자열(`workbench.action.showCommands`).
   * ② 팔레트 실행, 키바인딩의 `command`, 메뉴 항목의 `command`가 전부 이 값을 가리킨다.
   * ③ 있다 — `ActionDescriptor.id`가 같은 일을 하고 셋이 같은 방식으로 참조한다.
   * ④ 이름만
   * ⑤ 뜻이 같다. `ICommand.command`는 키 이름이 `command`인 것이 어색해 `id`로 적는다 — `Descriptor.id`와도 맞는다.
   * ⑥ 타입 — 참조가 실재하는지는 `계약 테스트`가 본다.
   */
  id: z.string().min(1),
  /**
   * ① 사람이 읽는 이름. 팔레트에 뜨는 줄.
   * ② 팔레트 목록, 메뉴 항목 글자, 키바인딩 표.
   * ③ 있다 — `ActionDescriptor.label`이 같은 자리다. 팔레트·키바인딩 표가 이미 읽는다.
   * ④ 이름만
   * ⑤ 뜻이 같고 우리 쪽 이름이 `label`이다.
   * ⑥ 타입
   */
  label: z.string().min(1),
  /**
   * ① 팔레트에서 앞에 붙는 묶음 이름(`File: Save`의 `File`).
   * ② 팔레트가 `category: title`로 이어 붙여 그린다. 없으면 제목만.
   * ③ 나중에 — 우리 팔레트는 지금 묶음 없이 평평하다. 커맨드가 늘면 필요해진다.
   * ④ 미룸
   * ⑤ 아래 `뺀 것`에 적는다. 코드가 없으므로 여기 자리를 두지 않는다.
   * ⑥ 리뷰
   */
});
export type CommandContribution = z.infer<typeof CommandContribution>;

/**
 * 활동 막대 항목 — 원본 `IViewContainer`(VSCode `viewsContainers`). 판정 `채택`.
 *
 * 사이드바를 통째로 갈아 끼우는 단위다. 우리 `ActivityBarDescriptor`가 이미 같은 모양이다.
 */
export const ActivityContribution = z.object({
  /**
   * ① 컨테이너 id. `views`의 키가 이 값을 가리킨다.
   * ② 활동 막대 아이콘 등록, `views` 배치의 키, `workbench.view.<id>` 커맨드 생성.
   * ③ 있다 — `ActivityBarDescriptor.id`가 같고 `ShellViewModel`이 `workbench.view.<id>` 꼴로 커맨드를 만든다.
   * ④ 그대로
   * ⑤ 이름·뜻이 같다.
   * ⑥ 타입
   */
  id: z.string().min(1),
  /**
   * ① 컨테이너 제목. 사이드바 머리에 뜬다.
   * ② 사이드바 헤더, 활동 막대 툴팁.
   * ③ 있다 — `ActivityBarDescriptor.title`이 같은 자리다.
   * ④ 그대로
   * ⑤ 이름·뜻이 같다.
   * ⑥ 타입
   */
  title: z.string().min(1),
  /**
   * ① (원본에 없음) 활동 막대에 그릴 아이콘.
   * ② VSCode는 `icon` 경로를 매니페스트에 두고 codicon 또는 파일을 가리킨다.
   * ③ 있다 — `ActivityBarDescriptor.iconId`가 자작 아이콘 세트의 이름을 든다(→ ADR 0009).
   * ④ 이름만
   * ⑤ VSCode는 파일 경로를, 우리는 아이콘 세트의 이름을 든다. 아이콘이 코드라 경로가 아니다.
   * ⑥ 타입 — 이름이 세트에 실재하는지는 `계약 테스트`가 본다.
   */
  iconId: z.string().min(1),
});
export type ActivityContribution = z.infer<typeof ActivityContribution>;

/**
 * 사이드바 패널 — 원본 `IView`(VSCode `views`). 판정 `채택`.
 *
 * 그리는 컴포넌트는 여기 없다. `activate`가 `bindPanel`로 붙인다.
 */
export const PanelContribution = z.object({
  /**
   * ① 뷰 id. 뷰를 켜고 끄고 자리를 옮기는 키.
   * ② `views` 배열 안의 항목, `setHandler`가 `IViewsRegistry`에 넣는 키.
   * ③ 있다 — `SidebarContentDescriptor.id`가 같다.
   * ④ 그대로
   * ⑤ 이름·뜻이 같다.
   * ⑥ 타입
   */
  id: z.string().min(1),
  /**
   * ① (원본은 키로 표현) 이 뷰가 어느 컨테이너에 사나.
   * ② VSCode는 `views`를 `{ [location]: IView[] }` 레코드로 두어 키가 컨테이너를 가리킨다.
   * ③ 있다 — 지금은 활동 id와 패널 id가 우연히 같아서 조립부가 그것에 기대고 있다.
   * ④ 이름만
   * ⑤ 레코드의 키를 필드로 편다. 키로 두면 배열 안에서 자기가 어디 사는지 모르는 항목이 생기고, zod 레코드는 키를 검증하지 못한다.
   * ⑥ zod — 가리키는 활동이 실재하는지는 `계약 테스트`가 본다.
   */
  activity: z.string().min(1),
  /**
   * ① 뷰 제목. 패널 머리에 뜬다.
   * ② 패널 헤더, 뷰 목록 메뉴.
   * ③ 있다 — 지금은 `Panel` 컴포넌트에 문자열로 박혀 있다.
   * ④ 이름만
   * ⑤ 원본은 `name`인데 `IViewContainer.title`과 뜻이 같은 자리다. 둘이 갈려 있을 이유가 없어 `title`로 모은다.
   * ⑥ 타입
   */
  title: z.string().min(1),
});
export type PanelContribution = z.infer<typeof PanelContribution>;

/**
 * 탭 종류 — 원본 `customEditors`(VSCode). 판정 `부분 채택`.
 *
 * 그리는 컴포넌트는 여기 없다. `activate`가 `bindTab`으로 붙인다.
 */
export const TabContribution = z.object({
  /**
   * ① `viewType` — 어떤 자원을 어느 편집기가 여나를 정하는 값.
   * ② 편집기 열기 요청이 `viewType`으로 구현을 찾고, `selector`의 glob이 파일을 고른다.
   * ③ 있다 — `TabContentDescriptor.id`가 탭 종류를 들고 `OpenTab.kind`가 그것을 가리킨다.
   * ④ 이름만
   * ⑤ 뜻이 같다. 우리 어휘가 `kind`고 `OpenTab.kind`와 이름이 맞아야 한다.
   * ⑥ 타입 — `OpenTab.kind`가 실재하는 종류인지는 `계약 테스트`가 본다.
   */
  kind: z.string().min(1),
  /**
   * ① (원본에 없음) 탭 머리에 그릴 아이콘.
   * ② VSCode는 편집기 아이콘을 파일 종류·테마에서 얻는다.
   * ③ 있다 — `TabContentDescriptor.iconId`가 이미 든다.
   * ④ 더함
   * ⑤ VSCode는 아이콘이 파일 확장자와 아이콘 테마에서 나오므로 편집기 선언이 들 이유가 없었다. 우리는 탭 종류가 곧 아이콘이라 선언이 든다.
   * ⑥ 타입
   */
  iconId: z.string().min(1),
});
export type TabContribution = z.infer<typeof TabContribution>;

/**
 * 에이전트 툴 — 원본 `IToolContribution`(VSCode `languageModelTools`)과 OpenClaw `manifest.contracts.tools`. 판정 `부분 채택`.
 *
 * 실행(`execute`)은 여기 없다. 서버 쪽 `activate`가 `bindTool`로 붙인다.
 * 지금 `AgentToolDefinition`은 실행기가 조립부에서 통째로 받는다 — 선언으로 내놓는 자리가 없다.
 */
export const ToolContribution = z.object({
  /**
   * ① 모델이 부르는 툴 이름.
   * ② 모델에게 보내는 툴 목록의 키, 툴 정책(`tools.allow`/`deny`)의 대상, 결과 대응.
   * ③ 있다 — `AgentToolDefinition.name`이 같다.
   * ④ 그대로
   * ⑤ 이름·뜻이 같다.
   * ⑥ 타입 — 중복 이름은 `계약 테스트`가 본다.
   */
  name: z.string().min(1),
  /**
   * ① `modelDescription` — 모델에게 이 툴이 무엇인지 알리는 글. 프롬프트에 들어간다.
   * ② 툴 목록을 만들 때 그대로 모델에게 보낸다. 사람에게 보이는 `userDescription`과 갈려 있다.
   * ③ 있다 — `AgentToolDefinition.description`이 이 일을 한다.
   * ④ 이름만
   * ⑤ 뜻이 같다. 우리는 사람에게 보이는 설명이 따로 없어 `description` 하나로 족하다 — 둘이 되면 그때 원본 이름으로 간다.
   * ⑥ 타입
   */
  description: z.string().min(1),
  /**
   * ① (원본에 없음) 모델이 만들어야 하는 입력의 모양.
   * ② VSCode는 `inputSchema`를 `languageModelToolsParametersSchema.ts`가 따로 검사한다. OpenClaw는 툴 객체가 든다.
   * ③ 있다 — `AgentToolDefinition.inputSchema`가 JSON Schema로 든다.
   * ④ 더함
   * ⑤ VSCode의 기여 선언은 이름만 싣고 스키마는 코드가 낸다. 우리는 선언이 모델에게 그대로 가는 목록이라 스키마가 함께 있어야 한 자리에서 완결된다.
   * ⑥ zod
   */
  inputSchema: z.record(z.string(), z.unknown()),
});
export type ToolContribution = z.infer<typeof ToolContribution>;

/**
 * 정적으로 기여하는 것들 — 원본 `IExtensionContributions`(VSCode). 판정 `부분 채택`.
 *
 * 지점 집합이 **닫혀 있다**. VSCode는 확장이 새 지점을 만들 수 있어 열린 레코드지만, 우리 확장은 전부
 * 이 저장소 코드라 지점이 늘면 이 타입을 함께 고칠 수 있다 — 그리고 그것이 리뷰 지점이다.
 */
export const ExtensionContributions = z.object({
  /**
   * ① 확장이 내놓는 커맨드 목록.
   * ② 팔레트가 확장을 켜기 전에 이 목록만 보고 항목을 그린다. 고르면 그때 확장을 켠다.
   * ③ 있다 — 커맨드는 지금 ViewModel이 만들어질 때 명령형으로 등록된다.
   * ④ 그대로
   * ⑤ 이름·뜻이 같다.
   * ⑥ zod
   */
  commands: z.array(CommandContribution).optional(),
  /**
   * ① `viewsContainers` — 활동 막대에 붙는 컨테이너.
   * ② 활동 막대를 그릴 때 읽는다.
   * ③ 있다 — `IActivityBarRegistry`가 같은 것을 든다.
   * ④ 이름만
   * ⑤ 뜻이 같다. `viewsContainers`는 `views`와 한 글자 차이라 읽을 때 헷갈린다 — 우리 화면 어휘가 "활동"이다.
   * ⑥ zod
   */
  activities: z.array(ActivityContribution).optional(),
  /**
   * ① `views` — 컨테이너 안에 사는 뷰.
   * ② 사이드바를 그릴 때 읽는다.
   * ③ 있다 — `ISidebarContentRegistry`가 같은 것을 든다.
   * ④ 이름만
   * ⑤ 뜻이 같다. 우리 화면 어휘가 "패널"이고 `Panel` 컴포넌트가 이미 그 이름이다.
   * ⑥ zod
   */
  panels: z.array(PanelContribution).optional(),
  /**
   * ① `customEditors` — 자원을 여는 편집기 종류.
   * ② 편집기를 열 때 `viewType`으로 찾는다.
   * ③ 있다 — `ITabContentRegistry`가 같은 것을 든다.
   * ④ 이름만
   * ⑤ 뜻이 같다. 우리는 편집기가 아니라 탭이 단위다(`OpenTab.kind`).
   * ⑥ zod
   */
  tabs: z.array(TabContribution).optional(),
  /**
   * ① `languageModelTools` — 모델이 부를 수 있는 툴.
   * ② 모델 요청을 만들 때 켜져 있는 툴 목록을 모은다.
   * ③ 있다 — `IAgentTools.definitions`가 같은 것을 든다. 다만 지금은 조립부가 통째로 만든다.
   * ④ 이름만
   * ⑤ 뜻이 같다. "languageModel"이 우리 어휘에 없다 — 툴을 쓰는 것은 에이전트다.
   * ⑥ zod
   */
  tools: z.array(ToolContribution).optional(),
});
export type ExtensionContributions = z.infer<typeof ExtensionContributions>;

/**
 * 확장 매니페스트 — 원본 `IExtensionManifest`(VSCode)와 `PluginManifest`(OpenClaw). 판정 `부분 채택`.
 *
 * **작다.** 원본의 스물일곱·예순 필드 중 둘만 남았다 — 나머지는 배포·설치·카탈로그를 말하고
 * 우리에겐 그 시나리오가 없다. 작다는 것이 이 검토의 결과다.
 */
export const ExtensionManifest = z.object({
  /**
   * ① VSCode는 `publisher.name`이 만드는 전역 유일 id, OpenClaw는 `PluginManifest.id`.
   * ② 설치·활성 키, 확장 사이 참조(`extensionDependencies`), 설정 스코프, 기여의 소유자 표시.
   * ③ 있다 — 기여가 누구 것인지 표시할 키가 필요하다. 다만 확장 사이 참조와 설치는 없다.
   * ④ 좁힘
   * ⑤ 마켓플레이스가 없어 전역 유일성을 보장할 주체가 없다. 저장소 안에서만 유일하면 되고 슬라이스 폴더 이름을 그대로 쓴다.
   * ⑥ zod — 중복은 `계약 테스트`가 본다.
   */
  id: ExtensionId,
  /**
   * ① VSCode `displayName`·OpenClaw `name` — 사람이 읽는 이름.
   * ② 확장 목록·설정 화면·오류 메시지.
   * ③ 있다 — 확장 목록 화면은 없지만 오류 보고(`IErrorLog.source`)와 설정 묶음이 읽을 자리다.
   * ④ 이름만
   * ⑤ VSCode는 `name`이 식별자고 `displayName`이 표시다. 우리는 `id`가 식별자를 맡으므로 표시가 `name`을 쓴다.
   * ⑥ 타입
   */
  name: z.string().min(1),
  /**
   * ① 확장이 기여하는 것들.
   * ② 각 기여 지점이 자기 몫을 읽어 레지스트리에 넣는다.
   * ③ 있다 — 레지스트리 다섯이 이미 있고 지금은 조립부가 손으로 채운다.
   * ④ 좁힘
   * ⑤ 지점 집합을 닫았다. 위 `ExtensionContributions` 참조.
   * ⑥ zod
   */
  contributes: ExtensionContributions.optional(),
});
export type ExtensionManifest = z.infer<typeof ExtensionManifest>;

/**
 * ### 뺀 것 — 매니페스트와 기여
 *
 * 코드가 없으므로 여기 한 줄씩 모은다. 여섯 칸은 그대로 다 적는다.
 *
 * - `ICommand.category` — ① 팔레트에서 제목 앞에 붙는 묶음 이름. ② 팔레트가 `category: title`로 이어 붙인다.
 *   ③ 나중에 — 우리 팔레트는 평평하다. ④ 미룸 ⑤ 커맨드가 늘어 팔레트가 길어지면 돌아온다. ⑥ 리뷰
 * - `IExtensionManifest.description`·OpenClaw `description` — ① 확장이 무엇을 하는지 한 줄. ② 마켓플레이스 목록·상세 화면.
 *   ③ 나중에 — 읽는 화면이 없다. ④ 미룸 ⑤ 설정 화면이 확장별로 갈리면 그때 읽을 자리가 생긴다. 읽는 이 없는 글은 낡는다. ⑥ 리뷰
 * - `IExtensionManifest.activationEvents`·OpenClaw `PluginManifestActivation`(`onStartup`·`onProviders`·
 *   `onAgentHarnesses`·`onCommands`·`onChannels`·`onRoutes`·`onConfigPaths`·`onCapabilities`) — ① 이것이 일어나면 확장을 불러오라는 목록.
 *   ② VSCode `ExtensionService`가 이벤트를 듣다가 모듈을 import한다. OpenClaw 활성 계획기가 무엇을 불러올지 고른다.
 *   ③ 나중에 — 확장 다섯이 번들에 있고 셸이 뜰 때 전부 켜진다. ④ 미룸
 *   ⑤ 값이 `"startup"` 하나뿐인 필드가 된다. **"빈 레이어를 미리 만들지 않는다"**(→ CONVENTIONS)에 걸린다 —
 *   늦게 켤 이유가 생기면 그때 필드를 더한다. 매니페스트 모양이 바뀌지 이 결정이 막히지 않는다. ⑥ 리뷰
 * - `IExtensionManifest.main`·`browser`·OpenClaw `PluginManifest`의 진입점 계열 — ① 확장 코드를 어느 파일에서 불러오나.
 *   ② 활성 시점에 그 경로를 import한다. ③ 없다 — 모듈이 매니페스트와 `activate`를 함께 내보내고 조립부가 정적으로 import한다.
 *   ④ 뺌 ⑤ 경로를 문자열로 들면 번들러가 따라가지 못하고, 확장이 저장소 안에 있어 찾을 것도 없다. ⑥ 타입
 * - `IExtensionManifest.extensionKind`(`ui`·`workspace`) — ① 확장이 UI 쪽에서 도나 워크스페이스 쪽에서 도나.
 *   ② 원격 개발에서 확장 호스트를 고른다. ③ 있다 — client와 server 가름이 같은 물음이다.
 *   ④ 뺌 ⑤ 기여 묶음이 이미 어느 쪽인지 말한다(`tools`는 서버, `panels`는 클라이언트). 같은 사실을 두 번 적으면 어긋난다. ⑥ 타입
 * - `IExtensionContributions.configuration`·`configurationDefaults` — ① 확장이 더하는 설정 항목과 기본값.
 *   ② 설정 편집기가 스키마를 그리고, 기본값이 설정 계층의 맨 아래에 깔린다.
 *   ③ 나중에 — `ISettingsModel.Settings`가 지금 고정 두 항목(`density`·`agentConfirmWrites`)이다. ④ 미룸
 *   ⑤ 확장이 설정을 더할 수 있게 하는 것은 그 자체로 한 라운드다 — feature 08(설정·저장소·알림)이 든다. ⑥ 리뷰
 * - `IExtensionContributions.menus`·`keybindings` — ① 메뉴 항목과 키바인딩.
 *   ② `when` 문자열을 파서가 식으로 바꿔 조건을 건다. ③ 있다 — `core/menu`가 같은 것을 든다.
 *   ④ 미룸 ⑤ 위 "`when`이 데이터가 아니다" 참조. feature 04가 `when`을 문자열로 바꾼 뒤에 온다. ⑥ 리뷰
 * - `IToolContribution.displayName`·`userDescription` — ① 사람에게 보이는 이름과 설명(모델용과 갈려 있다).
 *   ② 툴 목록 화면·승인 대화상자. ③ 나중에 — 툴을 사람에게 보여 주는 화면이 feature 03(툴·승인)에서 생긴다.
 *   ④ 미룸 ⑤ 그 화면이 생길 때 무엇이 필요한지가 정해진다. 지금 두면 `description`을 복사해 넣게 된다. ⑥ 리뷰
 * - `IToolSetContribution`·`IMcpCollectionContribution`·`IChatFileContribution`·`IChatParticipantContribution` —
 *   ① 툴 묶음·MCP 서버 제공자·채팅용 파일(프롬프트·지시·에이전트·스킬)·채팅 참가자.
 *   ② 채팅 화면이 `@참가자`와 툴 묶음을 고르게 한다. ③ 없다 — 참가자가 하나고 MCP가 없다.
 *   ④ 뺌 ⑤ 참가자가 여럿이 되면 feature 12(채팅 UI 모델)가 다시 본다. 스킬은 feature 13이다. ⑥ 리뷰
 */

/**
 * ## `activate`가 받는 것
 *
 * 원본 둘이 같은 모양을 갖는다 — VSCode `ExtensionContext`, OpenClaw `OpenClawPluginApi`. 둘을 겹쳐 하나로 낸다.
 *
 * 두 원본 모두 이 객체가 **확장이 바깥에 닿는 유일한 통로**다. VSCode는 `vscode` 모듈 import까지 합쳐 그렇고,
 * OpenClaw는 `api.runtime`·`api.config`가 그 자리다. ARKA에는 이미 그 통로가 있다 — DI 컨테이너다.
 * 그래서 아래 `resolve`가 원본 두 개의 큰 덩어리를 대신한다.
 */
export interface IExtensionApi {
  /**
   * ① VSCode `ExtensionContext.extension`·OpenClaw `api.id`/`name` — 자기가 누구인지.
   * ② 로그·오류 보고의 출처, 설정 스코프 키.
   * ③ 있다 — `IErrorLog.report(error, source)`가 출처 문자열을 받는다.
   * ④ 좁힘
   * ⑤ VSCode는 `Extension<any>` 객체를(패키지 정보·exports까지) 통째로 준다. 우리는 매니페스트만 주면 된다 — 나머지는 설치·활성 상태라 없다.
   * ⑥ 타입
   */
  readonly manifest: ExtensionManifest;
  /**
   * ① OpenClaw `api.runtime`·VSCode의 `vscode` 모듈 import — 호스트가 가진 것에 닿는 통로.
   * ② 확장이 호스트 서비스를 부를 때 전부 여기를 지난다.
   * ③ 있다 — `Container.resolve(token)`가 이미 그 통로다(`core/di`).
   * ④ 이름만
   * ⑤ 원본 둘은 통로를 자기 손으로 만들었다(모듈 하나, 객체 하나). 우리는 DI 컨테이너가 이미 그것이라 얇게 노출만 한다. 새 레지스트리를 만들지 않는다.
   * ⑥ 타입 — 못 찾은 토큰은 `TokenNotRegisteredError`가 던진다.
   */
  resolve<T>(token: unknown): T;
  /**
   * ① VSCode `commands.registerCommand(id, handler)`·OpenClaw `api.registerCommand`.
   * ② 선언에 적힌 id에 실제 동작을 붙인다.
   * ③ 있다 — `ICommandCenterRegistry.registerCommand`가 지금 `{id, label, execute}`를 통째로 받는다.
   * ④ 좁힘
   * ⑤ `id`·`label`이 이미 매니페스트에 있으므로 여기서는 동작만 받는다. 두 번 적으면 어긋난다 — 매니페스트에 없는 id면 던진다.
   * ⑥ 계약 테스트 — 매니페스트에 없는 id를 붙이면 실패한다.
   */
  bindCommand(id: string, execute: (context: unknown) => void): void;
  /**
   * ① VSCode `window.registerWebviewViewProvider`·`registerTreeDataProvider`.
   * ② 선언한 뷰에 실제로 그리는 것을 붙인다.
   * ③ 있다 — `ISidebarContentRegistry.add`가 지금 `{id, PanelComponent}`를 받는다.
   * ④ 좁힘
   * ⑤ `bindCommand`와 같은 이유다. VSCode는 provider(데이터)를 주지만 우리 `component/`는 props만 받는 순수 컴포넌트라 컴포넌트를 그대로 준다(→ ADR 0007).
   * ⑥ 계약 테스트
   */
  bindPanel(id: string, Component: existing.ComponentType<unknown>): void;
  /**
   * ① VSCode `window.registerCustomEditorProvider`.
   * ② 선언한 편집기 종류에 실제로 그리는 것을 붙인다.
   * ③ 있다 — `ITabContentRegistry.add`가 지금 `{id, iconId, TabComponent}`를 받는다.
   * ④ 좁힘
   * ⑤ 위와 같다.
   * ⑥ 계약 테스트
   */
  bindTab(kind: string, Component: existing.ComponentType<unknown>): void;
  /**
   * ① VSCode `IWorkbenchContribution`(수명주기 단계에 맞춰 스스로 시작하는 것)·OpenClaw `api.registerRuntimeLifecycle`.
   * ② 셸이 뜰 때·꺼질 때 확장이 자기 일을 시작·정리한다.
   * ③ 있다 — `IWorkbenchStartupRegistry`가 토큰으로 같은 일을 한다.
   * ④ 좁힘
   * ⑤ VSCode는 단계가 넷(`Starting`·`Ready`·`Restored`·`Eventually`)이다. 우리는 단계가 하나뿐이라 `start`/`stop` 쌍만 남긴다 — 단계를 미리 만들지 않는다.
   * ⑥ 타입
   */
  onStart(start: () => void, stop?: () => void): void;
}

/**
 * 확장 하나 — 원본 `OpenClawPluginDefinition`. 판정 `채택`.
 *
 * 모듈이 선언과 코드를 **함께** 내보낸다. 우리 `extensions/<슬라이스>/index.ts` 배럴이 이미 이 자리에 가장 가깝다.
 */
export interface IExtension {
  /**
   * ① OpenClaw는 `openclaw.plugin.json`이 매니페스트고 모듈이 그것을 되풀이한다(`id`·`name`·`version`·`configSchema`).
   * ② 로더가 파일을 먼저 읽고, 켤 때 모듈의 값과 맞는지 본다.
   * ③ 있다 — 다만 우리는 JSON 파일이 없다.
   * ④ 좁힘
   * ⑤ 매니페스트가 모듈 안에 있으므로 두 벌이 아니다. OpenClaw가 둘을 두는 것은 런타임을 불러오지 않고 읽어야 해서고(그 필드 주석이 그렇게 적혀 있다), 우리는 늦게 켜지 않는다.
   * ⑥ 타입
   */
  readonly manifest: ExtensionManifest;
  /**
   * ① OpenClaw `register(api)`·VSCode `activate(context)` — 켤 때 한 번 불린다.
   * ② 확장이 자기 동작을 호스트에 붙이는 유일한 자리.
   * ③ 있다 — 지금은 `registerServices.tsx`가 확장을 대신해 이 일을 한다.
   * ④ 좁힘
   * ⑤ 원본 둘 다 반환값이 없고 정리는 `subscriptions` 배열(VSCode)이나 별도 등록(OpenClaw)으로 한다. 우리는 `Disposable`을 돌려주는 관례가 이미 있다(`Emitter.event`·`Container`) — 그 하나로 족하다.
   * ⑥ 타입 — 컨테이너가 `Disposable`을 모아 역순으로 정리한다.
   */
  activate(api: IExtensionApi): existing.Disposable;
}

/**
 * 서버 쪽 확장 — 원본 OpenClaw `api.registerHttpRoute`·`registerTool`·`registerService`. 판정 `채택`.
 *
 * client와 같은 매니페스트를 읽고 자기 몫(`contributes.tools`)만 본다. 물음 2가 여기에 걸린다.
 */
export interface IServerExtensionApi {
  /**
   * ① OpenClaw `api.registerHttpRoute({ method, path, handler })`.
   * ② 게이트웨이가 플러그인이 내놓은 경로를 자기 라우터에 붙인다.
   * ③ 있다 — `app.ts`가 `createFsRoutes`·`createGitRoutes` 따위를 손으로 `route()`한다.
   * ④ 좁힘
   * ⑤ OpenClaw는 경로 하나씩 등록한다. 우리 feature는 이미 Hono 라우터를 통째로 내놓으므로 묶음으로 받는다 — 낱개로 바꾸면 지금 코드를 쪼개는 값 없는 일이 된다.
   * ⑥ 타입
   */
  registerRoutes(prefix: string, routes: existing.Hono): void;
  /**
   * ① OpenClaw `api.registerTool(tool, opts)`.
   * ② 모델에게 내놓을 툴 목록에 더한다.
   * ③ 있다 — 지금은 `workspaceTools.ts`가 조립부에서 통째로 만들어진다.
   * ④ 좁힘
   * ⑤ 정의(`name`·`description`·`inputSchema`)는 매니페스트에 있으므로 실행만 받는다. `IAgentTools.execute`의 시그니처를 그대로 쓴다.
   * ⑥ 계약 테스트 — 매니페스트에 없는 이름을 붙이면 실패한다.
   */
  bindTool(name: string, execute: (input: unknown, signal: AbortSignal) => Promise<existing.ToolOutcome>): void;
}

/** 서버 확장 하나. `IExtension`과 같은 모양이고 api만 다르다. */
export interface IServerExtension {
  readonly manifest: ExtensionManifest;
  activate(api: IServerExtensionApi): existing.Disposable;
}

/**
 * ### 뺀 것 — `activate`가 받는 것
 *
 * - VSCode `ExtensionContext.subscriptions` — ① 확장이 정리할 것을 담는 배열. ② 확장이 끌 때 전부 `dispose()`한다.
 *   ③ 있다 — 정리는 필요하다. ④ 뺌 ⑤ `activate`가 `Disposable` 하나를 돌려주는 것으로 대신한다. 우리 컨테이너가 이미 그 방식이다. ⑥ 타입
 * - VSCode `workspaceState`·`globalState`·`secrets`·`environmentVariableCollection` — ① 확장별 키-값 저장소와 비밀값, 터미널 환경변수.
 *   ② 확장이 자기 상태를 저장하고 다음 실행에 읽는다. ③ 있다(저장소) / 없다(비밀값·환경변수) —
 *   `IStorage`가 있지만 확장별로 갈려 있지 않다. ④ 미룸
 *   ⑤ "확장마다 자기 저장소"는 feature 08(설정·저장소)이 든다. 비밀값은 앱이 인증을 모르므로(→ overview) 우리 자리가 아니고, 터미널이 없다. ⑥ 리뷰
 * - VSCode `extensionUri`·`extensionPath`·`asAbsolutePath`·`storageUri`·`storagePath`·`globalStorageUri`·
 *   `globalStoragePath`·`logUri`·`logPath` — ① 확장이 깔린 자리와 쓸 수 있는 디스크 경로들.
 *   ② 확장이 자기 자산을 읽고 파일을 쓴다. ③ 없다 — 클라이언트는 브라우저라 디스크가 없고, 자산은 번들에 들어간다.
 *   ④ 뺌 ⑤ 서버 확장이 디스크를 쓸 일이 생기면 그때 서버 쪽 api에만 더한다 — 지금 `IWorkspace.root` 하나로 족하다. ⑥ 타입
 * - VSCode `extensionMode`(`Production`·`Development`·`Test`) — ① 지금 어느 모드로 도나. ② 확장이 테스트용 분기를 만든다.
 *   ③ 없다 — 분기를 두면 프로덕션에서 안 도는 길이 생긴다. ④ 뺌 ⑤ 테스트는 대역을 꽂아 가른다(`Mock*`), 코드 안 분기로 가르지 않는다. ⑥ 리뷰
 * - VSCode `languageModelAccessInformation` — ① 이 확장이 어떤 모델에 접근할 수 있나. ② 확장이 모델을 부르기 전에 물어본다.
 *   ③ 나중에 — 모델 선택이 feature 15이고 TASK-36이 열려 있다. ④ 미룸 ⑤ 단일 사용자라 확장별 권한이 아니라 설정 하나일 공산이 크다. ⑥ 리뷰
 * - OpenClaw `api.source`·`runtimeSource`·`rootDir`·`registrationMode`·`pluginConfig` — ① 이 플러그인이 어디서 왔고 어떻게 등록됐나.
 *   ② 신뢰 등급을 가르고(번들·설치·개발), 설정을 플러그인별로 떼어 준다. ③ 없다 — 확장이 전부 이 저장소 코드라 출처가 하나다.
 *   ④ 뺌 ⑤ 남이 만든 확장을 받기 시작하면 그때 신뢰 등급이 필요해진다. 그 전에 두면 값이 언제나 같은 필드가 된다. ⑥ 리뷰
 * - OpenClaw `api.config`·`logger` — ① 게이트웨이 설정 전체와 플러그인용 로거. ② 플러그인이 설정을 읽고 로그를 남긴다.
 *   ③ 있다 — `ServerConfig`·`Logger`(서버), `ISettingsModel`·`IErrorLog`(클라이언트). ④ 뺌
 *   ⑤ 넷 다 DI 토큰으로 이미 닿는다. api에 따로 얹으면 같은 것에 가는 길이 둘이 된다. ⑥ 린트 — 슬라이스 경계는 `import-x/no-restricted-paths`가 본다.
 * - OpenClaw `api.session`·`agent`·`runContext`·`lifecycle` 묶음 — ① 세션·에이전트 이벤트·Run 스크래치 상태·정리 훅에 닿는 묶음 표면.
 *   ② 플러그인이 대화에 끼어들고 턴을 예약하고 Run 중간 상태를 남긴다. ③ 나중에 — 우리 에이전트 계약이 아직 이 자리를 안 냈다.
 *   ④ 미룸 ⑤ feature 02(이벤트·세션·Run)와 03(툴·승인)이 먼저 그 모양을 정해야 한다. 그 전에 표면을 만들면 없는 것을 가리킨다. ⑥ 리뷰
 */

/**
 * ## 이 초안이 무는 값 — 사용자가 저울에 올릴 것
 *
 * **같은 id를 두 번 적는다.** 매니페스트에 `{id, label}`, `activate`에서 `bindCommand(id, …)`.
 * 원본 둘은 파일이 갈려 있어(JSON ↔ TS) 이 중복이 불가피했지만, 우리는 같은 모듈 안이라 눈에 띈다.
 * 계약 테스트가 어긋남을 잡지만 **잡을 일 자체가 없는 길**은 지금처럼 한 번에 등록하는 것이다.
 *
 * **얻는 것 셋.** (가) `registerServices.tsx`의 손으로 든 목록이 매니페스트 순회가 된다 —
 * 확장을 더하고 등록을 빠뜨리는 길이 막힌다. (나) 무엇이 기여되는지가 데이터라 기계가 볼 수 있다
 * (지금은 `리뷰`뿐이다). (다) client·server가 같은 선언을 읽으므로 서버 툴과 클라이언트 화면이 한 확장에 묶인다.
 *
 * **잃는 것 하나.** 지금은 등록이 한 줄인데 두 자리가 된다. 확장이 다섯이고 전부 우리 것이면
 * 그 값이 비용을 넘는지가 분명하지 않다 — 그것이 물음 1이다.
 *
 * **순서에 걸리는 것.** feature 04(`when`을 문자열로)가 메뉴·키바인딩 기여보다 앞이다.
 * TASK-38(`contracts/src` 재배치)과 자리가 겹친다. TASK-50(서버 `domain/` 인터페이스 조건)이
 * `IServerExtension`을 `domain/`에 둘지 `core/`에 둘지를 이미 묻고 있다.
 */
