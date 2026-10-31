import { analyze } from './analyze'
import { generateBsp } from './bsp'
import { generateCaves } from './caves'
import type { GenResult } from './grid'
import { Rng } from './rng'
import type { Algorithm, Dungeon, Params } from './types'
import { generateWalk } from './walk'

export type MapSize = 's' | 'm' | 'l'

export const SIZES: Record<MapSize, { w: number; h: number }> = {
  s: { w: 48, h: 30 },
  m: { w: 72, h: 45 },
  l: { w: 96, h: 60 },
}

export const DEFAULT_PARAMS: Params = {
  bsp: { minLeaf: 8, roomFill: 0.75 },
  caves: { fill: 0.47, iterations: 5 },
  walk: { coverage: 0.35, steadiness: 0.55 },
}

/** Pure and deterministic: the same inputs always produce the same dungeon and frames. */
export function generate(algo: Algorithm, seed: string, size: MapSize, params: Params): Dungeon {
  const { w, h } = SIZES[size]
  const rng = new Rng(seed)

  let result: GenResult
  if (algo === 'bsp') result = generateBsp(w, h, params.bsp, rng)
  else if (algo === 'caves') result = generateCaves(w, h, params.caves, rng)
  else result = generateWalk(w, h, params.walk, rng)

  const analysis = analyze(result.grid, w, h, rng)
  result.frames.push({ grid: result.grid.slice(), caption: { key: 'post.analyze' } })

  return { width: w, height: h, frames: result.frames, rooms: result.rooms, analysis }
}
