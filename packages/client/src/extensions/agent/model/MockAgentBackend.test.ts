import { testAgentApiContract } from "./agentApi.contract";
import { MockAgentBackend } from "./MockAgentBackend";

testAgentApiContract(
  "MockAgentBackend",
  () =>
    new MockAgentBackend({
      script: (input, mode, { next }) => {
        const message = next();
        return [
          ...(input.includes("?") ? [{ type: "input.requested" as const, requestId: next(), prompt: "이름은?" }] : []),
          { type: "assistant.delta", messageId: message, text: mode === "plan" ? "계획: " : "받은 입력: " },
          { type: "assistant.delta", messageId: message, text: input },
          { type: "assistant.done", messageId: message },
        ];
      },
    }),
);
