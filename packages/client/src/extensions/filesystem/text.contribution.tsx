import { observable, observableRef } from "mobx";
import type { TabProviderDescriptor } from "#workbench";
import { FileIcon } from "./component/FileIcon";
import type { IFileContentViewModel } from "./viewmodel/IFileContentViewModel";
import { FileContentView } from "./view/FileContentView";

const nameOf = (path: string): string => path.split("/").pop() ?? path;

export const createTextTabProvider = (deps: {
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
        Content: () => <FileContentView path={path} />,
      },
      { icon: observableRef, Content: observableRef },
    );
  },
});
