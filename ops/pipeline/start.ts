import path from "node:path";
import output from "../output.json" with { type: "json" };
import { REPO_ROOT, step } from "./run.ts";

/**
 * 빌드된 것을 띄운다 — 컨테이너 밖에서 배포와 같은 모양을 흉내내는 자리다.
 *
 * 서버가 클라이언트 정적 파일까지 서빙한다. 한 오리진으로 묶여야 클라이언트의 `/api/*`
 * 상대경로가 통한다. 이미지 안에서는 이 값이 `/app/dist/client`다 — 숨김 여부는 저장소에서만
 * 뜻이 있어 런타임 이미지에는 점 폴더를 두지 않는다(`ops/deploy/Dockerfile`).
 */
process.env["ADE_CLIENT_ROOT"] = path.join(REPO_ROOT, output.clientDir);
step("node", path.join(REPO_ROOT, output.serverEntry));
