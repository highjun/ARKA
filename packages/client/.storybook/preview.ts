// 실제 앱과 같은 모양이 되게 전역 스타일을 그대로 불러온다 — Primer 토큰(`--fgColor-*` 등)이
// 여기서 온다. 이게 없으면 스토리가 토큰 없는 맨몸으로 그려져 VRT 기준이 무의미해진다.
import "../src/workbench/reset.css";
import "../src/workbench/globals.css";

import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    // VRT가 스토리마다 스크린샷을 찍는다 — 배경이 투명하면 기계마다 다르게 합성된다.
    backgrounds: { disable: true },
  },
};

export default preview;
