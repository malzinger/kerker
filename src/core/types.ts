export const WALL = 0
export const FLOOR = 1
export const CORRIDOR = 2
export type Tile = typeof WALL | typeof FLOOR | typeof CORRIDOR

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type CaptionKey =
  | 'bsp.start'
  | 'bsp.split'
  | 'bsp.room'
  | 'bsp.corridor'
  | 'cave.fill'
  | 'cave.step'
  | 'cave.prune'
  | 'walk.start'
  | 'walk.carve'
  | 'post.analyze'

export interface Caption {
  key: CaptionKey
  /** Counter shown in the caption, e.g. "room 3 of 9". */
  n?: number
  total?: number
}

/** One recorded step of a generator: a full copy of the grid plus what to highlight. */
export interface Frame {
  grid: Uint8Array
  caption: Caption
  partitions?: Rect[]
  highlight?: Rect[]
  walker?: Point
}

export type Algorithm = 'bsp' | 'caves' | 'walk'

export interface BspParams {
  minLeaf: number
  roomFill: number
}

export interface CaveParams {
  fill: number
  iterations: number
}

export interface WalkParams {
  coverage: number
  steadiness: number
}

export interface Params {
  bsp: BspParams
  caves: CaveParams
  walk: WalkParams
}

export interface Analysis {
  start: Point
  exit: Point
  /** BFS distance from start per cell, -1 for walls and unreachable cells. */
  dist: Int32Array
  maxDist: number
  path: Point[]
  chests: Point[]
  enemies: Point[]
  floorCells: number
  deadEnds: number
}

export interface Dungeon {
  width: number
  height: number
  frames: Frame[]
  rooms: Rect[]
  analysis: Analysis
}
