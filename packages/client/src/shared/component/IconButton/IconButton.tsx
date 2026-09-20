import type { Ref } from "react";
import { clsx } from "clsx";
import styles from "./IconButton.module.css";
import { IconButton as PrimerIconButton } from "@primer/react";
import type { IconButtonProps as PrimerIconButtonProps } from "@primer/react";

export type IconButtonProps = PrimerIconButtonProps & {
  readonly ref?: Ref<HTMLButtonElement>;
};

export const IconButton = ({ ref, ...props }: IconButtonProps) => (
  <PrimerIconButton
    {...props}
    ref={ref}
    data-component="IconButton"
    className={clsx(props.className, styles["root"])}
  />
);
