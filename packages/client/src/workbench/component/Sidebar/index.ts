import { Panel } from "./Panel";
import { RailBottom } from "./RailBottom";
import { RailTop } from "./RailTop";
import { Root } from "./Root";

export const Sidebar = Object.assign(Root, { RailTop, RailBottom, Panel });

export type { SidebarItem } from "./RailItem";
