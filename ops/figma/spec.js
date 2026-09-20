/**
 * 컴포넌트 세트를 **스펙 시트**로 편다. 플러그인 안에서 돈다.
 *
 *     (0, eval)(await (await fetch("http://localhost:9230/tool/meta.js")).text());   // 먼저
 *     (0, eval)(await (await fetch("http://localhost:9230/tool/spec.js")).text());
 *     await globalThis.__arka.spec.boot();
 *     await globalThis.__arka.spec.sheet("Text", { defaults: { size: "medium" } });
 *     await globalThis.__arka.spec.group("Menu", ["Menu/Content","Menu/Item","Menu/RadioItem","Menu/Label","Menu/Separator"]);
 *     await globalThis.__arka.spec.stack("01 Shared");
 *
 * **왼쪽은 문서, 오른쪽은 덤프.** 페이지를 아래로 내리면 왼쪽 열만 읽으면 된다.
 * 문서는 세 겹이다 — **설명 한 줄 → prop 표 → 견본 블록 둘(`Props`·`CSS-State`)**.
 * 설명과 갈래는 `meta.js` 가 쥔다. 그것을 먼저 읽어 두지 않으면 표와 갈래가 비어 나온다.
 *
 * ① **문서 — 축마다 한 줄, 인스턴스로.** 그 축만 바꾸고 나머지 축은 기본값에 둔다. 한 축이
 *    무엇을 바꾸는지가 한 줄에 보인다. 인스턴스라 세트를 고치면 문서가 따라온다.
 * ② **덤프 — 세트 자체.** 모든 조합. 오른쪽에 접어 두고 필요할 때만 본다.
 *
 * **컴파운드는 `group()` 으로 한 장에 모은다** — `Menu/Content`·`Menu/Item`… 을 따로 흩어 두면
 * 파일만 봐선 한 컴포넌트의 부품인지 알 수가 없다.
 *
 * **자리는 전부 오토레이아웃이 잡는다.** 좌표를 손으로 주면 변형 폭이 바뀔 때마다 어긋난다.
 * `resize()` 는 두 축의 사이징을 FIXED 로 덮으므로 **사이징을 resize 뒤에 다시 건다.**
 */
globalThis.__arka = globalThis.__arka ?? {};

globalThis.__arka.spec = (() => {
  const DOC_W = 760; // 문서 열 너비 — 덤프가 같은 x 에서 시작하게 고정한다
  const DUMP_W = 880; // 덤프 너비. 넘치면 접힌다
  const PAD = 40;
  const GAP_COL = 96; // 문서 ↔ 덤프
  const GAP_AXIS = 36; // 축 줄 사이
  const GAP_PART = 52; // 부품 블록 사이
  const GAP_CELL = 40; // 칸 사이
  const GAP_LABEL = 8; // 값 이름 ↔ 견본

  let V = {},
    S = {};

  const solid = (name) => {
    if (!V[name]) return [];
    return [
      {
        type: "SOLID",
        color: { r: 0.5, g: 0.5, b: 0.5 },
        opacity: 1,
        boundVariables: { color: figma.variables.createVariableAlias(V[name]) },
      },
    ];
  };

  const box = (name, mode, gap = 0, { align = "MIN", fill = null, pad = 0 } = {}) => {
    const f = figma.createFrame();
    f.name = name;
    f.layoutMode = mode;
    f.itemSpacing = gap;
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
    f.counterAxisAlignItems = align;
    f.clipsContent = false;
    f.fills = fill ? solid(fill) : [];
    f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = pad;
    return f;
  };

  /** 글자 하나. **스타일을 붙이고 글자 속성은 건드리지 않는다** — 스타일이 이긴다. */
  const text = async (chars, styleName, colorVar, name) => {
    const t = figma.createText();
    const style = S[styleName];
    await figma.loadFontAsync(style ? style.fontName : { family: "Noto Sans KR", style: "Regular" });
    if (style) {
      t.fontName = style.fontName;
      await t.setTextStyleIdAsync(style.id);
    }
    t.characters = chars;
    t.fills = solid(colorVar);
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.name = name ?? chars;
    return t;
  };

  /** `"variant=body, size=small"` → `{variant:"body", size:"small"}` */
  const parse = (s) => Object.fromEntries(s.split(",").map((p) => p.trim().split("=")));

  /** 그 축의 값을 **정의 순서대로**, 실제로 쓰인 것만. */
  const values = (defs, axis, items) => {
    const used = new Set(items.map((i) => i.props[axis]));
    return defs[axis].variantOptions.filter((v) => used.has(v));
  };

  /**
   * `axis = value` 이고 **나머지 축은 기본값**인 변형을 고른다.
   * 딱 맞는 것이 없으면(예: `caption` 엔 `size=small` 이 없다) 기본값과 제일 많이 맞는 것을 쓴다.
   */
  const pick = (items, defs, names, axis, value, defaults) => {
    const want = (b) => defaults?.[b] ?? defs[b].defaultValue;
    const cand = items.filter((i) => i.props[axis] === value);
    const score = (i) => names.reduce((n, b) => n + (b !== axis && i.props[b] === want(b) ? 1 : 0), 0);
    return cand.sort((a, b) => score(b) - score(a))[0];
  };

  /** 오토레이아웃 자식의 너비를 못 박는다. **사이징을 resize 뒤에 다시 건다.** */
  const fixW = (node, w) => {
    node.resize(w, node.height);
    node.layoutSizingHorizontal = "FIXED";
    node.layoutSizingVertical = "HUG";
  };

  /**
   * 이름 열 너비 — 모든 줄이 같은 x 에서 시작해야 읽힌다.
   * **축 이름과 속성 이름을 같이 잰다** — `Props` 블록도 같은 열을 쓰기 때문이다.
   */
  const measureAxes = async (setList) => {
    const probe = [];
    for (const set of setList) {
      const defs = set.componentPropertyDefinitions ?? {};
      for (const k of Object.keys(defs)) {
        probe.push(await text(shortKey(k), "Body/Small", "fgColor/default", "probe"));
      }
    }
    const w = probe.length ? Math.max(...probe.map((t) => t.width)) : 0;
    for (const t of probe) t.remove();
    return w;
  };

  const meta = () => globalThis.__arka?.meta ?? null;

  /** `leadingVisual#123:4` → `leadingVisual`. 축 이름엔 `#` 이 없어 그대로 나온다. */
  const shortKey = (k) => k.split("#")[0];

  /** `meta` 에 갈래가 없을 때의 마지막 수단. 패널에 뜨는 말과 맞춘다. */
  const TYPE_WORD = { BOOLEAN: "boolean", INSTANCE_SWAP: "slot", TEXT: "string" };

  /**
   * 줄 하나 — 이름(+갈래) 칸 + 견본 칸들.
   *
   * 이름 칸은 **값 이름 높이만큼 띄운 칸**을 위에 둬서 견본과 같은 줄에 선다 —
   * 아래 정렬로 두면 견본이 500px 인 줄에서 이름이 바닥에 떨어진다.
   */
  const row = async (into, label, kindWord, cells, axisW) => {
    const r = box(`Row/${label}`, "HORIZONTAL", GAP_CELL, { align: "MIN" });
    into.appendChild(r);

    const nameCell = box("Name", "VERTICAL", GAP_LABEL);
    r.appendChild(nameCell);
    const spacer = box("Spacer", "VERTICAL", 0);
    nameCell.appendChild(spacer);
    nameCell.appendChild(await text(label, "Body/Small", "fgColor/default", "Name"));
    if (kindWord) nameCell.appendChild(await text(kindWord, "Caption", "fgColor/muted", "Kind"));

    let labelH = 0;
    for (const c of cells) {
      const cell = box(`${label}=${c.label}`, "VERTICAL", GAP_LABEL);
      r.appendChild(cell);
      const vt = await text(c.label, "Caption", "fgColor/muted", "Value");
      cell.appendChild(vt);
      labelH = Math.max(labelH, vt.height);
      c.node.name = c.label;
      cell.appendChild(c.node);
    }
    spacer.resize(1, Math.max(1, labelH));
    spacer.layoutSizingHorizontal = "FIXED";
    spacer.layoutSizingVertical = "FIXED";
    if (axisW) fixW(nameCell, axisW);
    return cells.length;
  };

  /**
   * 견본 블록 둘 — **`Props`** 와 **`CSS-State`**.
   *
   * 한 줄이 변형 축인지 컴포넌트 속성인지는 **시트에 안 드러낸다** — 그건 Figma 의 사정이지
   * 컴포넌트의 사정이 아니다. 갈래는 `meta` 에서 읽고, **표에 없는 키는 안 그린다**
   * (지어내지 않고 `meta.audit()` 이 잡게 둔다).
   */
  const blocks = async (
    into,
    node,
    { defaults = null, axisW = 0, metaName = null, prefix = "", 층 = "Title/Small" } = {},
  ) => {
    const M = meta();
    const name = metaName ?? node.name;
    const defs = node.componentPropertyDefinitions ?? {};
    const isSet = node.type === "COMPONENT_SET";
    const items = isSet ? node.children.map((n) => ({ node: n, props: parse(n.name) })) : [];
    const axes = Object.keys(defs).filter((k) => defs[k].type === "VARIANT");
    const base = isSet ? (node.defaultVariant ?? node.children[0]) : node;
    if (!base) return 0;

    /** 그 축만 바꾸고 나머지 축은 기본값에 둔 견본들. */
    const 축칸 = (a) =>
      values(defs, a, items)
        .map((v) => {
          const it = pick(items, defs, axes, a, v, defaults);
          return it ? { label: v, node: it.node.createInstance() } : null;
        })
        .filter(Boolean);

    /** 변형이 아닌 속성 — 켜고 끈 견본 둘, 또는 기본값 하나. */
    const 속성칸 = async (k) => {
      const d = defs[k];
      if (d.type === "BOOLEAN") {
        return [false, true].map((v) => {
          const i = base.createInstance();
          try {
            i.setProperties({ [k]: v });
          } catch {
            /* 참조가 끊긴 속성은 기본 꼴로 둔다 */
          }
          return { label: String(v), node: i };
        });
      }
      const i = base.createInstance();
      if (d.type === "INSTANCE_SWAP") {
        // 기본값은 컴포넌트 **key** 라 이름을 얻으려면 통신이 든다. 대신 바탕에서 그 속성에
        // 묶인 자식이 **지금 물고 있는 정본**의 이름을 읽는다 — 같은 값이고 공짜다.
        const bound = base.findOne((n) => n.componentPropertyReferences?.mainComponent === k);
        const 정본 = bound?.type === "INSTANCE" ? await bound.getMainComponentAsync() : null;
        return [{ label: 정본?.name ?? bound?.name ?? "기본값", node: i }];
      }
      return [{ label: String(d.defaultValue ?? "").slice(0, 24) || "빈 글", node: i }];
    };

    const props = [],
      css = [];
    for (const a of axes) {
      const 갈래 = M?.kind(name, a) ?? null;
      (M?.isCss(name, a) ? css : props).push({ key: a, 갈래, 칸: 축칸(a) });
    }
    for (const k of Object.keys(defs).filter((x) => defs[x].type !== "VARIANT")) {
      const short = shortKey(k);
      props.push({ key: short, 갈래: M?.kind(name, short) ?? TYPE_WORD[defs[k].type], 칸: await 속성칸(k) });
    }

    let made = 0,
      차 = 0;
    for (const [제목, 줄들, 갈래보임] of [
      ["Props", props, true],
      ["CSS-State", css, false],
    ]) {
      if (!줄들.length) continue;
      차 += 1;
      const blk = box(제목, "VERTICAL", GAP_AXIS);
      into.appendChild(blk);
      // 컴파운드 안이면 `28.4.1. Props`, 홀로 선 시트면 `6.1. Props`. `prefix` 가 그 앞자리다.
      blk.appendChild(await text(`${prefix}${차}. ${제목}`, 층, "fgColor/default", "Head"));
      for (const r of 줄들) made += await row(blk, r.key, 갈래보임 ? r.갈래 : null, r.칸, axisW);
    }
    return made;
  };

  const T_NUM = 56,
    T_GROUP = 120,
    T_NAME = 180,
    T_TYPE = 96,
    T_GAP = 16;

  /**
   * **표 하나.** `머리` 한 줄과 `줄들` 을 쌓고 칸마다 폭을 못 박는다.
   *
   * prop 표·부품 목록·페이지 목차가 전부 이 꼴이라 여기 한 곳에서 짠다.
   * `폭들` 의 마지막 칸은 `null` 로 두면 남는 자리를 다 먹는다(설명 칸).
   *
   * **폭을 먼저 못 박아야 FILL 이 먹는다.** 그리고 `layoutGrow` 대신 `FILL` 을 쓴다 —
   * `layoutGrow = 1` 은 글자의 `textAutoResize` 를 `NONE` 으로 바꿔 긴 설명을 잘라 먹는다.
   */
  const table = async (into, 이름, 머리, 줄들, 폭들, { 폭 = DOC_W } = {}) => {
    const tbl = box(이름, "VERTICAL", 0);
    into.appendChild(tbl);
    const 칸이름 = 머리.map((_, i) => `C${String(i)}`);

    const line = async (cells, style, color, head) => {
      const r = box(head ? "Head" : `Row/${cells[0]}`, "HORIZONTAL", T_GAP, { align: "MIN" });
      r.paddingTop = r.paddingBottom = 8;
      if (head) {
        r.strokes = solid("borderColor/muted");
        r.strokeLeftWeight = r.strokeRightWeight = r.strokeTopWeight = 0;
        r.strokeBottomWeight = 1;
        r.paddingTop = 0;
      }
      tbl.appendChild(r);
      const made = [];
      for (const [i, c] of cells.entries()) made.push(await text(c, style, color, 칸이름[i]));
      for (const t of made) r.appendChild(t);
      return made;
    };

    const 칸들 = [await line(머리, "Caption", "fgColor/muted", true)];
    for (const 줄 of 줄들) 칸들.push(await line(줄, "Body/Small", "fgColor/default", false));

    fixW(tbl, 폭);
    for (const 칸 of 칸들) {
      칸[0].parent.layoutSizingHorizontal = "FILL";
      for (const [i, t] of 칸.entries()) {
        if (폭들[i] === null || 폭들[i] === undefined) {
          t.layoutSizingHorizontal = "FILL";
          t.textAutoResize = "HEIGHT";
        } else {
          fixW(t, 폭들[i]);
        }
      }
    }
    return 줄들.length;
  };

  /**
   * 설명 아래의 **prop 표** — `name · type · description` 세 칸.
   *
   * 견본 블록은 Figma 가 그릴 수 있는 것만 보여 준다. `onClick`·`items`·`content` 처럼
   * 보이는 모양이 없는 prop 은 **여기에만** 선다. 인터페이스 전체를 한자리에서 보려는 표다.
   */
  const propTable = async (into, setName) => {
    const rows = meta()?.rows(setName) ?? [];
    if (!rows.length) return 0;
    return await table(
      into,
      "Props Table",
      ["name", "type", "description"],
      rows.map((r) => [r.name, r.type, r.desc]),
      [T_NAME, T_TYPE, null],
    );
  };

  /**
   * **부품 목록** — 이 시트가 무엇 무엇을 다루는지 한자리에서 보여 준다. `N.1` 자리다.
   *
   * 이게 없으면 시트가 곧장 첫 부품으로 뛰어들어, 읽는 사람이 끝까지 스크롤해야 절이 몇인지
   * 안다. **`#` 칸에 절 번호를 그대로 적는다** — `28.4` 를 보고 내려가면 `28.4. Item` 이 있다.
   *
   * @param 절들 - `[{ 번호, 이름, 무엇 }]`.
   */
  const partIndex = async (into, 절들, 번호) => {
    const blk = box("Parts", "VERTICAL", GAP_LABEL);
    into.appendChild(blk);
    blk.appendChild(await text(`${번호} 부품 목록`, "Title/Medium", "fgColor/default", "Head"));
    return await table(
      blk,
      "Parts Table",
      ["#", "name", "무엇"],
      절들.map((절) => [절.번호, 절.이름, 절.무엇]),
      [T_NUM, T_NAME, null],
    );
  };

  /** 세트를 오른쪽 덤프로 접는다. */
  const dumpInto = async (dump, set) => {
    set.layoutMode = "HORIZONTAL";
    set.layoutWrap = "WRAP";
    set.itemSpacing = 20;
    set.counterAxisSpacing = 20;
    set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 20;
    set.counterAxisAlignItems = "CENTER";
    // 칠하지 않고 테두리로만 가른다 — `bgColor/muted` 는 다크에서 되레 밝아 안의 흐린 글자를 덮는다.
    set.fills = [];
    set.strokes = solid("borderColor/muted");
    set.strokeWeight = 1;
    set.clipsContent = false;
    dump.appendChild(set);
    // 넘치면 접히게 폭을 못 박는다. **사이징은 resize 뒤에 다시 건다.**
    set.resize(DUMP_W, set.height);
    set.layoutSizingHorizontal = "FIXED";
    set.layoutSizingVertical = "HUG";
  };

  /** 이름으로 세트나 컴포넌트를 찾는다. */
  const findNode = (name) => {
    for (const p of figma.root.children) {
      const set = p.findOne((n) => n.type === "COMPONENT_SET" && n.name === name);
      if (set) return set;
    }
    for (const p of figma.root.children) {
      const c = p.findOne((n) => n.type === "COMPONENT" && n.name === name && n.parent?.type !== "COMPONENT_SET");
      if (c) return c;
    }
    return null;
  };

  /** 두 자리 번호. 글자 차례와 숫자 차례가 같아야 왼쪽 레이어 목록이 차례가 된다. */
  const 두자리 = (n) => String(n).padStart(2, "0");

  /**
   * 시트 프레임 이름 — `01 Text Spec`. `묶음` 에 없는 세트는 번호 없이 `Text Spec`.
   *
   * **옛 이름도 찾아야 한다.** 번호가 붙기 전에 그린 시트를 못 찾으면 한 페이지에 둘이 남는다.
   */
  const sheetNameOf = (name) => {
    const 자리 = meta()?.자리(name);
    return 자리 ? `${두자리(자리.번호)} ${name} Spec` : `${name} Spec`;
  };
  const isSheetOf = (nodeName, name) => new RegExp(`^(?:\\d+ )?${name} Spec$`, "u").test(nodeName);

  /**
   * 노드를 품고 있는 옛 시트를 조상에서 찾아 노드를 꺼내고 지운다.
   * 안 그러면 다시 돌릴 때 시트가 시트 안에 겹쳐 쌓인다.
   */
  const unwrap = (nodes, name) => {
    let home = null;
    for (const n of nodes) {
      let up = n.parent,
        oldSheet = null;
      while (up && up.type !== "PAGE" && up.type !== "SECTION") {
        if (isSheetOf(up.name, name)) oldSheet = up;
        up = up.parent;
      }
      home = home ?? (oldSheet ? oldSheet.parent : n.parent);
      home.appendChild(n);
    }
    for (const c of [...home.children]) if (!nodes.includes(c) && isSheetOf(c.name, name)) c.remove();
    return home;
  };

  return {
    async boot() {
      V = {};
      S = {};
      for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
        for (const id of col.variableIds) {
          const v = await figma.variables.getVariableByIdAsync(id);
          V[v.name] = v;
        }
      }
      for (const s of await figma.getLocalTextStylesAsync()) S[s.name] = s;
      await figma.loadAllPagesAsync();
      return { 변수: Object.keys(V).length, 스타일: Object.keys(S).length };
    },

    /** 세트 하나를 시트로. `defaults` 로 "나머지 축의 기본값"을 코드에 맞춰 줄 수 있다. */
    async sheet(setName, { defaults = null } = {}) {
      if (!Object.keys(S).length) await this.boot();
      const node = findNode(setName);
      if (!node) throw new Error(`없음: ${setName}`);
      if (node.type === "COMPONENT") return await this.plain(node);

      const set = node;
      const sheetName = sheetNameOf(setName);
      const home = unwrap([set], setName);

      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);

      const doc = box("Doc", "VERTICAL", GAP_AXIS);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      const N = meta()?.자리(setName) ? String(meta().자리(setName).번호) : null;
      head.appendChild(await text(N ? `${N}. ${setName}` : setName, "Title/Large", "fgColor/default", "Title"));
      if (set.description) head.appendChild(await text(set.description, "Caption", "fgColor/muted", "Source"));

      const 표 = await propTable(doc, setName);
      const axisW = await measureAxes([set]);
      // 부품이 없으니 절이 곧 견본 묶음이다 — `6.1. Props` · `6.2. CSS-State`.
      const 인스턴스 = await blocks(doc, set, { defaults, axisW, prefix: N ? `${N}.` : "", 층: "Title/Medium" });
      // 덤프가 시트마다 같은 x 에서 시작하도록 문서 너비를 못 박는다. 다만 축 값이 많아
      // 줄이 더 길면 그쪽에 맞춘다 — 고정폭보다 넓은 줄은 삐져나가기 때문이다.
      fixW(doc, Math.max(DOC_W, Math.ceil(doc.width)));

      const dump = box(`${setName} Variants`, "VERTICAL", 12);
      sheet.appendChild(dump);
      dump.appendChild(await text("Variants", "Caption", "fgColor/muted", "Caption"));
      await dumpInto(dump, set);

      return {
        세트: setName,
        인스턴스,
        표,
        변형: set.children.length,
        크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}`,
      };
    },

    /**
     * **컴파운드 한 장.** 부품 여럿을 한 시트에 절로 쌓고, 덤프도 한 칸에 모은다.
     *
     * `parts` 를 안 주면 `meta` 의 `부품` 을 읽는다 — 거기가 정본이다.
     * **루트는 어느 목록에도 안 적는다. 여기서 맨 뒤에 붙인다** — 작은 조각부터 읽고
     * 마지막에 전체를 보는 차례다(두 페이지 공통).
     */
    async group(name, parts = meta()?.of(name)?.부품 ?? [], { defaults = null, source = null } = {}) {
      if (!Object.keys(S).length) await this.boot();
      // **`가상: true` 인 부품은 Figma 노드가 없다** — 표만 세우고 견본은 건너뛴다.
      // (`Menu/Trigger`·`NavList/Group` 처럼 코드에만 있는 부품이 시트에서 사라지지 않게.)
      const 이름들 = [...parts, name];
      const nodes = 이름들.map((p) => findNode(p));
      const sheetName = sheetNameOf(name);
      const home = unwrap(nodes.filter(Boolean), name);
      // 부품이 저마다 제 시트를 갖고 있었다면 그것도 걷는다.
      for (const p of parts) for (const c of [...home.children]) if (isSheetOf(c.name, p)) c.remove();

      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);

      const doc = box("Doc", "VERTICAL", GAP_PART);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      const 자리 = meta()?.자리(name) ?? null;
      const N = 자리 ? String(자리.번호) : null;
      head.appendChild(await text(N ? `${N}. ${name}` : name, "Title/Large", "fgColor/default", "Title"));
      // **루트의 설명을 먼저 쓴다.** 노드 쪽을 먼저 보면 루트가 가상일 때(`Menu`) 노드가 있는
      // 첫 부품의 것을 집어 와 `Menu` 자리에 `Menu.Content` 의 설명이 선다.
      const src = source ?? meta()?.of(name)?.설명 ?? nodes.find((n) => n?.description)?.description;
      if (src) head.appendChild(await text(src, "Caption", "fgColor/muted", "Source"));

      const axisW = await measureAxes(nodes.filter(Boolean));
      // **`N.1` 은 부품 목록, 절은 `N.2` 부터.** 차례의 `#` 와 절 제목이 글자로 같아야 눈이 따라간다.
      const 짧게 = (full) => (full.includes("/") ? full.split("/").slice(1).join("/") : full);
      const 절들 = 이름들.map((full, i) => ({
        번호: N ? `${N}.${String(i + 2)}` : String(i + 1),
        이름: 짧게(full),
        무엇: meta()?.of(full)?.설명 ?? "",
        full,
      }));
      // **목록이 먼저다** — 무엇으로 되어 있는지 보고 나서 하나씩 읽는다.
      const 차례 = await partIndex(doc, 절들, N ? `${N}.1.` : "1.");

      let 인스턴스 = 0,
        표 = 0;
      for (const [i, node] of nodes.entries()) {
        const 절 = 절들[i];
        const 루트인가 = i === nodes.length - 1;
        const block = box(`Part/${절.이름}`, "VERTICAL", GAP_AXIS);
        doc.appendChild(block);
        // 제목과 설명은 한 머리다 — 떼어 놓으면 설명이 아래 표에 붙어 보인다.
        // 루트는 설명을 안 단다 — 시트 머리에 이미 같은 줄이 섰다.
        const 머리 = box("Head", "VERTICAL", 6);
        block.appendChild(머리);
        머리.appendChild(await text(`${절.번호}. ${절.이름}`, "Title/Medium", "fgColor/default", "Part"));
        if (절.무엇 && !루트인가) 머리.appendChild(await text(절.무엇, "Caption", "fgColor/muted", "PartDesc"));
        표 += await propTable(block, 절.full);
        if (!node) continue; // 가상 부품 — 표까지만
        const n = await blocks(block, node, {
          defaults: defaults?.[절.full] ?? null,
          axisW,
          metaName: 절.full,
          prefix: `${절.번호}.`,
        });
        인스턴스 += n;
        // 축도 속성도 없는 부품 — 견본 하나로 족하다. 제목을 달아야 번호가 안 비어 보인다.
        if (!n) {
          const blk = box("Sample", "VERTICAL", GAP_AXIS);
          block.appendChild(blk);
          blk.appendChild(await text(`${절.번호}.1. 견본`, "Title/Small", "fgColor/default", "Head"));
          const r = box("Sample Row", "HORIZONTAL", GAP_CELL, { align: "MIN" });
          blk.appendChild(r);
          const inst =
            node.type === "COMPONENT_SET"
              ? (node.defaultVariant ?? node.children[0]).createInstance()
              : node.createInstance();
          inst.name = 절.이름;
          r.appendChild(inst);
          인스턴스 += 1;
        }
      }
      fixW(doc, Math.max(DOC_W, Math.ceil(doc.width)));

      const dump = box(`${name} Variants`, "VERTICAL", 20);
      sheet.appendChild(dump);
      dump.appendChild(await text("Variants", "Caption", "fgColor/muted", "Caption"));
      for (const node of nodes) {
        if (!node) continue;
        if (node.type === "COMPONENT_SET") await dumpInto(dump, node);
        else dump.appendChild(node);
      }

      return {
        시트: name,
        부품: parts,
        차례,
        인스턴스,
        표,
        변형: nodes.reduce((a, n) => a + (n ? (n.type === "COMPONENT_SET" ? n.children.length : 1) : 0), 0),
        크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}`,
      };
    },

    /** 변형이 없는 컴포넌트의 시트 — 제목·코드 경로·견본뿐이다. */
    async plain(comp) {
      const sheetName = sheetNameOf(comp.name);
      const home = unwrap([comp], comp.name);
      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);
      const doc = box("Doc", "VERTICAL", GAP_AXIS);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      const N = meta()?.자리(comp.name) ? String(meta().자리(comp.name).번호) : null;
      head.appendChild(await text(N ? `${N}. ${comp.name}` : comp.name, "Title/Large", "fgColor/default", "Title"));
      if (comp.description) head.appendChild(await text(comp.description, "Caption", "fgColor/muted", "Source"));
      const 표 = await propTable(doc, comp.name);
      doc.appendChild(comp);
      const 인스턴스 = await blocks(doc, comp, {
        axisW: await measureAxes([comp]),
        prefix: N ? `${N}.` : "",
        층: "Title/Medium",
      });
      fixW(doc, Math.max(DOC_W, Math.ceil(doc.width)));
      return { 세트: comp.name, 인스턴스, 표, 변형: 0, 크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}` };
    },

    /**
     * **페이지 목차 한 장.** `# · name · 묶음 · 무엇` 네 칸으로 시트 전부를 적는다.
     *
     * 번호는 `meta.자리()` 가 내고 시트 제목의 `N` 과 같은 값이다 — 목차에서 28을 보고
     * `28. Menu` 를 찾아간다. 시트보다 **앞에** 놓는다.
     */
    async toc(pageName) {
      if (!Object.keys(S).length) await this.boot();
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      if (!page) throw new Error(`페이지 없음: ${pageName}`);
      const 묶음들 = meta()?.묶음?.[pageName];
      if (!묶음들) throw new Error(`묶음 없음: ${pageName}`);

      // **레이어 이름은 영어에 번호, 보이는 글은 한글이다.** 앞자리 `00` 이 시트 앞에 세운다.
      const 이름 = "00 Contents";
      const 옛것 = [`${pageName} 목차`, 이름];
      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      const home = sec ?? page;
      for (const 어디 of [page, home]) for (const c of [...어디.children]) if (옛것.includes(c.name)) c.remove();

      const frame = box(이름, "VERTICAL", GAP_LABEL, { fill: "bgColor/default", pad: PAD });
      home.appendChild(frame);
      frame.appendChild(await text(`${pageName} 목차`, "Title/Large", "fgColor/default", "Title"));

      const 줄들 = [];
      for (const [묶음이름, 이름들] of 묶음들)
        for (const n of 이름들) 줄들.push([String(meta().자리(n).번호), n, 묶음이름, meta().of(n)?.설명 ?? ""]);
      await table(frame, "Contents Table", ["#", "name", "묶음", "무엇"], 줄들, [T_NUM, T_NAME, T_GROUP, null], {
        폭: DOC_W + T_GROUP + T_GAP,
      });

      // 자리는 `layout()` 이 잡는다 — 여기서는 만들기만 한다.
      return { 목차: pageName, 줄: 줄들.length };
    },

    /**
     * **페이지를 통째로 되그린다.** `묶음` 차례대로 `부품` 이 있으면 `group()`, 없으면 `sheet()`.
     *
     * **플러그인은 한 번에 29초**라 한 호출에 한두 장이 한계다. `from`·`to` 로 잘라 부른다
     * (1부터 세는 닫힌 구간). 손으로 부품 목록을 넘기던 것이 없어져 되풀이가 된다.
     */
    async page(pageName, { from = 1, to = Infinity } = {}) {
      if (!Object.keys(S).length) await this.boot();
      const 묶음들 = meta()?.묶음?.[pageName];
      if (!묶음들) throw new Error(`묶음 없음: ${pageName}`);
      const 이름들 = 묶음들.flatMap(([, ns]) => ns).slice(from - 1, to);
      const 한것 = [];
      for (const n of 이름들) {
        const 부품 = meta().of(n)?.부품;
        한것.push(부품?.length ? await this.group(n) : await this.sheet(n));
      }
      return 한것;
    },

    /**
     * **페이지를 오토레이아웃으로 쌓는다.** 되그리기 뒤에 한 번 부른다.
     *
     * ```
     * Components [SECTION]
     *   Page [FRAME · VERTICAL AUTO]
     *     00 Contents
     *     01 Typography [FRAME · VERTICAL AUTO]  ← 묶음
     *       Title · 01 Text Spec · 02 Kbd Spec …
     * ```
     *
     * **묶음이 SECTION 이 아니라 FRAME 인 까닭** — Figma `SECTION` 에는 오토레이아웃을 못 건다.
     * 그래서 예전에는 묶음마다 y 를 손으로 계산했는데, 시트가 커지자 그대로 어긋나 옆 묶음을
     * 덮었다(2026-09-20 실측: `Activity Bar` 가 308px 삐져나와 `Sidebar` 와 겹쳤다). 프레임이면
     * 안이 커지는 만큼 바깥이 늘어 겹칠 수가 없다.
     *
     * `Components` SECTION 은 페이지의 바깥 테두리로만 남고 마지막에 `Page` 크기로 한 번 맞춘다.
     */
    async layout(pageName, { gap = 160, inner = 96, pad = 40 } = {}) {
      if (!Object.keys(S).length) await this.boot();
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      if (!page) throw new Error(`페이지 없음: ${pageName}`);
      const 묶음들 = meta()?.묶음?.[pageName];
      if (!묶음들) throw new Error(`묶음 없음: ${pageName}`);

      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      if (!sec) throw new Error(`Components 섹션 없음: ${pageName}`);

      // 시트와 목차를 먼저 다 찾아 둔다 — 옛 묶음(SECTION)을 지우기 전에 꺼내야 딸려 죽지 않는다.
      const 시트들 = new Map();
      let 목차 = null;
      for (const n of sec.findAll((x) => x.type === "FRAME")) {
        if (/Spec$/u.test(n.name)) 시트들.set(n.name.replace(/^\d+ /u, "").replace(/ Spec$/u, ""), n);
        else if (n.name === "00 Contents" || n.name === `${pageName} 목차`) 목차 = n;
      }

      let 판 = sec.children.find((c) => c.type === "FRAME" && c.name === "Page");
      if (!판) {
        판 = box("Page", "VERTICAL", gap, { pad });
        sec.appendChild(판);
      }
      판.itemSpacing = gap;
      판.paddingTop = 판.paddingBottom = 판.paddingLeft = 판.paddingRight = pad;
      판.fills = [];

      if (목차) 판.appendChild(목차);

      const 빠진것 = [];
      for (const [i, [묶음이름, 이름들]] of 묶음들.entries()) {
        const 이름 = `${두자리(i + 1)} ${묶음이름}`;
        let 묶음 = 판.children.find((c) => c.type === "FRAME" && c.name === 이름);
        if (!묶음) {
          묶음 = box(이름, "VERTICAL", inner);
          판.appendChild(묶음);
        }
        묶음.itemSpacing = inner;
        for (const c of [...묶음.children]) if (c.type === "TEXT" && c.name === "Title") c.remove();
        묶음.appendChild(await text(이름, "Title/Large", "fgColor/muted", "Title"));
        for (const n of 이름들) {
          const sh = 시트들.get(n);
          if (sh) 묶음.appendChild(sh);
          else 빠진것.push(n);
        }
        판.appendChild(묶음);
      }

      // 옛 묶음 SECTION 과 빈 `Sheets` 프레임을 걷는다 — 위에서 내용물을 다 꺼낸 뒤다.
      const 걷은것 = [];
      for (const c of [...sec.children]) {
        if (c === 판) continue;
        걷은것.push(`${c.name}(${c.type})`);
        c.remove();
      }

      판.x = 0;
      판.y = 0;
      sec.resizeWithoutConstraints(Math.ceil(판.width), Math.ceil(판.height));
      return {
        페이지: pageName,
        묶음: 판.children.map((c) => c.name),
        빠진것,
        걷은것,
        크기: `${Math.round(판.width)}x${Math.round(판.height)}`,
      };
    },

    /**
     * **페이지 한 장을 훑는다.** `async` 다 — 부르는 쪽이 `await` 를 빠뜨리면 풀리지 않은
     * Promise 가 빈 객체로 찍혀 "깨끗"처럼 보인다(2026-09-20 에 그렇게 겹침을 놓쳤다).
     *
     * **겹침은 좌표가 아니라 구조로 본다.** 좌표 비교는 이미 어긋난 뒤에야 알고, 예전 판은
     * 있지도 않은 `Sheets` 프레임 하나를 전제해 시트 목록이 빈 채로 0 을 돌려줬다. 시트가
     * 오토레이아웃 프레임의 자식이면 겹칠 수가 없으므로 **그 자리에 있는지**만 본다.
     */
    async audit(pageName) {
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      if (!sec) throw new Error(`Components 섹션 없음: ${pageName}`);

      let inst = 0,
        끊김 = 0;
      for (const n of sec.findAll((x) => x.type === "INSTANCE")) {
        inst += 1;
        if (!(await n.getMainComponentAsync())) 끊김 += 1;
      }

      const sh = sec.findAll((c) => c.type === "FRAME" && /Spec$/u.test(c.name));
      const 이름틀린시트 = [];
      for (const c of sh) {
        const 세트 = c.name.replace(/^\d+ /u, "").replace(/ Spec$/u, "");
        const 자리 = meta()?.자리(세트);
        const 바람 = 자리 ? `${두자리(자리.번호)} ${세트} Spec` : `${세트} Spec`;
        if (c.name !== 바람) 이름틀린시트.push(`${c.name} ≠ ${바람}`);
      }
      // 오토레이아웃 밖에 있으면 손으로 놓인 것이라 언제든 겹친다.
      const 흐름밖시트 = sh
        .filter((c) => !(c.parent?.layoutMode && c.parent.layoutMode !== "NONE"))
        .map((c) => `${c.name} ← ${c.parent?.name ?? "?"}`);
      const 판 = sec.children.find((c) => c.type === "FRAME" && c.name === "Page");

      return {
        시트: sh.length,
        세트: sec.findAll((n) => n.type === "COMPONENT_SET").length,
        인스턴스: inst,
        끊긴인스턴스: 끊김,
        흐름밖시트,
        이름틀린시트,
        섹션이판보다큰가: 판 ? Math.round(sec.height - 판.height) : "Page 없음",
        고정폭글자: sec.findAll((n) => n.type === "TEXT" && n.textAutoResize === "NONE").length,
        스타일없는글자: sec.findAll((n) => n.type === "TEXT" && !n.textStyleId).length,
        루트에뜬것: page.children.filter((c) => c.type !== "SECTION" && c.type !== "FRAME").map((c) => c.name),
      };
    },
  };
})();
