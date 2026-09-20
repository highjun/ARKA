import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, "..", "..", ".output", "figma");

const PORT = Number(process.argv[2] ?? 9230);
const MOUNTS = [
  { prefix: "/tool/", root: HERE },
  { prefix: "/", root: OUT },
];

const server = createServer(async (req, res) => {
  const head = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,OPTIONS",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, head).end();
    return;
  }
  const name = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (name === "/health") {
    res.writeHead(200, { ...head, "content-type": "application/json" }).end('{"ok":true}');
    return;
  }

  const mount = MOUNTS.find((m) => name.startsWith(m.prefix));
  const file = path.join(mount.root, name.slice(mount.prefix.length - 1));
  if (!file.startsWith(mount.root)) {
    res.writeHead(403, head).end();
    return;
  }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error("파일이 아니다");
    res.writeHead(200, { ...head, "content-type": "application/json", "content-length": s.size });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, head).end();
  }
});
server.listen(PORT, "127.0.0.1", () => {
  for (const m of MOUNTS) console.log(`${m.prefix} → ${m.root}`);
  console.log(`http://127.0.0.1:${PORT}`);
});
