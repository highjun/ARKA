import { MockServerInfo } from "./MockServerInfo";
import { testServerInfoContract } from "./serverInfo.contract";

testServerInfoContract("MockServerInfo", {
  answering: (sample) => new MockServerInfo(sample),
  silent: () => new MockServerInfo(null),
});
