import path from "node:path";

export interface IWorkspace {
  readonly root: string;
  readonly name: string;
}

export const createWorkspace = (root: string): IWorkspace => ({ root, name: path.basename(root) || root });
