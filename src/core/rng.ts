/** Hashes a seed string to a 32-bit integer (cyrb-style mixing). */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** Small, fast, deterministic PRNG (mulberry32). Same seed, same dungeon. */
export class Rng {
  private state: number

  constructor(seed: string) {
    this.state = hashSeed(seed)
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)]
    if (item === undefined) throw new Error('pick() on empty array')
    return item
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      const a = items[i] as T
      items[i] = items[j] as T
      items[j] = a
    }
    return items
  }
}

const WORDS = [
  'ash',
  'bone',
  'crypt',
  'dusk',
  'ember',
  'frost',
  'gloom',
  'hollow',
  'iron',
  'moss',
  'night',
  'onyx',
  'rust',
  'salt',
  'shade',
  'stone',
  'thorn',
  'vault',
  'wyrm',
  'void',
]

/** A readable random seed like "moss-vault-417". */
export function randomSeed(): string {
  const r = () => Math.floor(Math.random() * WORDS.length)
  return `${WORDS[r()]}-${WORDS[r()]}-${Math.floor(Math.random() * 900) + 100}`
}
