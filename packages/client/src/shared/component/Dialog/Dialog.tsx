import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { usePortalContainer } from '#utils/portal';
import styles from './Dialog.module.css';
import { Icon } from '#component/Icon';
import type { IconId } from '#component/Icon';
import { IconButton } from '#component/IconButton';
import * as Primitive from '@radix-ui/react-dialog';

/** 확인 버튼의 색만 바꾼다 — 동작은 그대로다. */
export type DialogTone = 'default' | 'attention' | 'danger';

/** `title`을 가로챈다 — 네이티브 툴팁이 아니라 대화상자의 제목이다. */
export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 닫힘을 요청받았다 — 배경 클릭·Escape·우상단 닫기 버튼·`Dialog.Actions` 안의 취소 버튼 전부 여기로 온다. */
  readonly onClose: () => void;
  /** 좌상단에 그릴 아이콘. */
  readonly iconId: IconId;
  /** 아이콘 색. 기본값 `'default'`(상속받은 텍스트 색 그대로) — 심각도를 강조할 때만 바꾼다. */
  readonly tone?: DialogTone;
  /** 헤더 한 줄에 들어가는 제목. */
  readonly title: string;
  /** 제목 아래 한 줄로 들어가는 설명. */
  readonly description: string;
}

/** 버튼이 놓이는 아래쪽 줄. 오른쪽 정렬은 이쪽이 한다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface DialogActionsProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * 헤더 한 줄(아이콘+제목+닫기 버튼)과 그 아래 들여쓰기 없는 설명 한 줄, 이어서 우측 정렬 버튼
 * 행이 오는 짧은 확인 모달이다. 헤더바가 있는 범용 모달인 Primer `Dialog`를 그대로 re-export하던
 * 것(2026-09-05 이전)을 대체한다 — 삭제·탭 닫기 확인처럼 "예/아니오" 하나만 묻는 자리엔 그
 * 헤더바가 과했다. (2026-09-06 개정 — 이전엔 타이틀바를 아예 없앤 VSCode 스타일이었으나, 닫기
 * 버튼이 필요해지며 헤더 행 자체가 타이틀바 역할을 겸하게 됐다.)
 *
 * 별도 `open` prop을 안 둔다 — 기존 소비 패턴이 `{조건 ? <Dialog ... /> : null}`로 조건부
 * 마운트하는 것이었고(Primer `Dialog`도 같은 방식이었다), 마운트돼 있으면 열려 있다는 뜻으로
 * 그대로 이어받는다.
 */
export const DialogRoot = forwardRef<HTMLDivElement, DialogProps>(
  ({ onClose, iconId, tone = 'default', title, description, children, className, ...props }, ref) => {
    const container = usePortalContainer();

    return (
      <Primitive.Root
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Primitive.Portal container={container}>
          <Primitive.Overlay className={styles['overlay']} />
          <Primitive.Content {...props} ref={ref} data-component="Dialog" className={clsx(className, styles['content'])}>
            <div className={styles['header']}>
              <span className={styles['icon']} data-tone={tone}>
                <Icon iconId={iconId} size="md" />
              </span>
              <Primitive.Title className={styles['title']}>{title}</Primitive.Title>
              <IconButton
                variant="invisible"
                size="small"
                aria-label="대화상자 닫기"
                icon={() => <Icon iconId="close" size="sm" />}
                onClick={onClose}
                className={styles['closeButton']}
              />
            </div>
            <Primitive.Description className={styles['description']}>{description}</Primitive.Description>
            {children}
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    );
  },
);

/** 우측 정렬 버튼 행 — 취소/확인 등 액션은 전부 여기 자식으로 둔다. */
export const DialogActions = ({ className, ...props }: DialogActionsProps) => <div className={clsx(className, styles['actions'])} {...props} />;

/**
 * 부품을 `Object.assign`으로 네임스페이스에 붙인다. 부품 함수의 이름이 `Dialog<부품>`인 것은
 * react-docgen-typescript가 파일의 최상위 export만 컴포넌트로 인식해서다 — Docs 페이지의
 * 서브컴포넌트 Props 표가 그 이름으로 붙는다(2026-09-06 실측).
 */
export const Dialog = Object.assign(DialogRoot, { Actions: DialogActions });
