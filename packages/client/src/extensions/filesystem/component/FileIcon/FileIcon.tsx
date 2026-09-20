import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./FileIcon.module.css";
import { FILE_ICON_MAP, fileIconIdOf } from "./shared";
import { seti } from "./data";
import * as Iconify from "@iconify/react/offline";

type FileIconSize = "sm" | "md" | "lg";

Iconify.addCollection(seti as Parameters<typeof Iconify.addCollection>[0]);

export interface FileIconProps extends Omit<ComponentPropsWithoutRef<"span">, "id"> {
  readonly ref?: Ref<HTMLSpanElement>;
  readonly fileName: string;
  readonly size?: FileIconSize;
}

export const FileIcon = ({ className, fileName, size = "md", ref, ...props }: FileIconProps) => {
  const fileIconId = fileIconIdOf(fileName);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-file-icon={fileIconId}
      data-size={size}
      className={clsx(className, styles["FileIcon"])}
      {...props}
      data-component="FileIcon"
    >
      <Iconify.Icon aria-hidden="true" focusable="false" height="100%" width="100%" icon={FILE_ICON_MAP[fileIconId]} />
    </span>
  );
};
