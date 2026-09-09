import type { StorybookConfig } from '@storybook/react-vite';

/**
 * 스토리는 대상 옆에 둔다(→ ADR 0008) — 여기서는 글롭만 가리킨다.
 *
 * `shared/components/`와 각 슬라이스의 `component/`는 전부 대상이다.
 *
 * `view/`는 **조합이 드러나는 것만** 대상이다 — 화면 한 구역을 실제로 채우는 view(`ShellView`,
 * `DirectoryTreeView`, `ChatTabView`, `SourceControlView`, `SearchView`, `SettingsTabView`).
 * 나머지 view는 컴포넌트 하나에 값을 꽂는 얇은 바인딩이라 그 컴포넌트의 스토리가 이미 같은
 * 그림을 덮는다 — 스토리를 더 만들어도 새로 보이는 것이 없고 VRT 기준 이미지만 늘어난다.
 *
 * view 스토리는 컨테이너에 Mock 서비스를 등록하고 `ViewModelProvider`로 감싸는 데코레이터를
 * 각자 갖는다. `<Name>View.test.tsx`가 이미 쓰는 구성과 같다 — 공용 헬퍼를 따로 두지 않는 것은
 * `shared/`가 아무것도 import할 수 없어서 `#core/di`를 쓰는 헬퍼가 거기 못 살기 때문이다.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  // jsdom엔 레이아웃·페인트가 없어 단위 테스트의 axe는 `color-contrast`를 끈다
  // (`shared/utils/axe.tsx`). 실제 브라우저에서 그걸 보는 자리가 여기다.
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  // 로컬 전용 도구라 사용 통계를 밖으로 보내지 않는다.
  core: { disableTelemetry: true },
  // vite.config의 PWA 플러그인은 앱 빌드용이다 — 스토리북에 얹히면 매니저 번들(3MB)이 프리캐시 상한에 걸려
  // 빌드가 죽고, 스토리북에 서비스 워커가 있을 이유도 없다.
  viteFinal: (config) => ({
    ...config,
    plugins: (config.plugins ?? []).flat().filter((plugin) => !(plugin !== null && typeof plugin === 'object' && 'name' in plugin && String(plugin.name).startsWith('vite-plugin-pwa'))),
  }),
};

export default config;
