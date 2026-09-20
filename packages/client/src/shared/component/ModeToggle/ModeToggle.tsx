import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ModeToggle.module.css";
import { IconButton } from "@primer/react";

export type ModeToggleValues = readonly [string, string];
type ModeToggleChildren = readonly [ReactNode, ReactNode];
export type ModeToggleLabels = readonly [string, string];

const getToggleProps = (
  values: ModeToggleValues,
  value: string,
  disabled: boolean,
  onChange: (value: string) => void,
) => {
  const currentIndex = value === values[1] ? 1 : 0;
  const nextIndex = currentIndex === 0 ? 1 : 0;

  return {
    currentIndex,
    "aria-pressed": currentIndex === 1,
    "data-state": values[currentIndex],
    onClick: () => {
      if (disabled) return;
      onChange(values[nextIndex]);
    },
  } as const;
};

const getLabel = (labels: ModeToggleLabels | undefined, currentIndex: number, fallback: string | undefined) =>
  labels?.[currentIndex] ?? fallback ?? "전환";

export interface ModeToggleProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-labelledby" | "children" | "onClick" | "value"
> {
  readonly ref?: Ref<HTMLButtonElement>;
  readonly children: ModeToggleChildren;
  readonly labels?: ModeToggleLabels;
  readonly values: ModeToggleValues;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly disabled?: boolean;
}

export const ModeToggle = ({
  "aria-label": ariaLabel,
  children,
  className,
  defaultValue,
  disabled = false,
  labels,
  onValueChange,
  value,
  values,
  ref,
  ...props
}: ModeToggleProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? values[0]);
  const resolvedValue = value ?? uncontrolledValue;
  const handleChange = (next: string) => {
    if (value === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const { currentIndex, ...toggleProps } = getToggleProps(values, resolvedValue, disabled, handleChange);
  const icon = () => children[currentIndex];

  return (
    <IconButton
      ref={ref}
      {...props}
      {...toggleProps}
      icon={icon}
      aria-label={getLabel(labels, currentIndex, ariaLabel)}
      disabled={disabled}
      variant="invisible"
      data-component="ModeToggle"
      className={clsx(className, styles["root"])}
    />
  );
};
