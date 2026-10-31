import { WALL, type Caption, type Frame, type Rect } from './types'

export function isOpen(tile: number | undefined): boolean {
  return tile !== undefined && tile !== WALL
}

/** Collects frames; every push stores a copy of the grid so playback can scrub freely. */
export class Recorder {
  readonly frames: Frame[] = []

  push(grid: Uint8Array, caption: Caption, extra: Omit<Frame, 'grid' | 'caption'> = {}): void {
    this.frames.push({ grid: grid.slice(), caption, ...extra })
  }
}

export interface GenResult {
  grid: Uint8Array
  frames: Frame[]
  rooms: Rect[]
}
