import { Recorder, type GenResult } from './grid'
import type { Rng } from './rng'
import { FLOOR, WALL, type WalkParams } from './types'

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const

/** Roughly how many frames the walk is recorded in, regardless of map size. */
const TARGET_FRAMES = 160

/**
 * Drunkard's walk: a single digger stumbles around from the centre, carving as it goes,
 * until the requested share of the map is open. Steadiness is the chance to keep walking
 * in the same direction, which turns blobby caverns into long winding tunnels.
 */
export function generateWalk(width: number, height: number, p: WalkParams, rng: Rng): GenResult {
  const grid = new Uint8Array(width * height)
  const rec = new Recorder()

  const interior = (width - 2) * (height - 2)
  const target = Math.max(1, Math.round(interior * p.coverage))
  const every = Math.max(1, Math.ceil(target / TARGET_FRAMES))

  const pos = { x: Math.floor(width / 2), y: Math.floor(height / 2) }
  let dir = rng.pick(DIRS)
  grid[pos.y * width + pos.x] = FLOOR
  let carved = 1
  rec.push(grid, { key: 'walk.start' }, { walker: { ...pos } })

  const maxSteps = target * 60
  for (let step = 0; carved < target && step < maxSteps; step++) {
    if (!rng.chance(p.steadiness)) dir = rng.pick(DIRS)
    const nx = pos.x + dir.x
    const ny = pos.y + dir.y
    if (nx < 1 || ny < 1 || nx > width - 2 || ny > height - 2) {
      dir = rng.pick(DIRS)
      continue
    }
    pos.x = nx
    pos.y = ny
    const i = ny * width + nx
    if (grid[i] === WALL) {
      grid[i] = FLOOR
      carved++
      if (carved % every === 0) {
        rec.push(grid, { key: 'walk.carve', n: carved, total: target }, { walker: { ...pos } })
      }
    }
  }
  rec.push(grid, { key: 'walk.carve', n: carved, total: target }, { walker: { ...pos } })

  return { grid, frames: rec.frames, rooms: [] }
}
