import { isOpen } from './grid'
import type { Rng } from './rng'
import { FLOOR, type Analysis, type Point } from './types'

const MAX_CHESTS = 12

/**
 * Turns a raw layout into a level: start and exit at the two ends of the longest path
 * (found with two breadth-first searches), a distance field from the start, chests in
 * dead ends and quiet corners, and enemies spread out away from the entrance.
 */
export function analyze(grid: Uint8Array, width: number, height: number, rng: Rng): Analysis {
  const open: number[] = []
  for (let i = 0; i < grid.length; i++) if (isOpen(grid[i])) open.push(i)
  if (open.length === 0) {
    const c = Math.floor(height / 2) * width + Math.floor(width / 2)
    grid[c] = FLOOR
    open.push(c)
  }

  const neighbours = (i: number): number[] => {
    const x = i % width
    const out: number[] = []
    if (x > 0) out.push(i - 1)
    if (x < width - 1) out.push(i + 1)
    if (i >= width) out.push(i - width)
    if (i < grid.length - width) out.push(i + width)
    return out
  }

  const bfs = (from: number) => {
    const dist = new Int32Array(grid.length).fill(-1)
    const queue = new Int32Array(grid.length)
    let head = 0
    let tail = 0
    dist[from] = 0
    queue[tail++] = from
    let far = from
    while (head < tail) {
      const i = queue[head++] as number
      const d = dist[i] as number
      if (d > (dist[far] as number)) far = i
      for (const n of neighbours(i)) {
        if (dist[n] === -1 && isOpen(grid[n])) {
          dist[n] = d + 1
          queue[tail++] = n
        }
      }
    }
    return { dist, far }
  }

  // Double sweep: the farthest cell from anywhere is one end of a longest path.
  const startIdx = bfs(rng.pick(open)).far
  const { dist, far: exitIdx } = bfs(startIdx)
  const maxDist = dist[exitIdx] as number

  const path: Point[] = []
  for (let i = exitIdx; ;) {
    path.push(toPoint(i, width))
    const d = dist[i] as number
    if (d === 0) break
    const prev = neighbours(i).find((n) => dist[n] === d - 1)
    if (prev === undefined) break
    i = prev
  }
  path.reverse()

  const onPath = new Set(path.map((p) => p.y * width + p.x))
  const reachable = open.filter((i) => (dist[i] as number) >= 0)
  const special = (i: number) => i === startIdx || i === exitIdx

  const deadEnds = reachable.filter(
    (i) => !special(i) && neighbours(i).filter((n) => isOpen(grid[n])).length === 1,
  )

  const takeSpaced = (candidates: number[], into: Point[], limit: number, spacing: number) => {
    for (const i of candidates) {
      if (into.length >= limit) break
      const p = toPoint(i, width)
      if (into.every((q) => Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)) >= spacing)) {
        into.push(p)
      }
    }
  }

  // Dead ends first (deepest first), then quiet corners far from the start.
  const chests: Point[] = []
  takeSpaced(
    [...deadEnds].sort((a, b) => (dist[b] as number) - (dist[a] as number)),
    chests,
    MAX_CHESTS,
    2,
  )
  if (chests.length < 3) {
    const corners = reachable.filter(
      (i) =>
        !special(i) &&
        !onPath.has(i) &&
        (dist[i] as number) > maxDist * 0.3 &&
        wallsAround(grid, width, i) >= 5,
    )
    takeSpaced(rng.shuffle(corners), chests, 3, 8)
  }

  const chestSet = new Set(chests.map((p) => p.y * width + p.x))
  const minEnemyDist = Math.max(6, Math.round(maxDist * 0.15))
  const enemyCandidates = reachable.filter(
    (i) => !special(i) && !chestSet.has(i) && (dist[i] as number) >= minEnemyDist,
  )
  const enemies: Point[] = []
  takeSpaced(
    rng.shuffle(enemyCandidates),
    enemies,
    Math.max(3, Math.round(reachable.length / 70)),
    4,
  )

  return {
    start: toPoint(startIdx, width),
    exit: toPoint(exitIdx, width),
    dist,
    maxDist,
    path,
    chests,
    enemies,
    floorCells: reachable.length,
    deadEnds: deadEnds.length,
  }
}

function toPoint(i: number, width: number): Point {
  const x = i % width
  return { x, y: (i - x) / width }
}

function wallsAround(grid: Uint8Array, width: number, i: number): number {
  const x = i % width
  const y = (i - x) / width
  let walls = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && !isOpen(grid[(y + dy) * width + x + dx])) walls++
    }
  }
  return walls
}
