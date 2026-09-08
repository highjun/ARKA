import type { StorybookConfig } from '@storybook/react-vite';

/**
 * 스토리는 대상 옆에 둔다(→ ADR 0008) — 여기서는 글롭만 가리킨다.
 *
 * `shared/components/`와 각 슬라이스의 `component/`가 대상이고, `view/`는 ViewModel에 묶여
 * 있어 컨테이너 상태만 골라 쓴다.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
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
