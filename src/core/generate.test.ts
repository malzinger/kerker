import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, generate, type MapSize } from './generate'
import { isOpen } from './grid'
import { WALL, type Algorithm, type Dungeon } from './types'

const ALGOS: Algorithm[] = ['bsp', 'caves', 'walk']
const SEEDS = ['moss-vault-417', 'a', 'ember-crypt-902', 'x'.repeat(40), '0']
const SIZES: MapSize[] = ['s', 'm', 'l']

function finalGrid(d: Dungeon): Uint8Array {
  return (d.frames.at(-1) as { grid: Uint8Array }).grid
}

describe.each(ALGOS)('%s', (algo) => {
  it('is deterministic for a given seed', () => {
    const a = generate(algo, 'moss-vault-417', 'm', DEFAULT_PARAMS)
    const b = generate(algo, 'moss-vault-417', 'm', DEFAULT_PARAMS)
    expect(finalGrid(a)).toEqual(finalGrid(b))
    expect(a.frames.length).toBe(b.frames.length)
    expect(a.analysis.start).toEqual(b.analysis.start)
    expect(a.analysis.enemies).toEqual(b.analysis.enemies)
  })

  it('produces different layouts for different seeds', () => {
    const a = generate(algo, 'one', 'm', DEFAULT_PARAMS)
    const b = generate(algo, 'two', 'm', DEFAULT_PARAMS)
    expect(finalGrid(a)).not.toEqual(finalGrid(b))
  })

  it.each(SIZES.flatMap((size) => SEEDS.map((seed) => [size, seed] as const)))(
    'size %s, seed %s: walled border and every floor tile reachable',
    (size, seed) => {
      const d = generate(algo, seed, size, DEFAULT_PARAMS)
      const grid = finalGrid(d)
      const { width, height, analysis } = d

      for (let x = 0; x < width; x++) {
        expect(grid[x]).toBe(WALL)
        expect(grid[(height - 1) * width + x]).toBe(WALL)
      }
      for (let y = 0; y < height; y++) {
        expect(grid[y * width]).toBe(WALL)
        expect(grid[y * width + width - 1]).toBe(WALL)
      }

      let open = 0
      for (let i = 0; i < grid.length; i++) {
        if (isOpen(grid[i])) {
          open++
          expect(analysis.dist[i]).toBeGreaterThanOrEqual(0)
        }
      }
      expect(analysis.floorCells).toBe(open)
      expect(open).toBeGreaterThan(50)
    },
  )

  it('finds a start-to-exit path of the reported length', () => {
    const { analysis } = generate(algo, 'ember-crypt-902', 'm', DEFAULT_PARAMS)
    const { path, start, exit, maxDist } = analysis
    expect(path[0]).toEqual(start)
    expect(path.at(-1)).toEqual(exit)
    expect(path.length).toBe(maxDist + 1)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!
      const b = path[i]!
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1)
    }
    expect(maxDist).toBeGreaterThan(20)
  })

  it('places entities only on floor', () => {
    const d = generate(algo, 'shade-thorn-311', 'l', DEFAULT_PARAMS)
    const grid = finalGrid(d)
    for (const p of [...d.analysis.chests, ...d.analysis.enemies]) {
      expect(isOpen(grid[p.y * d.width + p.x])).toBe(true)
    }
    expect(d.analysis.enemies.length).toBeGreaterThanOrEqual(3)
    expect(d.analysis.chests.length).toBeGreaterThan(0)
  })
})

describe('bsp', () => {
  it('places one non-overlapping room per leaf', () => {
    const { rooms } = generate('bsp', 'iron-gloom-128', 'l', DEFAULT_PARAMS)
    expect(rooms.length).toBeGreaterThan(5)
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i]!
        const b = rooms[j]!
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap).toBe(false)
      }
    }
  })

  it('makes fewer, larger rooms with a bigger minimum leaf', () => {
    const p = (minLeaf: number) => ({ ...DEFAULT_PARAMS, bsp: { minLeaf, roomFill: 0.75 } })
    const small = generate('bsp', 'seed', 'l', p(6))
    const large = generate('bsp', 'seed', 'l', p(14))
    expect(large.rooms.length).toBeLessThan(small.rooms.length)
  })
})

describe('walk', () => {
  it('opens roughly the requested share of the map', () => {
    const d = generate('walk', 'salt-void-555', 'm', {
      ...DEFAULT_PARAMS,
      walk: { coverage: 0.4, steadiness: 0.5 },
    })
    const interior = (d.width - 2) * (d.height - 2)
    expect(d.analysis.floorCells / interior).toBeCloseTo(0.4, 1)
  })
})
