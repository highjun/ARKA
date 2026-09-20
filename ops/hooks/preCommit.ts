import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

export const VERSION = "8.30.1";

export const versionComplaint = (found: string | null): string | null => {
  if (found === null) return `gitleaks가 없습니다.`;
  if (found.trim() !== VERSION) return `gitleaks ${found.trim()}이 깔려 있습니다(필요한 판: ${VERSION}).`;
  return null;
};

const installed = (): string | null => {
  const { status, stdout } = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
  return status === 0 ? stdout : null;
};

if (process.argv[1] === import.meta.filename) {
  const complaint = versionComplaint(installed());
  if (complaint !== null) {
    console.error(`
[비밀] ${complaint}

CI가 쓰는 판과 같아야 합니다. 한 줄로 깝니다.

  curl -fsSL https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_x64.tar.gz | tar -xz -C ~/.local/bin gitleaks
`);
    process.exit(1);
  }

  const { status } = spawnSync(
    "gitleaks",
    ["git", "--staged", "--gitleaks-ignore-path", "ops/.gitleaksignore", "--redact", "--no-banner"],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );

  if (status !== 0) {
    console.error(`
[비밀] 커밋을 세웠습니다. 위에 찍힌 자리를 비우고 다시 하세요.

커밋 뒤에 발견하면 이력을 다시 써야 합니다 — 그 전에 막는 것이 이 훅입니다.
정말 비밀이 아니면 지문을 \`ops/.gitleaksignore\`에 적습니다.
`);
    process.exit(status ?? 1);
  }
}
