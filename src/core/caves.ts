import { isOpen, Recorder, type GenResult } from './grid'
import type { Rng } from './rng'
import { FLOOR, WALL, type CaveParams } from './types'

/**
 * Cellular automata: start from noise, then repeatedly let every cell become a wall
 * when most of its eight neighbours are walls. Noise melts into organic caves.
 * Disconnected pockets are removed at the end so every floor tile is reachable.
 */
export function generateCaves(width: number, height: number, p: CaveParams, rng: Rng): GenResult {
  let grid: Uint8Array = new Uint8Array(width * height)
  const rec = new Recorder()

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y * width + x] = rng.chance(p.fill) ? WALL : FLOOR
    }
  }
  rec.push(grid, { key: 'cave.fill' })

  for (let i = 0; i < p.iterations; i++) {
    grid = smooth(grid, width, height)
    rec.push(grid, { key: 'cave.step', n: i + 1, total: p.iterations })
  }

  const removed = keepLargestRegion(grid, width, height)
  rec.push(grid, { key: 'cave.prune', n: removed })

  return { grid, frames: rec.frames, rooms: [] }
}

function smooth(grid: Uint8Array, width: number, height: number): Uint8Array {
  const next = new Uint8Array(grid.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let walls = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && !isOpen(grid[(y + dy) * width + x + dx])) walls++
        }
      }
      const i = y * width + x
      next[i] = walls > 4 ? WALL : walls < 4 ? FLOOR : (grid[i] as number)
    }
  }
  return next
}

/** Flood-fills every open region, keeps the biggest one and returns how many were filled in. */
export function keepLargestRegion(grid: Uint8Array, width: number, height: number): number {
  const label = new Int32Array(grid.length).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []

  for (let start = 0; start < grid.length; start++) {
    if (!isOpen(grid[start]) || label[start] !== -1) continue
    const id = sizes.length
    let size = 0
    label[start] = id
    stack.push(start)
    while (stack.length > 0) {
      const i = stack.pop() as number
      size++
      const x = i % width
      const y = (i - x) / width
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ]
      for (const n of neighbours) {
        if (n >= 0 && isOpen(grid[n]) && label[n] === -1) {
          label[n] = id
          stack.push(n)
        }
      }
    }
    sizes.push(size)
  }

  if (sizes.length <= 1) return 0
  const keep = sizes.indexOf(Math.max(...sizes))
  for (let i = 0; i < grid.length; i++) {
    if (label[i] !== -1 && label[i] !== keep) grid[i] = WALL
  }
  return sizes.length - 1
}
