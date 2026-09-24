import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Icon.module.css";
import { icons } from "./data";
import codicon from "@iconify-json/codicon/icons.json";
import arka from "./data/arka.json";
import * as Iconify from "@iconify/react/offline";

export type IconId = keyof typeof icons;
type IconSize = "sm" | "md" | "lg";
export const ICON_MAP: Record<IconId, string> = icons;

Iconify.addCollection(codicon as Parameters<typeof Iconify.addCollection>[0]);
Iconify.addCollection(arka as Parameters<typeof Iconify.addCollection>[0]);

export interface IconProps extends Omit<ComponentPropsWithoutRef<"span">, "id"> {
  readonly ref?: Ref<HTMLSpanElement>;
  readonly iconId: IconId;
  readonly size?: IconSize;
}

export const Icon = ({ className, iconId, size = "md", ref, ...props }: IconProps) => (
  <span
    ref={ref}
    aria-hidden="true"
    data-icon={iconId}
    data-size={size}
    className={clsx(className, styles["Icon"])}
    {...props}
    data-component="Icon"
  >
    <Iconify.Icon aria-hidden="true" focusable="false" height="100%" width="100%" icon={ICON_MAP[iconId]} />
  </span>
);
