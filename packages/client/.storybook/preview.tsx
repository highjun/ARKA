import { ThemeProvider } from "@primer/react";
import type { Preview } from "@storybook/react-vite";

import "../src/workbench/reset.css";
import "../src/workbench/globals.css";

/** 코드의 중단점 두 개(768px·1080px)가 가르는 세 구간. 폭은 각 구간을 대표하는 기기에서 딴다. */
const VIEWPORTS = {
  mobile: { name: "모바일", styles: { width: "390px", height: "844px" }, type: "mobile" },
  tablet: { name: "태블릿", styles: { width: "834px", height: "1112px" }, type: "tablet" },
  desktop: { name: "데스크탑", styles: { width: "1440px", height: "900px" }, type: "desktop" },
} as const;

/**
 * 컴포넌트가 실제로 그려지는 표면. 어디까지가 iframe 의 `<body>`인지 눈으로 재게 한다.
 * Primer 변수는 ThemeProvider 아래에만 있어 `body` 에서는 못 읽는다 — 색을 직접 적는다.
 */
const SURFACE_STYLE = `
  body { outline: 1px dashed rgb(130 130 130 / 80%); outline-offset: -1px; }
  #storybook-root { outline: 1px dashed rgb(9 105 218 / 80%); outline-offset: -1px; }
`;

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    backgrounds: { disable: true },
    viewport: { options: VIEWPORTS },
    /** 사이드바는 기본이 파일 글로브 순서다 — 제목의 `00-`·`01-`·`02-` 접두사가 먹도록 제목순으로 세운다. */
    options: { storySort: { method: "alphabetical" } },
  },
  globalTypes: {
    colorMode: {
      description: "Primer 색 모드",
      toolbar: { title: "Color mode", items: ["light", "dark"], dynamicTitle: true },
    },
    surface: {
      description: "표면 경계 — `<body>`는 회색, 스토리가 붙는 `#storybook-root`는 파란 점선",
      toolbar: { title: "Surface", items: ["off", "on"], dynamicTitle: true },
    },
  },
  initialGlobals: { colorMode: "light", surface: "off", viewport: { value: "desktop", isRotated: false } },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider colorMode={globals["colorMode"] === "dark" ? "dark" : "light"}>
        {globals["surface"] === "on" ? <style>{SURFACE_STYLE}</style> : null}
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
