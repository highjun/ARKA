import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './FileIcon.module.css';
import { FILE_ICON_MAP, fileIconIdOf } from './shared';
import type { FileIconId } from './shared';
import { seti } from './data';
import * as Iconify from '@iconify/react/offline';

/** `Icon`의 크기 축과 같다 — 두 아이콘이 한 줄에서 어긋나지 않게. */
export type FileIconSize = 'sm' | 'md' | 'lg';

Iconify.addCollection(seti as Parameters<typeof Iconify.addCollection>[0]);

/** `id`를 막는다 — 파일 이름과 헷갈려 잘못 넘기는 것을 타입에서 끊는다. */
export interface FileIconRootProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'id'> {
  /** 파일 이름. 확장자로 아이콘을 고른다 — 어느 `FileIconId` 를 쓸지는 컴포넌트가 정한다. */
  readonly fileName: string;
  /** FileIcon의 크기. sm, md, lg 중 하나로 기본값은 md. */
  readonly size?: FileIconSize;
}

const Root = forwardRef<HTMLSpanElement, FileIconRootProps>(
  ({ className, fileName, size = 'md', ...props }, ref) => {
    const fileIconId = fileIconIdOf(fileName);
    return (
      <span
        ref={ref}
        aria-hidden="true"
        data-file-icon={fileIconId}
        data-size={size}
        className={clsx(className, styles['FileIcon'])}
        {...props}
        data-component="FileIcon"
      >
        <Iconify.Icon aria-hidden="true" focusable="false" height="100%" width="100%" icon={FILE_ICON_MAP[fileIconId]} />
      </span>
    );
  },
);

export type { FileIconRootProps as FileIconProps, FileIconId };
export const FileIcon = assembleCompound('FileIcon', Root, {});
