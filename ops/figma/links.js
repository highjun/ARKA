/**
 * 세트·컴포넌트 이름 → **Figma 노드 id 표**를 뽑는다. 플러그인 안에서 돈다.
 *
 *     (0, eval)(await (await fetch("http://localhost:9230/tool/links.js")).text());
 *     JSON.stringify(await globalThis.__arka.links.dump(), null, 2)
 *
 * 나온 것을 `ops/figma/links.json` 에 넣는다. **손으로 적지 않는다** — 노드 id 는 세트를 다시
 * 지을 때마다 바뀌고, 코드에 흩뿌리면 어디가 낡았는지 알 수 없다.
 *
 * 이 표가 있어야 스토리 위에 **어느 그림**을 겹칠지 가리킬 수 있다. Code Connect 가 하던
 * 일인데 그것은 Organization 전용이라 우리 플랜에서 막혀 있다.
 *
 * `set` 은 세트 자체(변형 전부를 담은 프레임), `default` 는 기본 변형 하나다. 스토리 하나에
 * 겹칠 것은 보통 `default` 다 — 세트를 겹치면 변형이 격자로 늘어선 그림이 온다.
 */
globalThis.__arka = globalThis.__arka ?? {};

globalThis.__arka.links = (() => {
  /** 그림 페이지. 기능 페이지가 늘면 여기 더한다. */
  const PAGES = ["01 Shared", "02 Workbench"];

  return {
    /** `{ fileKey, 뽑은날, nodes: { 이름: { page, set, default, w, h } } }`. */
    async dump() {
      await figma.loadAllPagesAsync();
      const nodes = {};
      for (const pageName of PAGES) {
        const page = figma.root.children.find((p) => p.name === pageName);
        if (!page) continue;
        const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
        if (!sec) continue;
        for (const n of sec.findAll(
          (x) => x.type === "COMPONENT_SET" || (x.type === "COMPONENT" && x.parent?.type !== "COMPONENT_SET"),
        )) {
          // Foundation 의 글리프는 겹쳐 볼 스토리가 없다.
          if (/^Icon\//u.test(n.name)) continue;
          const 기본 = n.type === "COMPONENT_SET" ? (n.defaultVariant ?? n.children[0]) : n;
          nodes[n.name] = {
            page: pageName,
            set: n.id,
            default: 기본.id,
            w: Math.round(기본.width),
            h: Math.round(기본.height),
          };
        }
      }
      const sorted = {};
      for (const k of Object.keys(nodes).sort()) sorted[k] = nodes[k];
      const 오늘 = new Date();
      const two = (v) => String(v).padStart(2, "0");
      return {
        fileKey: figma.fileKey ?? "G6leROpmOcU02ItneDDJKZ",
        뽑은날: `${String(오늘.getFullYear())}-${two(오늘.getMonth() + 1)}-${two(오늘.getDate())}`,
        nodes: sorted,
      };
    },
  };
})();
