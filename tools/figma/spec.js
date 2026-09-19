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
  const blocks = async (into, node, { defaults = null, axisW = 0, metaName = null } = {}) => {
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

    let made = 0;
    for (const [제목, 줄들, 갈래보임] of [
      ["Props", props, true],
      ["CSS-State", css, false],
    ]) {
      if (!줄들.length) continue;
      const blk = box(제목, "VERTICAL", GAP_AXIS);
      into.appendChild(blk);
      blk.appendChild(await text(제목, "Title/Small", "fgColor/default", "Head"));
      for (const r of 줄들) made += await row(blk, r.key, 갈래보임 ? r.갈래 : null, r.칸, axisW);
    }
    return made;
  };

  const T_NAME = 180,
    T_TYPE = 96,
    T_GAP = 16;

  /**
   * 설명 아래의 **prop 표** — `name · type · description` 세 칸.
   *
   * 견본 블록은 Figma 가 그릴 수 있는 것만 보여 준다. `onClick`·`items`·`content` 처럼
   * 보이는 모양이 없는 prop 은 **여기에만** 선다. 인터페이스 전체를 한자리에서 보려는 표다.
   */
  const propTable = async (into, setName) => {
    const rows = meta()?.rows(setName) ?? [];
    if (!rows.length) return 0;

    const tbl = box("Props 표", "VERTICAL", 0);
    into.appendChild(tbl);

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
      for (const [i, c] of cells.entries()) made.push(await text(c, style, color, ["Name", "Type", "Desc"][i]));
      for (const t of made) r.appendChild(t);
      return made;
    };

    const 칸들 = [await line(["name", "type", "description"], "Caption", "fgColor/muted", true)];
    for (const r of rows) 칸들.push(await line([r.name, r.type, r.desc], "Body/Small", "fgColor/default", false));

    // **폭을 먼저 못 박아야 FILL 이 먹는다.** 그리고 `layoutGrow` 대신 `FILL` 을 쓴다 —
    // `layoutGrow = 1` 은 글자의 `textAutoResize` 를 `NONE` 으로 바꿔 긴 설명을 잘라 먹는다.
    fixW(tbl, DOC_W);
    for (const [n, t, d] of 칸들) {
      n.parent.layoutSizingHorizontal = "FILL";
      fixW(n, T_NAME);
      fixW(t, T_TYPE);
      d.layoutSizingHorizontal = "FILL";
      d.textAutoResize = "HEIGHT";
    }
    return rows.length;
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

  /**
   * 노드를 품고 있는 옛 시트를 조상에서 찾아 노드를 꺼내고 지운다.
   * 안 그러면 다시 돌릴 때 시트가 시트 안에 겹쳐 쌓인다.
   */
  const unwrap = (nodes, sheetName) => {
    let home = null;
    for (const n of nodes) {
      let up = n.parent,
        oldSheet = null;
      while (up && up.type !== "PAGE" && up.type !== "SECTION") {
        if (up.name === sheetName) oldSheet = up;
        up = up.parent;
      }
      home = home ?? (oldSheet ? oldSheet.parent : n.parent);
      home.appendChild(n);
    }
    for (const c of [...home.children]) if (!nodes.includes(c) && c.name === sheetName) c.remove();
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
      const sheetName = `${setName} Spec`;
      const home = unwrap([set], sheetName);

      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);

      const doc = box("Doc", "VERTICAL", GAP_AXIS);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      head.appendChild(await text(setName, "Title/Large", "fgColor/default", "Title"));
      if (set.description) head.appendChild(await text(set.description, "Caption", "fgColor/muted", "Source"));

      const 표 = await propTable(doc, setName);
      const axisW = await measureAxes([set]);
      const 인스턴스 = await blocks(doc, set, { defaults, axisW });
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
     * **컴파운드 한 장.** 부품 여럿을 한 시트에 블록으로 쌓고, 덤프도 한 칸에 모은다.
     * `parts` 는 `["Menu/Content", "Menu/Item", …]` 처럼 세트·컴포넌트 이름이다.
     */
    async group(name, parts, { defaults = null, source = null } = {}) {
      if (!Object.keys(S).length) await this.boot();
      // **`가상: true` 인 부품은 Figma 노드가 없다** — 표만 세우고 견본은 건너뛴다.
      // (`Menu/Trigger`·`NavList/Group` 처럼 코드에만 있는 부품이 시트에서 사라지지 않게.)
      const nodes = parts.map((p) => findNode(p));
      const sheetName = `${name} Spec`;
      const home = unwrap(nodes.filter(Boolean), sheetName);
      // 부품이 저마다 제 시트를 갖고 있었다면 그것도 걷는다.
      for (const p of parts) for (const c of [...home.children]) if (c.name === `${p} Spec`) c.remove();

      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);

      const doc = box("Doc", "VERTICAL", GAP_PART);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      head.appendChild(await text(name, "Title/Large", "fgColor/default", "Title"));
      const src = source ?? nodes.find((n) => n?.description)?.description;
      if (src) head.appendChild(await text(src, "Caption", "fgColor/muted", "Source"));

      const axisW = await measureAxes(nodes.filter(Boolean));
      // 묶음 이름이 부품 이름과 같으면(`TitleBar` 묶음의 첫 부품이 `TitleBar`) 머리 표를
      // 생략한다 — 안 그러면 같은 표가 두 번 뜬다.
      let 인스턴스 = 0,
        표 = parts.includes(name) ? 0 : await propTable(doc, name);
      for (const [i, node] of nodes.entries()) {
        const short = parts[i].includes("/") ? parts[i].split("/").slice(1).join("/") : parts[i];
        const block = box(`Part/${short}`, "VERTICAL", GAP_AXIS);
        doc.appendChild(block);
        block.appendChild(await text(short, "Title/Small", "fgColor/default", "Part"));
        표 += await propTable(block, parts[i]);
        if (!node) continue; // 가상 부품 — 표까지만
        const n = await blocks(block, node, { defaults: defaults?.[parts[i]] ?? null, axisW, metaName: parts[i] });
        인스턴스 += n;
        // 축도 속성도 없는 부품 — 견본 하나로 족하다.
        if (!n) {
          const r = box("Sample", "HORIZONTAL", GAP_CELL, { align: "MIN" });
          block.appendChild(r);
          const inst =
            node.type === "COMPONENT_SET"
              ? (node.defaultVariant ?? node.children[0]).createInstance()
              : node.createInstance();
          inst.name = short;
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
        인스턴스,
        표,
        변형: nodes.reduce((a, n) => a + (n ? (n.type === "COMPONENT_SET" ? n.children.length : 1) : 0), 0),
        크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}`,
      };
    },

    /** 변형이 없는 컴포넌트의 시트 — 제목·코드 경로·견본뿐이다. */
    async plain(comp) {
      const sheetName = `${comp.name} Spec`;
      const home = unwrap([comp], sheetName);
      const sheet = box(sheetName, "HORIZONTAL", GAP_COL, { align: "MIN", fill: "bgColor/default", pad: PAD });
      home.appendChild(sheet);
      const doc = box("Doc", "VERTICAL", GAP_AXIS);
      sheet.appendChild(doc);
      const head = box("Head", "VERTICAL", 6);
      doc.appendChild(head);
      head.appendChild(await text(comp.name, "Title/Large", "fgColor/default", "Title"));
      if (comp.description) head.appendChild(await text(comp.description, "Caption", "fgColor/muted", "Source"));
      const 표 = await propTable(doc, comp.name);
      doc.appendChild(comp);
      const 인스턴스 = await blocks(doc, comp, { axisW: await measureAxes([comp]) });
      fixW(doc, Math.max(DOC_W, Math.ceil(doc.width)));
      return { 세트: comp.name, 인스턴스, 표, 변형: 0, 크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}` };
    },

    /**
     * 시트를 세로로 쌓는다 — 아래로 내리며 읽는다.
     *
     * **간격은 오토레이아웃이 잡는다.** 좌표로 놓으면 시트 하나 높이가 바뀔 때마다 아래가 다 어긋난다.
     * Figma **`SECTION` 은 오토레이아웃을 못 걸므로**, 섹션 안에 세로 오토레이아웃 프레임
     * `Sheets` 를 하나 두고 그 안에 담는다. 섹션은 그 프레임 크기에 맞춰 한 번 늘린다.
     */
    async stack(pageName, order, { gap = 96, pad = 40 } = {}) {
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      if (!sec) throw new Error(`Components 섹션 없음: ${pageName}`);

      let sheets = sec.children.find((c) => c.type === "FRAME" && c.name === "Sheets");
      if (!sheets) {
        sheets = box("Sheets", "VERTICAL", gap, { pad });
        sec.appendChild(sheets);
      }
      sheets.itemSpacing = gap;
      sheets.paddingTop = sheets.paddingBottom = sheets.paddingLeft = sheets.paddingRight = pad;

      const all = [...sec.children, ...sheets.children].filter((c) => /Spec$/.test(c.name));
      const list = order
        ? order.map((n) => all.find((c) => c.name === `${n} Spec`)).filter(Boolean)
        : all.slice().sort((a, b) => a.y - b.y);
      // `appendChild` 는 맨 뒤에 붙는다 — 원하는 차례대로 부르면 그 차례가 된다.
      for (const sh of list) sheets.appendChild(sh);

      sheets.x = 0;
      sheets.y = 0;
      sec.resizeWithoutConstraints(Math.ceil(sheets.width), Math.ceil(sheets.height));
      // 보드는 섹션 오른쪽으로 민다.
      let bx = sec.x + sec.width + 400;
      for (const f of page.children)
        if (f.type === "FRAME") {
          f.x = bx;
          f.y = 0;
          bx += f.width + 400;
        }

      return {
        시트: list.map((sh) => sh.name.replace(" Spec", "")),
        빠진것: [...sec.children, ...sheets.children]
          .filter((c) => /Spec$/.test(c.name) && !list.includes(c))
          .map((c) => c.name),
        남은것: sec.children.filter((c) => c !== sheets).map((c) => `${c.name}(${c.type})`),
        섹션: `${Math.round(sec.width)}x${Math.round(sec.height)}`,
      };
    },

    async audit(pageName) {
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      let inst = 0,
        끊김 = 0;
      for (const n of sec.findAll((x) => x.type === "INSTANCE")) {
        inst += 1;
        if (!(await n.getMainComponentAsync())) 끊김 += 1;
      }
      const sheets = sec.children.find((c) => c.type === "FRAME" && c.name === "Sheets");
      const sh = (sheets ?? sec).children.filter((c) => /Spec$/.test(c.name)).sort((a, b) => a.y - b.y);
      const 겹침 = [];
      for (let i = 1; i < sh.length; i += 1)
        if (sh[i].y < sh[i - 1].y + sh[i - 1].height) 겹침.push(`${sh[i - 1].name}↔${sh[i].name}`);
      return {
        시트: sh.map((c) => c.name.replace(" Spec", "")),
        세트: sec.findAll((n) => n.type === "COMPONENT_SET").map((n) => n.name),
        인스턴스: inst,
        끊긴인스턴스: 끊김,
        겹침,
        고정폭글자: sec.findAll((n) => n.type === "TEXT" && n.textAutoResize === "NONE").length,
        스타일없는글자: sec.findAll((n) => n.type === "TEXT" && !n.textStyleId).length,
        루트에뜬것: page.children.filter((c) => c.type !== "SECTION" && c.type !== "FRAME").map((c) => c.name),
      };
    },
  };
})();
