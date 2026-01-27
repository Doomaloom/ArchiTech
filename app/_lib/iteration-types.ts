export type GemId = string;

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEntry {
  id: GemId;
  parentId: GemId | "root" | null;
  tag: string;
  text: string;
  order?: number;
  base: LayoutRect;
  folderId?: string | null;
  folderName?: string | null;
  folderParent?: boolean;
}

export type LayoutMap = Record<GemId, LayoutEntry>;

export type ContainerMap = Record<GemId, GemId>;

export interface ContainerGraph {
  map: ContainerMap;
  parentIds: GemId[];
  childIds: GemId[];
}

export interface ElementTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
}
