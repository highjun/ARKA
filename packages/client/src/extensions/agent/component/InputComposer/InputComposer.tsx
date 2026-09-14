import { clsx } from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, FormHTMLAttributes, KeyboardEvent, Ref } from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import styles from './InputComposer.module.css';
import { Button, SegmentedControl } from '@primer/react';
import { Menu } from '#component/Menu';
import { Icon } from '#component/Icon';
import type { IconId } from '#component/Icon';

/** `plan`은 실행 없이 계획만 세운다 — 서버의 `RunMode`와 같은 값이다. */
export type InputComposerMode = 'action' | 'plan';

/** 고를 수 있는 모델 하나. 목록은 밖에서 주입한다. */
export interface InputComposerModelItem {
  /** 목록·`selectedModel` 매칭에 쓰는 고유 id. */
  readonly id: string;
  /** 메뉴·선택된 모델 버튼에 표시할 이름. */
  readonly label: string;
  /** 목록·선택된 모델 버튼에 함께 보여줄 아이콘. */
  readonly iconId?: IconId;
  /** true면 메뉴에서 선택할 수 없다. */
  readonly disabled?: boolean;
}

/** 이 컴포넌트가 실제로 그리는 값·핸들러 묶음 — 상태 소유와 렌더링을 분리하지 않고 한 파일에 두더라도, 계약 자체는 명시적 타입으로 고정해둔다. */
export interface InputComposerState {
  readonly value: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly canSubmit: boolean;
  readonly mode: InputComposerMode;
  readonly models: readonly InputComposerModelItem[];
  readonly selectedModel: InputComposerModelItem | null;
  readonly onTextareaChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly selectMode: (mode: InputComposerMode) => void;
  readonly selectModel: (id: string) => void;
  readonly submit: () => void;
}

const DEFAULT_MODELS: readonly InputComposerModelItem[] = [
  { id: 'gpt-5.5', label: 'GPT-5.5', iconId: 'brain' },
  { id: 'claude-sonnet', label: 'Sonnet', iconId: 'monitor' },
  { id: 'local', label: 'Local', iconId: 'settingsGear' },
];

/**
 * "Action Mode"/"Plan Mode"가 아니라 "Action"/"Plan" — 아이콘이 이미 의미를 보조하고,
 * `ComponentPreview`의 `VIEWPORT_MODE_ITEMS`도 이미 "Mobile"/"Tablet"/"Desktop" 같은 한
 * 단어 라벨 관례를 쓴다. `.toolbar`가 모델 선택 버튼과 폭을 나눠 쓰는 좁은 자리라, Primer
 * `SegmentedControl` 라벨엔 `white-space: nowrap`/`text-overflow: ellipsis`가 없어 컨테이너가
 * 좁아지면 줄바꿈되며 고정 높이 버튼 밖으로 텍스트가 넘쳤다(2026-08-31 지적으로 확인) — 짧은
 * 라벨로 그 확률 자체를 낮춘다.
 */
const MODE_ITEMS = [
  { id: 'action', iconId: 'wrench', label: 'Action' },
  { id: 'plan', iconId: 'brain', label: 'Plan' },
] as const satisfies readonly { id: InputComposerMode; iconId: IconId; label: string }[];

const MODEL_LABEL = 'Model';
const SUBMIT_LABEL = 'Submit';

const getSelectedModel = (models: readonly InputComposerModelItem[], modelId?: string): InputComposerModelItem | null => {
  if (models.length === 0) return null;
  return models.find((model) => model.id === modelId) ?? models[0] ?? null;
};

/** `onSubmit`을 가로챈다 — 폼 이벤트가 아니라 입력 내용과 모드를 준다. */
export interface InputComposerProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'children' | 'onSubmit'> {
  /** 루트 `form`으로 그대로 통과한다. */
  readonly ref?: Ref<HTMLFormElement>;
  /** controlled 모드의 현재 입력값. */
  readonly value?: string;
  /** uncontrolled 모드의 초깃값. */
  readonly defaultValue?: string;
  /** true면 입력·모드 전환·모델 선택·제출이 전부 막힌다. */
  readonly disabled?: boolean;
  /** true면 제출 버튼이 로딩 아이콘으로 바뀌고 제출이 막힌다. */
  readonly loading?: boolean;
  /** Enter로 제출할지 여부 — false면 Enter는 줄바꿈만 하고 제출은 버튼으로만 한다. */
  readonly submitOnEnter?: boolean;
  /** controlled 모드의 현재 모드. */
  readonly mode?: InputComposerMode;
  /** uncontrolled 모드의 초기 모드. */
  readonly defaultMode?: InputComposerMode;
  /** 모드가 바뀔 때마다(controlled 여부 무관) 호출된다. */
  readonly onModeChange?: (mode: InputComposerMode) => void;
  /** 선택 가능한 모델 목록. */
  readonly models?: readonly InputComposerModelItem[];
  /** controlled 모드의 현재 선택된 모델 id. */
  readonly modelId?: string;
  /** uncontrolled 모드의 초기 선택 모델 id. */
  readonly defaultModelId?: string;
  /** 모델이 선택될 때마다(controlled 여부 무관) 호출된다. */
  readonly onModelSelect?: (model: InputComposerModelItem) => void;
  /** 선택된 모델의 id만 필요할 때 쓴다(controlled 여부 무관) — 모델 객체 전체가 필요하면
   * `onModelSelect`를 쓴다. `modelId`가 바뀔 때마다 `onModelSelect`와 함께 호출된다. */
  readonly onModelIdChange?: (modelId: string) => void;
  /** 값이 바뀔 때마다(controlled 여부 무관) 호출된다. */
  readonly onValueChange?: (value: string) => void;
  /** 제출 시 그 시점의 값과 함께 호출된다. */
  readonly onSubmitValue?: (value: string) => void;
  /** textarea placeholder. */
  readonly placeholder?: string;
  /** textarea 행 수. */
  readonly rows?: number;
}

/**
 * 값·모드·모델 선택과 submit-on-enter 를 소유하고 그린다. controlled/uncontrolled 3축(값·모드·모델)을
 * 각각 독립적으로 지원한다 — 셋 다 렌더링에 직접 쓰이는 상태라 별도 훅으로 뽑지 않고 이 파일 안에 둔다.
 *
 * `value`만 `useControllableState`를 그대로 쓰지 않는다 — 제출 후 입력을 비우는 동작은
 * "사용자가 값을 바꿨다"는 신호가 아니라서 uncontrolled일 때 `onValueChange`를 호출하지 않아야
 * 한다(제출 콜백 `onSubmitValue`가 이미 그 값을 받는다). `mode`/`modelId`는 그런 예외가 없어
 * `useControllableState`를 그대로 쓴다 — `modelId`는 `onChange`를 `onModelIdChange`로 연결해
 * <state>/default<State>/on<State>Change 삼종을 완성하고, 모델 객체 전체가 필요한 소비자를
 * 위해 `onModelSelect`도 `selectModel`에서 별도로 호출한다(둘 다 같은 시점에 함께 불린다).
 */
export const InputComposer = ({
  ref,
  value,
  defaultValue = '',
  disabled = false,
  loading = false,
  submitOnEnter = true,
  mode,
  defaultMode = 'action',
  onModeChange,
  models = DEFAULT_MODELS,
  modelId,
  defaultModelId,
  onModelSelect,
  onModelIdChange,
  onValueChange,
  onSubmitValue,
  placeholder = '요청 입력...',
  rows = 3,
  className,
  ...rest
}: InputComposerProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isValueControlled = value !== undefined;
  const currentValue = isValueControlled ? value : internalValue;
  const [currentMode, setMode] = useControllableState<InputComposerMode>({ prop: mode, defaultProp: defaultMode, onChange: onModeChange, caller: 'InputComposer' });
  const [currentModelId, setModelId] = useControllableState<string | undefined>({
    prop: modelId,
    defaultProp: defaultModelId,
    onChange: (nextModelId) => {
      if (nextModelId !== undefined) onModelIdChange?.(nextModelId);
    },
    caller: 'InputComposer',
  });
  const selectedModel = useMemo(() => getSelectedModel(models, currentModelId), [currentModelId, models]);
  const canSubmit = !disabled && !loading && currentValue.trim().length > 0;

  const setValue = useCallback(
    (nextValue: string) => {
      if (!isValueControlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [isValueControlled, onValueChange],
  );

  const selectMode = useCallback(
    (nextMode: InputComposerMode) => {
      if (disabled) return;
      setMode(nextMode);
    },
    [disabled, setMode],
  );

  const selectModel = useCallback(
    (id: string) => {
      if (disabled) return;
      const model = models.find((candidate) => candidate.id === id);
      if (!model) return;
      setModelId(id);
      onModelSelect?.(model);
    },
    [disabled, models, onModelSelect, setModelId],
  );

  const submit = useCallback(() => {
    if (!canSubmit) return;
    onSubmitValue?.(currentValue);
    if (!isValueControlled) setInternalValue('');
  }, [canSubmit, currentValue, isValueControlled, onSubmitValue]);

  const onTextareaChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value), [setValue]);

  const onTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!submitOnEnter || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    },
    [submit, submitOnEnter],
  );

  const state: InputComposerState = {
    value: currentValue,
    disabled,
    loading,
    canSubmit,
    mode: currentMode,
    models,
    selectedModel,
    onTextareaChange,
    onTextareaKeyDown,
    selectMode,
    selectModel,
    submit,
  };

  return (
    <form
      ref={ref}
      className={clsx(className, styles['root'])}
      onSubmit={(event) => {
        event.preventDefault();
        state.submit();
      }}
      {...rest}
      data-component="InputComposer"
    >
      <div className={styles['editor']}>
        <textarea
          value={state.value}
          disabled={state.disabled}
          aria-busy={state.loading}
          onChange={state.onTextareaChange}
          onKeyDown={state.onTextareaKeyDown}
          rows={rows}
          placeholder={placeholder}
          className={styles['textarea']}
        />
      </div>
      <div className={styles['toolbar']}>
        <div className={styles['modes']}>
          <SegmentedControl
            aria-label="입력 모드"
            size="small"
            // 로컬 컨테이너 압박이 진짜 원인이라 이게 모든 경우를 커버하진 않지만(뷰포트 폭
            // 기준 media query라), Primer가 정확히 이 문제(좁은 공간에서 라벨 넘침)를 위해
            // 만든 공식 탈출구라 방어선으로 얹는다 — 진짜 좁은 뷰포트(< 768px)에서는 아이콘만
            // 남는다.
            variant={{ narrow: 'hideLabels' }}
            onChange={(index) => {
              const id = MODE_ITEMS[index]?.id;
              if (id) state.selectMode(id);
            }}
          >
            {MODE_ITEMS.map((item) => (
              <SegmentedControl.Button
                key={item.id}
                selected={item.id === state.mode}
                leadingVisual={() => <Icon iconId={item.iconId} size="sm" />}
              >
                {item.label}
              </SegmentedControl.Button>
            ))}
          </SegmentedControl>
        </div>
        <div className={styles['actions']}>
          <span className={styles['modelLabel']}>{MODEL_LABEL}</span>
          <Menu>
            <Menu.Trigger asChild>
              <Button aria-label={MODEL_LABEL} disabled={state.disabled || state.models.length === 0}>
                <span className={styles['modelOption']}>
                  {state.selectedModel?.iconId ? <Icon iconId={state.selectedModel.iconId} size="sm" /> : null}
                  <span className={styles['modelName']}>{state.selectedModel?.label ?? MODEL_LABEL}</span>
                </span>
              </Button>
            </Menu.Trigger>
            <Menu.Content>
              <Menu.RadioGroup value={state.selectedModel?.id} onValueChange={(id) => state.selectModel(id)}>
                {state.models.map((model) => (
                  <Menu.RadioItem key={model.id} value={model.id} disabled={model.disabled}>
                    {model.iconId ? <Icon iconId={model.iconId} size="sm" /> : null}
                    {model.label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu>
          <Button aria-label={SUBMIT_LABEL} disabled={!state.canSubmit} onClick={state.submit} variant="primary">
            <Icon iconId={state.loading ? 'close' : 'sendHorizontal'} size="sm" />
          </Button>
        </div>
      </div>
    </form>
  );
};

