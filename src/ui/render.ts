import { isOpen } from '../core/grid'
import { CORRIDOR, type Dungeon, type Point, type Rect } from '../core/types'

export interface Overlays {
  heat: boolean
  path: boolean
  entities: boolean
  partitions: boolean
}

const C = {
  wall: '#0a0b10',
  wallEdge: '#1c1d29',
  floor: '#47425c',
  corridor: '#36324a',
  changed: '#8b5cf6',
  partition: 'rgba(167, 139, 250, 0.32)',
  highlight: '#a78bfa',
  highlightFill: 'rgba(167, 139, 250, 0.14)',
  walker: '#f5f3ff',
  path: '#fbbf24',
  start: '#34d399',
  exit: '#c084fc',
  chest: '#fbbf24',
  enemy: '#f87171',
}

/** Teal → violet → amber; near the start is cool, the far end is warm. */
export const HEAT_STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [45, 180, 170],
  [139, 92, 246],
  [251, 191, 36],
]

function heatColor(t: number): string {
  const seg = Math.min(HEAT_STOPS.length - 2, Math.floor(t * (HEAT_STOPS.length - 1)))
  const local = t * (HEAT_STOPS.length - 1) - seg
  const a = HEAT_STOPS[seg] as readonly [number, number, number]
  const b = HEAT_STOPS[seg + 1] as readonly [number, number, number]
  const mix = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * local)
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`
}

export function drawDungeon(
  ctx: CanvasRenderingContext2D,
  d: Dungeon,
  frameIndex: number,
  overlays: Overlays,
  cssWidth: number,
): void {
  const cell = cssWidth / d.width
  const cssHeight = cell * d.height
  const frame = d.frames[frameIndex]
  if (!frame) return
  const prev = frameIndex > 0 ? d.frames[frameIndex - 1] : undefined
  const isFinal = frameIndex === d.frames.length - 1
  const { grid } = frame
  const w = d.width
  const gap = cell >= 9 ? 1 : 0

  ctx.fillStyle = C.wall
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  const heat = isFinal && overlays.heat && d.analysis.maxDist > 0
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const tile = grid[i]
      let color: string | undefined
      if (isOpen(tile)) {
        const dist = d.analysis.dist[i] as number
        if (heat && dist >= 0) color = heatColor(dist / d.analysis.maxDist)
        else if (!isFinal && prev && !isOpen(prev.grid[i])) color = C.changed
        else color = tile === CORRIDOR ? C.corridor : C.floor
      } else if (touchesOpen(grid, w, d.height, x, y)) {
        color = C.wallEdge
      }
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap)
      }
    }
  }

  if (frame.partitions && (overlays.partitions || !isFinal)) {
    ctx.strokeStyle = C.partition
    ctx.lineWidth = 1
    for (const r of frame.partitions) strokeRect(ctx, r, cell)
  }

  if (frame.highlight && !isFinal) {
    for (const r of frame.highlight) {
      ctx.fillStyle = C.highlightFill
      ctx.fillRect(r.x * cell, r.y * cell, r.w * cell, r.h * cell)
      ctx.strokeStyle = C.highlight
      ctx.lineWidth = 2
      strokeRect(ctx, r, cell)
    }
  }

  if (frame.walker && !isFinal) {
    dot(ctx, frame.walker, cell, cell * 0.9, C.walker, 12)
  }

  if (!isFinal) return

  const { analysis } = d
  if (overlays.path && analysis.path.length > 1) {
    ctx.strokeStyle = C.path
    ctx.globalAlpha = 0.85
    ctx.lineWidth = Math.max(1.5, cell * 0.28)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.setLineDash([cell * 0.6, cell * 0.5])
    ctx.beginPath()
    analysis.path.forEach((p, i) => {
      const cx = (p.x + 0.5) * cell
      const cy = (p.y + 0.5) * cell
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    })
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  if (overlays.entities) {
    for (const p of analysis.chests) square(ctx, p, cell, C.chest)
    for (const p of analysis.enemies) dot(ctx, p, cell, cell * 0.75, C.enemy, 0)
    dot(ctx, analysis.start, cell, cell * 1.6, C.start, 14)
    diamond(ctx, analysis.exit, cell, cell * 1.7, C.exit)
  }
}

function touchesOpen(grid: Uint8Array, w: number, h: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && isOpen(grid[ny * w + nx])) return true
    }
  }
  return false
}

function strokeRect(ctx: CanvasRenderingContext2D, r: Rect, cell: number) {
  ctx.strokeRect(r.x * cell + 0.5, r.y * cell + 0.5, r.w * cell - 1, r.h * cell - 1)
}

function dot(
  ctx: CanvasRenderingContext2D,
  p: Point,
  cell: number,
  size: number,
  color: string,
  glow: number,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = glow
  ctx.beginPath()
  ctx.arc((p.x + 0.5) * cell, (p.y + 0.5) * cell, Math.max(2, size / 2), 0, Math.PI * 2)
  ctx.fill()
  // A dark ring keeps small markers readable on top of the bright distance field.
  ctx.shadowBlur = 0
  ctx.strokeStyle = C.wall
  ctx.lineWidth = 1.25
  ctx.stroke()
  ctx.restore()
}

function square(ctx: CanvasRenderingContext2D, p: Point, cell: number, color: string) {
  const s = Math.max(3, cell * 0.7)
  ctx.fillStyle = color
  ctx.fillRect((p.x + 0.5) * cell - s / 2, (p.y + 0.5) * cell - s / 2, s, s)
  ctx.strokeStyle = '#0a0b10'
  ctx.lineWidth = 1
  ctx.strokeRect((p.x + 0.5) * cell - s / 2, (p.y + 0.5) * cell - s / 2, s, s)
}

function diamond(
  ctx: CanvasRenderingContext2D,
  p: Point,
  cell: number,
  size: number,
  color: string,
) {
  const cx = (p.x + 0.5) * cell
  const cy = (p.y + 0.5) * cell
  const r = Math.max(3, size / 2)
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r, cy)
  ctx.lineTo(cx, cy + r)
  ctx.lineTo(cx - r, cy)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
