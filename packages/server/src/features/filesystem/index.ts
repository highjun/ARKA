// 조립하는 쪽이 실제로 부르는 것만 내보낸다. readFile·FileError·경로 규칙은
// 이 feature 안의 구현 세부라, 밖에서 쓰이기 시작하면 경계가 흐려진다.
export { createFsRoutes } from "./transport/fsRoutes";
