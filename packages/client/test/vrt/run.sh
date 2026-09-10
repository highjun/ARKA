#!/usr/bin/env bash
# 스토리를 순회해 이전과 같은 그림인지 본다. 인자는 playwright로 그대로 넘어간다
# (`--update-snapshots`).
#
# **Docker에서만 돈다.** 폰트 렌더링과 서브픽셀이 기계마다 달라, 호스트에서 만든 기준 이미지는
# 다른 기계에서 무조건 깨진다 — 고정하지 않으면 기준이 아니라 소음이 된다.
#
# 마운트는 이 패키지가 아니라 **저장소 루트**다. pnpm이 `node_modules/@playwright/test`를 루트의
# `.pnpm` 저장소로 심볼릭 링크하므로, 패키지만 마운트하면 컨테이너 안에서 끊어진 링크가 된다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
IMAGE="mcr.microsoft.com/playwright:v1.63.0-noble"

pnpm --filter client run build:storybook
# 바이너리는 이 패키지의 것이다(`@playwright/test`는 client의 devDependency), 작업 디렉터리는
# 저장소 루트다(심볼릭 링크가 루트의 `.pnpm` 저장소를 가리킨다).
docker run --rm --user "$(id -u):$(id -g)" -v "$ROOT":/work -w /work -e HOME=/tmp "$IMAGE" \
  packages/client/node_modules/.bin/playwright test -c packages/client/test/vrt/vrt.config.ts "$@"
