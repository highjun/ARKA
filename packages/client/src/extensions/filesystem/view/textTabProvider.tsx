import { observable, observableRef } from "mobx";
import type { TabContentProps, TabProviderDescriptor } from "../../../workbench/model/ITabProviderDescriptor";
import { FileIcon } from "../component/FileIcon";
import type { IFileContentViewModel } from "../viewmodel/IFileContentViewModel";
import { FileContentView } from "./FileContentView";

/** 경로의 마지막 조각. 폰의 탭 스트립에는 경로 전체가 들어가지 않는다. */
const nameOf = (path: string): string => path.split("/").pop() ?? path;

/**
 * 텍스트 탭 provider. **바닥이다**(`priority 0`) — 다들 거절한 뒤에야 파일을 읽어 텍스트인지 판정한다.
 * `file:` 스킴만 받고, 읽기 실패·바이너리는 `IFileContentViewModel.openFile`이 `false`로 답해 넘긴다.
 *
 * 돌려주는 descriptor는 observable이다 — `isDirty`가 편집 버퍼를 따라 켜지고 꺼진다.
 */
export const createTextTabProvider = (deps: {
  /** 열 때마다 읽는다 — 조립부가 getter로 늦게 꺼낼 수 있게. */
  readonly fileContent: IFileContentViewModel;
}): TabProviderDescriptor => ({
  id: "arka.filesystem.text",
  priority: 0,
  openTab: async (uri) => {
    if (uri.scheme !== "file") return undefined;
    const path = uri.path;
    const fileContent = deps.fileContent;
    if (!(await fileContent.openFile(path))) return undefined;
    return observable(
      {
        icon: <FileIcon fileName={nameOf(path)} size="sm" />,
        title: nameOf(path),
        get isDirty() {
          return fileContent.rows[path]?.isDirty ?? false;
        },
        Content: ({ reveal }: TabContentProps) => <FileContentView path={path} reveal={reveal} />,
      },
      { icon: observableRef, Content: observableRef },
    );
  },
});
