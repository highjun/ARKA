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
};

export default config;
