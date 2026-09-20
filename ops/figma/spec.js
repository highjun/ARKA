globalThis.__arka = globalThis.__arka ?? {};

globalThis.__arka.spec = (() => {
  const DOC_W = 760;
  const DUMP_W = 880;
  const PAD = 40;
  const GAP_COL = 96;
  const GAP_AXIS = 36;
  const GAP_PART = 52;
  const GAP_CELL = 40;
  const GAP_LABEL = 8;

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

  const parse = (s) => Object.fromEntries(s.split(",").map((p) => p.trim().split("=")));

  const values = (defs, axis, items) => {
    const used = new Set(items.map((i) => i.props[axis]));
    return defs[axis].variantOptions.filter((v) => used.has(v));
  };

  const pick = (items, defs, names, axis, value, defaults) => {
    const want = (b) => defaults?.[b] ?? defs[b].defaultValue;
    const cand = items.filter((i) => i.props[axis] === value);
    const score = (i) => names.reduce((n, b) => n + (b !== axis && i.props[b] === want(b) ? 1 : 0), 0);
    return cand.sort((a, b) => score(b) - score(a))[0];
  };

  const fixW = (node, w) => {
    node.resize(w, node.height);
    node.layoutSizingHorizontal = "FIXED";
    node.layoutSizingVertical = "HUG";
  };

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

  const shortKey = (k) => k.split("#")[0];

  const TYPE_WORD = { BOOLEAN: "boolean", INSTANCE_SWAP: "slot", TEXT: "string" };

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

    const 축칸 = (a) =>
      values(defs, a, items)
        .map((v) => {
          const it = pick(items, defs, axes, a, v, defaults);
          return it ? { label: v, node: it.node.createInstance() } : null;
        })
        .filter(Boolean);

    const 속성칸 = async (k) => {
      const d = defs[k];
      if (d.type === "BOOLEAN") {
        return [false, true].map((v) => {
          const i = base.createInstance();
          try {
            i.setProperties({ [k]: v });
          } catch {}
          return { label: String(v), node: i };
        });
      }
      const i = base.createInstance();
      if (d.type === "INSTANCE_SWAP") {
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
      blk.appendChild(await text(`${prefix}${차}. ${제목}`, 층, "fgColor/default", "Head"));
      for (const r of 줄들) made += await row(blk, r.key, 갈래보임 ? r.갈래 : null, r.칸, axisW);
    }
    return made;
  };

  const T_NUM = 56,
    T_LEVEL = 48,
    T_GROUP = 120,
    T_NAME = 180,
    T_TYPE = 96,
    T_GAP = 16;

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

  const partIndex = async (into, 절들, 번호) => {
    const blk = box("Parts", "VERTICAL", GAP_LABEL);
    into.appendChild(blk);
    blk.appendChild(await text(`${번호} 부품 목록`, "Title/Medium", "fgColor/default", "Head"));
    const 계층있나 = 절들.some((절) => 절.계층);
    return await table(
      blk,
      "Parts Table",
      계층있나 ? ["#", "계층", "name", "무엇"] : ["#", "name", "무엇"],
      절들.map((절) => (계층있나 ? [절.번호, 절.계층 ?? "", 절.이름, 절.무엇] : [절.번호, 절.이름, 절.무엇])),
      계층있나 ? [T_NUM, T_LEVEL, T_NAME, null] : [T_NUM, T_NAME, null],
    );
  };

  const fitDoc = (doc) => fixW(doc, Math.max(DOC_W, ...doc.children.map((c) => Math.ceil(c.width))));

  const putInDump = (dump, node) => {
    dump.appendChild(node);
    if (node.layoutSizingHorizontal === "FILL") node.layoutSizingHorizontal = "FIXED";
  };

  const dumpInto = async (dump, set) => {
    set.layoutMode = "HORIZONTAL";
    set.layoutWrap = "WRAP";
    set.itemSpacing = 20;
    set.counterAxisSpacing = 20;
    set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 20;
    set.counterAxisAlignItems = "CENTER";
    set.fills = [];
    set.strokes = solid("borderColor/muted");
    set.strokeWeight = 1;
    set.clipsContent = false;
    dump.appendChild(set);
    set.resize(DUMP_W, set.height);
    set.layoutSizingHorizontal = "FIXED";
    set.layoutSizingVertical = "HUG";
  };

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

  const 두자리 = (n) => String(n).padStart(2, "0");

  const sheetNameOf = (name) => {
    const 자리 = meta()?.자리(name);
    return 자리 ? `${두자리(자리.번호)} ${name} Spec` : `${name} Spec`;
  };
  const isSheetOf = (nodeName, name) => new RegExp(`^(?:\\d+ )?${name} Spec$`, "u").test(nodeName);

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
      const 인스턴스 = await blocks(doc, set, { defaults, axisW, prefix: N ? `${N}.` : "", 층: "Title/Medium" });
      const dump = box(`${setName} Variants`, "VERTICAL", 12);
      sheet.appendChild(dump);
      dump.appendChild(await text("Variants", "Caption", "fgColor/muted", "Caption"));
      await dumpInto(dump, set);
      fitDoc(doc);

      return {
        세트: setName,
        인스턴스,
        표,
        변형: set.children.length,
        크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}`,
      };
    },

    async group(name, parts = meta()?.of(name)?.부품 ?? [], { defaults = null, source = null } = {}) {
      if (!Object.keys(S).length) await this.boot();
      if (parts[0] !== `${name}/Root`) throw new Error(`부품 첫 줄이 ${name}/Root 가 아니다: ${parts[0]}`);
      const 이름들 = parts;
      const nodes = 이름들.map((p) => findNode(p));
      const sheetName = sheetNameOf(name);
      const home = unwrap(nodes.filter(Boolean), name);
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
      const src = source ?? meta()?.of(name)?.설명 ?? nodes.find((n) => n?.description)?.description;
      if (src) head.appendChild(await text(src, "Caption", "fgColor/muted", "Source"));

      const axisW = await measureAxes(nodes.filter(Boolean));
      const 짧게 = (full) => (full.includes("/") ? full.split("/").slice(1).join("/") : full);
      const 계층 = meta()?.of(name)?.계층 ?? {};
      const 절들 = 이름들.map((full, i) => ({
        번호: N ? `${N}.${String(i + 2)}` : String(i + 1),
        계층: 계층[full] ?? "",
        이름: 짧게(full),
        무엇: meta()?.of(full)?.설명 ?? "",
        full,
      }));
      const 차례 = await partIndex(doc, 절들, N ? `${N}.1.` : "1.");

      let 인스턴스 = 0,
        표 = 0;
      for (const [i, node] of nodes.entries()) {
        const 절 = 절들[i];
        const block = box(`Part/${절.이름}`, "VERTICAL", GAP_AXIS);
        doc.appendChild(block);
        const 머리 = box("Head", "VERTICAL", 6);
        block.appendChild(머리);
        머리.appendChild(await text(`${절.번호}. ${절.이름}`, "Title/Medium", "fgColor/default", "Part"));
        if (절.무엇) 머리.appendChild(await text(절.무엇, "Caption", "fgColor/muted", "PartDesc"));
        표 += await propTable(block, 절.full);
        if (!node) continue;
        const n = await blocks(block, node, {
          defaults: defaults?.[절.full] ?? null,
          axisW,
          metaName: 절.full,
          prefix: `${절.번호}.`,
        });
        인스턴스 += n;
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
          if (inst.layoutSizingHorizontal === "FILL") inst.layoutSizingHorizontal = "FIXED";
          인스턴스 += 1;
        }
      }
      const dump = box(`${name} Variants`, "VERTICAL", 20);
      sheet.appendChild(dump);
      dump.appendChild(await text("Variants", "Caption", "fgColor/muted", "Caption"));
      for (const node of nodes) {
        if (!node) continue;
        if (node.type === "COMPONENT_SET") await dumpInto(dump, node);
        else putInDump(dump, node);
      }
      fitDoc(doc);

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
      fitDoc(doc);
      return { 세트: comp.name, 인스턴스, 표, 변형: 0, 크기: `${Math.round(sheet.width)}x${Math.round(sheet.height)}` };
    },

    async toc(pageName) {
      if (!Object.keys(S).length) await this.boot();
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      if (!page) throw new Error(`페이지 없음: ${pageName}`);
      const 묶음들 = meta()?.묶음?.[pageName];
      if (!묶음들) throw new Error(`묶음 없음: ${pageName}`);

      const 이름 = "00 Contents";
      const 옛것 = new Set([`${pageName} 목차`, 이름]);
      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      const home = sec ?? page;
      for (const c of [...page.findAll((n) => 옛것.has(n.name)), ...page.children.filter((n) => 옛것.has(n.name))])
        c.remove();

      const frame = box(이름, "VERTICAL", GAP_LABEL, { fill: "bgColor/default", pad: PAD });
      home.appendChild(frame);
      frame.appendChild(await text(`${pageName} 목차`, "Title/Large", "fgColor/default", "Title"));

      const 줄들 = [];
      for (const [묶음이름, 이름들] of 묶음들)
        for (const n of 이름들) 줄들.push([String(meta().자리(n).번호), n, 묶음이름, meta().of(n)?.설명 ?? ""]);
      await table(frame, "Contents Table", ["#", "name", "묶음", "무엇"], 줄들, [T_NUM, T_NAME, T_GROUP, null], {
        폭: DOC_W + T_GROUP + T_GAP,
      });

      return { 목차: pageName, 줄: 줄들.length };
    },

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

    async layout(pageName, { gap = 160, inner = 96, pad = 40 } = {}) {
      if (!Object.keys(S).length) await this.boot();
      await figma.loadAllPagesAsync();
      const page = figma.root.children.find((p) => p.name === pageName);
      if (!page) throw new Error(`페이지 없음: ${pageName}`);
      const 묶음들 = meta()?.묶음?.[pageName];
      if (!묶음들) throw new Error(`묶음 없음: ${pageName}`);

      const sec = page.children.find((c) => c.type === "SECTION" && c.name === "Components");
      if (!sec) throw new Error(`Components 섹션 없음: ${pageName}`);

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
          if (!sh) {
            빠진것.push(n);
            continue;
          }
          sh.name = sheetNameOf(n);
          묶음.appendChild(sh);
        }
        판.appendChild(묶음);
      }
      for (const c of [...판.children]) {
        if (c === 목차 || !/^\d\d /u.test(c.name)) continue;
        if (!c.findOne((x) => x.type === "FRAME" && /Spec$/u.test(x.name))) c.remove();
      }

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
      const 흐름밖시트 = sh
        .filter((c) => !(c.parent?.layoutMode && c.parent.layoutMode !== "NONE"))
        .map((c) => `${c.name} ← ${c.parent?.name ?? "?"}`);
      const 판 = sec.children.find((c) => c.type === "FRAME" && c.name === "Page");

      const 부푼시트 = [];
      for (const c of sh) {
        const doc = c.children.find((x) => x.name === "Doc");
        if (!doc?.children.length) continue;
        const 최대 = Math.max(DOC_W, ...doc.children.map((x) => Math.ceil(x.width)));
        if (Math.round(doc.width) > 최대) 부푼시트.push(`${c.name} ${Math.round(doc.width)} > ${최대}`);
      }

      return {
        시트: sh.length,
        세트: sec.findAll((n) => n.type === "COMPONENT_SET").length,
        인스턴스: inst,
        끊긴인스턴스: 끊김,
        흐름밖시트,
        이름틀린시트,
        부푼시트,
        섹션이판보다큰가: 판 ? Math.round(sec.height - 판.height) : "Page 없음",
        고정폭글자: sec.findAll((n) => n.type === "TEXT" && n.textAutoResize === "NONE").length,
        스타일없는글자: sec.findAll((n) => n.type === "TEXT" && !n.textStyleId).length,
        루트에뜬것: page.children.filter((c) => c.type !== "SECTION" && c.type !== "FRAME").map((c) => c.name),
      };
    },
  };
})();
