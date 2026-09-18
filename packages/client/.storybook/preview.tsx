import { ThemeProvider } from "@primer/react";
import type { Preview } from "@storybook/react-vite";

// 실제 앱과 같은 모양이 되게 전역 스타일을 그대로 불러온다 — Primer 토큰(`--space-*`·서체 등)이
// 여기서 온다. 이게 없으면 스토리가 토큰 없는 맨몸으로 그려져 VRT 기준이 무의미해진다.
import "../src/workbench/reset.css";
import "../src/workbench/globals.css";

/**
 * **색 토큰은 `ThemeProvider` 가 있어야 풀린다.** Primer 의 색은 전부 `[data-color-mode][data-light-theme]`
 * 선택자 아래 있고, 앱은 `Shell` 이 그 속성을 단다. 스토리는 `Shell` 밖이라 2026-09-18 까지 색 토큰이
 * 하나도 없이 그려졌다(테두리 검정, 구문 색 없음 — 스토리북과 Figma 를 대조하다 발견).
 * 툴바의 `colorMode` 로 밝기를 바꿔 Figma 의 다크 시트와 나란히 볼 수 있다.
 */
const preview: Preview = {
  parameters: {
    // VRT가 스토리마다 스크린샷을 찍는다 — 배경이 투명하면 기계마다 다르게 합성된다.
    backgrounds: { disable: true },
  },
  globalTypes: {
    colorMode: {
      description: "Primer 색 모드",
      toolbar: { title: "Color mode", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { colorMode: "light" },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider colorMode={globals["colorMode"] === "dark" ? "dark" : "light"}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
