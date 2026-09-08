/**
 * Registry 에 등록되는 대상이 공통으로 가져야 하는 최소 계약.
 *
 * id 는 static id 이거나, URI route 처럼 variable segment 를 포함한 pattern id 다.
 * 예: `workspace.openFile`, `/workspace/:fileId`
 */
export interface Descriptor {
  readonly id: string;
}

export type DescriptorMatch<TDescriptor> = {
  readonly descriptor: TDescriptor;
  readonly params: Readonly<Record<string, string>>;
};
