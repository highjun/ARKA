/**
 * Registry 에 등록되는 대상이 공통으로 가져야 하는 최소 계약.
 *
 * id 는 static id 이거나, URI route 처럼 variable segment 를 포함한 pattern id 다.
 * 예: `workspace.openFile`, `/workspace/:fileId`
 */
export interface Descriptor {
  readonly id: string;
}

/** 패턴 id(`/workspace/:fileId`)로 찾았을 때, 자리표시자에 실제로 들어온 값이 `params`에 온다. */
export type DescriptorMatch<TDescriptor> = {
  readonly descriptor: TDescriptor;
  readonly params: Readonly<Record<string, string>>;
};
