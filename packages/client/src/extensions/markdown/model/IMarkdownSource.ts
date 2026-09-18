/** 이 익스텐션이 파일에서 필요한 것 — 내용 하나. `filesystem`의 `FileContent`와 모양이 겹치지만 여기서 다시 선언한다(슬라이스끼리 import하지 않는다). */
export type MarkdownDocument = {
  readonly content: string;
  /** 상한을 넘어 앞부분만 왔다 — 미리보기에도 그렇게 알린다. */
  readonly truncated: boolean;
};

declare module "#core/di" {
  /** `IMarkdownSource`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.markdown.source": IMarkdownSource;
  }
}
/**
 * 마크다운 파일을 읽고 바뀜을 듣는 통로. 조립부가 `filesystem`의 포트를 이 모양으로 감싸 넘긴다 —
 * 익스텐션끼리는 서로 모르고 조립부만 둘을 안다.
 */
export interface IMarkdownSource {
  /** @throws Error 읽지 못하면 — 메시지는 사람이 읽을 말. 바이너리면 던진다. */
  read(path: string): Promise<MarkdownDocument>;
  /** 그 파일(또는 그 파일이 든 디렉터리)이 바뀌면 부른다. 해지 함수를 돌려준다. */
  watch(path: string, onChange: () => void): () => void;
}
