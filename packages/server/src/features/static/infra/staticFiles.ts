import path from "node:path";
import fs from "node:fs";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export const contentTypeFor = (filePath: string): string =>
  CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

export const cacheControlFor = (relativePath: string): string =>
  relativePath.startsWith("assets") ? "public, max-age=31536000, immutable" : "no-store";

export const resolveWithin = (root: string, url: string): string | undefined => {
  const rawPath = url.split("?")[0] ?? "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;

  const normalized = path.posix.normalize(decoded.startsWith("/") ? decoded : `/${decoded}`);
  const resolved = path.resolve(root, `.${normalized}`);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return undefined;
  return resolved;
};

export type StaticFile = { readonly filePath: string; readonly relativePath: string };

const onDisk = (candidate: string): boolean => fs.existsSync(candidate) && fs.statSync(candidate).isFile();

export const pickFile = (
  root: string,
  url: string,
  exists: (candidate: string) => boolean = onDisk,
): StaticFile | undefined => {
  const resolved = resolveWithin(root, url);
  if (resolved === undefined) return undefined;

  if (exists(resolved)) return { filePath: resolved, relativePath: path.relative(root, resolved) };
  if (path.extname(resolved) !== "") return undefined;

  const indexPath = path.join(root, "index.html");
  return exists(indexPath) ? { filePath: indexPath, relativePath: "index.html" } : undefined;
};

export const KILL_SWITCH_SW = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;
