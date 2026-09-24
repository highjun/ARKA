import { Group } from "./Group";
import { Item } from "./Item";
import { Panel } from "./Panel";
import { Root } from "./Root";
import { Sash } from "./Sash";
import { Split } from "./Split";
import { Strip } from "./Strip";

export const Tab = Object.assign(Root, { Split, Group, Strip, Panel, Item, Sash });

export type { TabGroup, TabItem, TabSplit, TabTree } from "./shared";
