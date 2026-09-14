import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./FileIcon.module.css";
import { FILE_ICON_MAP, fileIconIdOf } from "./shared";
import { seti } from "./data";
import * as Iconify from "@iconify/react/offline";

/** `Icon`의 크기 축과 같다 — 두 아이콘이 한 줄에서 어긋나지 않게. */
type FileIconSize = "sm" | "md" | "lg";

Iconify.addCollection(seti as Parameters<typeof Iconify.addCollection>[0]);

/** `id`를 막는다 — 파일 이름과 헷갈려 잘못 넘기는 것을 타입에서 끊는다. */
export interface FileIconProps extends Omit<ComponentPropsWithoutRef<"span">, "id"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLSpanElement>;
  /** 파일 이름. 확장자로 아이콘을 고른다 — 어느 `FileIconId` 를 쓸지는 컴포넌트가 정한다. */
  readonly fileName: string;
  /** FileIcon의 크기. sm, md, lg 중 하나로 기본값은 md. */
  readonly size?: FileIconSize;
}

/** 파일 이름의 확장자로 아이콘을 골라 그린다 — 장식이라 스크린리더에서 숨긴다. */
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
