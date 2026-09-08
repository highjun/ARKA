import { z } from "zod";
import { RunId, RunMode, RunStatus, SessionId } from "./types";

/**
 * 이벤트 로그 — 세션 안에서 일어난 모든 일의 원본. → docs/adr/0019-agent-domain.md
 *
 * 진화 규칙: 필드를 지우거나 뜻을 바꾸지 않는다. 바꾸려면 새 `type`을 추가하고 옛 것은 읽기만
 * 남긴다. 클라이언트는 모르는 `type`의 프레임을 버린다.
 *
 * `delta` 이벤트는 스트리밍 조각이다. 같은 대상(`messageId`·`callId`)의 조각을 이어 붙이면 전체가
 * 된다. `done`이 오기 전까지는 미완이다.
 */

/** 모든 이벤트가 공유하는 머리. `seq`는 세션 안에서 1부터 단조 증가한다. */
const Head = z.object({
  seq: z.number().int().positive(),
  sessionId: SessionId,
  /** Run 밖에서 생기는 이벤트(세션 제목 변경 등)는 `null`. */
  runId: RunId.nullable(),
  /** ms since epoch. */
  at: z.number().int().nonnegative(),
});

export const RunStartedEvent = Head.extend({
  type: z.literal("run.started"),
  runId: RunId,
  mode: RunMode,
  /** 사용자가 보낸 입력 원문. `message.user`가 아니라 여기 있는 이유는 Run의 시작 원인이기 때문이다. */
  input: z.string(),
});

export const RunFinishedEvent = Head.extend({
  type: z.literal("run.finished"),
  runId: RunId,
  status: RunStatus.exclude(["queued", "running", "waitingInput"]),
});

export const AssistantDeltaEvent = Head.extend({
  type: z.literal("assistant.delta"),
  runId: RunId,
  messageId: z.string().min(1),
  text: z.string(),
});

export const AssistantDoneEvent = Head.extend({
  type: z.literal("assistant.done"),
  runId: RunId,
  messageId: z.string().min(1),
});

export const ThinkingDeltaEvent = Head.extend({
  type: z.literal("thinking.delta"),
  runId: RunId,
  /** 한 Run 안에 생각 블록이 여럿일 수 있다. */
  blockId: z.string().min(1),
  text: z.string(),
});

export const ThinkingDoneEvent = Head.extend({
  type: z.literal("thinking.done"),
  runId: RunId,
  blockId: z.string().min(1),
});

export const ToolCallEvent = Head.extend({
  type: z.literal("tool.call"),
  runId: RunId,
  callId: z.string().min(1),
  toolId: z.string().min(1),
  /** 툴마다 모양이 다르다 — 화면은 JSON으로 그린다. */
  input: z.unknown(),
});

export const ToolResultEvent = Head.extend({
  type: z.literal("tool.result"),
  runId: RunId,
  callId: z.string().min(1),
  output: z.unknown(),
  isError: z.boolean(),
});

export const InputRequestedEvent = Head.extend({
  type: z.literal("input.requested"),
  runId: RunId,
  requestId: z.string().min(1),
  prompt: z.string(),
});

export const InputProvidedEvent = Head.extend({
  type: z.literal("input.provided"),
  runId: RunId,
  requestId: z.string().min(1),
  text: z.string(),
});

export const RunErrorEvent = Head.extend({
  type: z.literal("run.error"),
  runId: RunId,
  message: z.string(),
});

export const SessionRenamedEvent = Head.extend({
  type: z.literal("session.renamed"),
  title: z.string(),
});

export const SessionArchivedEvent = Head.extend({
  type: z.literal("session.archived"),
  archived: z.boolean(),
});

export const AgentEvent = z.discriminatedUnion("type", [
  RunStartedEvent,
  RunFinishedEvent,
  AssistantDeltaEvent,
  AssistantDoneEvent,
  ThinkingDeltaEvent,
  ThinkingDoneEvent,
  ToolCallEvent,
  ToolResultEvent,
  InputRequestedEvent,
  InputProvidedEvent,
  RunErrorEvent,
  SessionRenamedEvent,
  SessionArchivedEvent,
]);
export type AgentEvent = z.infer<typeof AgentEvent>;
export type AgentEventType = AgentEvent["type"];

/**
 * 저장되기 전의 이벤트 — `seq`와 `at`은 저장소가 붙인다. 실행기가 만드는 것은 이 모양이다.
 */
export type AgentEventInput = AgentEvent extends infer E
  ? E extends { seq: number; at: number }
    ? Omit<E, "seq" | "at">
    : never
  : never;
