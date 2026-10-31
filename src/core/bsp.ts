import { Recorder, type GenResult } from './grid'
import type { Rng } from './rng'
import { CORRIDOR, FLOOR, WALL, type BspParams, type Point, type Rect } from './types'

interface Node {
  rect: Rect
  left?: Node
  right?: Node
  room?: Rect
}

/**
 * Binary space partitioning: split the map into ever smaller boxes, drop one room
 * into each leaf, then walk back up the tree joining sibling subtrees with corridors.
 * Because every split gets exactly one corridor, the result is always connected.
 */
export function generateBsp(width: number, height: number, p: BspParams, rng: Rng): GenResult {
  const grid = new Uint8Array(width * height)
  const rec = new Recorder()
  const root: Node = { rect: { x: 1, y: 1, w: width - 2, h: height - 2 } }

  rec.push(grid, { key: 'bsp.start' }, { partitions: [root.rect] })

  // Breadth-first so the animation splits the whole map evenly, level by level.
  const leaves: Node[] = []
  const queue: Node[] = [root]
  let splits = 0
  while (queue.length > 0) {
    const node = queue.shift() as Node
    if (split(node, p.minLeaf, rng)) {
      splits++
      queue.push(node.left as Node, node.right as Node)
      const open = [...leaves, ...queue].map((n) => n.rect)
      rec.push(grid, { key: 'bsp.split', n: splits }, { partitions: open, highlight: [node.rect] })
    } else {
      leaves.push(node)
    }
  }

  const partitions = leaves.map((n) => n.rect)
  const rooms: Rect[] = []
  leaves.forEach((leaf, i) => {
    const room = placeRoom(leaf.rect, p.roomFill, rng)
    leaf.room = room
    rooms.push(room)
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) grid[y * width + x] = FLOOR
    }
    rec.push(
      grid,
      { key: 'bsp.room', n: i + 1, total: leaves.length },
      { partitions, highlight: [room] },
    )
  })

  const links: Array<[Rect, Rect]> = []
  collectLinks(root, rng, links)
  links.forEach(([a, b], i) => {
    const bounds = carveCorridor(grid, width, center(a), center(b), rng)
    rec.push(
      grid,
      { key: 'bsp.corridor', n: i + 1, total: links.length },
      { partitions, highlight: [bounds] },
    )
  })

  return { grid, frames: rec.frames, rooms }
}

function split(node: Node, minLeaf: number, rng: Rng): boolean {
  const { x, y, w, h } = node.rect
  const canV = w >= minLeaf * 2
  const canH = h >= minLeaf * 2
  if (!canV && !canH) return false

  // Prefer cutting across the long side so leaves stay roughly square.
  let vertical: boolean
  if (canV && !canH) vertical = true
  else if (canH && !canV) vertical = false
  else if (w / h > 1.25) vertical = true
  else if (h / w > 1.25) vertical = false
  else vertical = rng.chance(0.5)

  if (vertical) {
    const cut = rng.int(minLeaf, w - minLeaf)
    node.left = { rect: { x, y, w: cut, h } }
    node.right = { rect: { x: x + cut, y, w: w - cut, h } }
  } else {
    const cut = rng.int(minLeaf, h - minLeaf)
    node.left = { rect: { x, y, w, h: cut } }
    node.right = { rect: { x, y: y + cut, w, h: h - cut } }
  }
  return true
}

/** A room inside the leaf with at least one wall tile of padding on every side. */
function placeRoom(leaf: Rect, fill: number, rng: Rng): Rect {
  const size = (max: number) => {
    const hi = Math.max(3, Math.min(max, Math.round(max * fill)))
    const lo = Math.max(3, Math.round(hi * 0.6))
    return rng.int(Math.min(lo, hi), hi)
  }
  const maxW = leaf.w - 2
  const maxH = leaf.h - 2
  const w = size(maxW)
  const h = size(maxH)
  return {
    x: leaf.x + 1 + rng.int(0, maxW - w),
    y: leaf.y + 1 + rng.int(0, maxH - h),
    w,
    h,
  }
}

/** Post-order: link a room from the left subtree to one from the right subtree. */
function collectLinks(node: Node, rng: Rng, out: Array<[Rect, Rect]>): void {
  if (!node.left || !node.right) return
  collectLinks(node.left, rng, out)
  collectLinks(node.right, rng, out)
  out.push([pickRoom(node.left, rng), pickRoom(node.right, rng)])
}

function pickRoom(node: Node, rng: Rng): Rect {
  if (node.room) return node.room
  return pickRoom(rng.chance(0.5) ? (node.left as Node) : (node.right as Node), rng)
}

function center(r: Rect): Point {
  return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) }
}

/** L-shaped corridor; only turns wall into corridor so rooms keep their floor. */
function carveCorridor(grid: Uint8Array, width: number, a: Point, b: Point, rng: Rng): Rect {
  const carve = (x: number, y: number) => {
    if (grid[y * width + x] === WALL) grid[y * width + x] = CORRIDOR
  }
  const corner = rng.chance(0.5) ? { x: b.x, y: a.y } : { x: a.x, y: b.y }
  for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) carve(x, corner.y)
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) carve(corner.x, y)
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1,
  }
}
