import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PARAMS, generate, SIZES, type MapSize } from './core/generate'
import { randomSeed } from './core/rng'
import type { Algorithm, Params } from './core/types'
import { detectLang, STRINGS, type Lang } from './ui/i18n'
import { Icon } from './ui/Icon'
import { drawDungeon, HEAT_STOPS, type Overlays } from './ui/render'

const REPO_URL = 'https://github.com/malzinger/kerker'
/** A full playback takes about this long at 1×, however many frames the algorithm records. */
const PLAYBACK_MS = 7000
const ALGOS: Algorithm[] = ['bsp', 'caves', 'walk']
const MAP_SIZES: MapSize[] = ['s', 'm', 'l']
const SPEEDS = [0.5, 1, 2, 4]

type ParamKey = 'minLeaf' | 'roomFill' | 'fill' | 'iterations' | 'coverage' | 'steadiness'

interface SliderDef {
  key: ParamKey
  min: number
  max: number
  step: number
  format: (v: number) => string
}

const pct = (v: number) => `${Math.round(v * 100)} %`

const SLIDERS: Record<Algorithm, SliderDef[]> = {
  bsp: [
    { key: 'minLeaf', min: 6, max: 16, step: 1, format: (v) => `${v}` },
    { key: 'roomFill', min: 0.4, max: 1, step: 0.05, format: pct },
  ],
  caves: [
    { key: 'fill', min: 0.4, max: 0.55, step: 0.01, format: pct },
    { key: 'iterations', min: 0, max: 10, step: 1, format: (v) => `${v}` },
  ],
  walk: [
    { key: 'coverage', min: 0.15, max: 0.6, step: 0.05, format: pct },
    { key: 'steadiness', min: 0, max: 0.9, step: 0.05, format: pct },
  ],
}

interface Settings {
  algo: Algorithm
  seed: string
  size: MapSize
  params: Params
}

function getParam(params: Params, algo: Algorithm, key: ParamKey): number {
  return (params[algo] as unknown as Record<ParamKey, number>)[key]
}

function withParam(params: Params, algo: Algorithm, key: ParamKey, value: number): Params {
  return { ...params, [algo]: { ...params[algo], [key]: value } }
}

function readUrl(): Settings {
  const q = new URLSearchParams(location.search)
  const algoParam = q.get('algo')
  const algo = ALGOS.find((a) => a === algoParam) ?? 'bsp'
  const sizeParam = q.get('size')
  const size = MAP_SIZES.find((s) => s === sizeParam) ?? 'm'
  let params = DEFAULT_PARAMS
  for (const s of SLIDERS[algo]) {
    const raw = Number(q.get(s.key))
    if (q.has(s.key) && Number.isFinite(raw)) {
      params = withParam(params, algo, s.key, Math.min(s.max, Math.max(s.min, raw)))
    }
  }
  return { algo, size, params, seed: q.get('seed')?.slice(0, 64) || randomSeed() }
}

function writeUrl(s: Settings, lang: Lang): void {
  const q = new URLSearchParams()
  q.set('algo', s.algo)
  q.set('seed', s.seed)
  q.set('size', s.size)
  for (const def of SLIDERS[s.algo]) q.set(def.key, String(getParam(s.params, s.algo, def.key)))
  q.set('lang', lang)
  history.replaceState(null, '', `${location.pathname}?${q.toString()}`)
}

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang)
  const t = STRINGS[lang]
  const [settings, setSettings] = useState<Settings>(readUrl)
  const [reduced] = useState(prefersReducedMotion)
  // Frame index may exceed the frame count (Infinity = "show the result"); it is clamped on read.
  const [frame, setFrame] = useState(() => (reduced ? Infinity : 0))
  const [playing, setPlaying] = useState(!reduced)
  const [speed, setSpeed] = useState(1)
  const [overlays, setOverlays] = useState<Overlays>({
    heat: true,
    path: true,
    entities: true,
    partitions: false,
  })
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { algo, seed, size, params } = settings
  const dungeon = useMemo(() => generate(algo, seed, size, params), [algo, seed, size, params])
  const last = dungeon.frames.length - 1
  const idx = Math.min(frame, last)
  const isFinal = idx === last
  const isPlaying = playing && !isFinal
  const caption = dungeon.frames[idx]?.caption

  /** Applies a settings change; `replay` restarts the animation, otherwise the result is shown. */
  const update = (patch: Partial<Settings>, replay: boolean) => {
    setSettings((s) => ({ ...s, ...patch }))
    const animate = replay && !reduced
    setFrame(animate ? 0 : Infinity)
    setPlaying(animate)
  }

  const togglePlay = () => {
    if (isPlaying) {
      setPlaying(false)
    } else {
      if (isFinal) setFrame(0)
      setPlaying(true)
    }
  }

  const step = (delta: number) => {
    setPlaying(false)
    setFrame((f) => Math.max(0, Math.min(last, Math.min(f, last) + delta)))
  }

  useEffect(() => {
    if (!isPlaying) return
    const frameMs = Math.max(16, PLAYBACK_MS / dungeon.frames.length / speed)
    let raf = 0
    let prev = performance.now()
    let acc = 0
    const tick = (now: number) => {
      acc += now - prev
      prev = now
      const steps = Math.floor(acc / frameMs)
      if (steps > 0) {
        acc -= steps * frameMs
        setFrame((f) => Math.min(last, Math.min(f, last) + steps))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, speed, dungeon, last])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || width === 0) return
    const dpr = window.devicePixelRatio || 1
    const height = Math.round((width * dungeon.height) / dungeon.width)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawDungeon(ctx, dungeon, idx, overlays, width)
  }, [dungeon, idx, overlays, width])

  useEffect(() => {
    writeUrl(settings, lang)
    document.documentElement.lang = lang
  }, [settings, lang])

  // Keyboard shortcuts read the latest handlers through a ref so the listener is bound once.
  const keys = useRef({ togglePlay, step, reseed: () => update({ seed: randomSeed() }, true) })
  useEffect(() => {
    keys.current = { togglePlay, step, reseed: () => update({ seed: randomSeed() }, true) }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        keys.current.togglePlay()
      } else if (e.key === 'ArrowLeft') keys.current.step(-1)
      else if (e.key === 'ArrowRight') keys.current.step(1)
      else if (e.key === 'n' || e.key === 'N') keys.current.reseed()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt(t.share, location.href)
    }
  }

  const savePng = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `kerker-${algo}-${seed}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })
  }

  const { analysis } = dungeon
  const interior = (dungeon.width - 2) * (dungeon.height - 2)
  const heatGradient = `linear-gradient(90deg, ${HEAT_STOPS.map((c) => `rgb(${c.join(',')})`).join(', ')})`

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <Icon name="logo" />
          </span>
          <div>
            <h1>Kerker</h1>
            <p className="tagline">{t.tagline}</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="seg seg-small" role="group" aria-label="Language">
            {(['de', 'en'] as const).map((l) => (
              <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <a className="ghost-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="github" />
            <span>{t.source}</span>
          </a>
        </div>
      </header>

      <main className="layout">
        <aside className="panel">
          <section>
            <h2 className="label">{t.algorithm}</h2>
            <div className="algo-list" role="radiogroup" aria-label={t.algorithm}>
              {ALGOS.map((a) => (
                <button
                  key={a}
                  role="radio"
                  aria-checked={algo === a}
                  className="algo"
                  onClick={() => a !== algo && update({ algo: a }, true)}
                >
                  <span className="algo-name">{t.algos[a]}</span>
                  <span className="algo-tech">{t.algoTech[a]}</span>
                </button>
              ))}
            </div>
            <p className="how">{t.how[algo]}</p>
          </section>

          <section className="row-fields">
            <label className="field grow">
              <span className="label">{t.seed}</span>
              <span className="seed">
                <input
                  value={seed}
                  maxLength={64}
                  spellCheck={false}
                  onChange={(e) => update({ seed: e.target.value }, false)}
                  onKeyDown={(e) => e.key === 'Enter' && update({}, true)}
                />
                <button
                  className="icon-btn"
                  title={t.newSeed}
                  aria-label={t.newSeed}
                  onClick={() => update({ seed: randomSeed() }, true)}
                >
                  <Icon name="dice" />
                </button>
              </span>
            </label>
            <div className="field">
              <span className="label">{t.size}</span>
              <div className="seg" role="group" aria-label={t.size}>
                {MAP_SIZES.map((s) => (
                  <button
                    key={s}
                    aria-pressed={size === s}
                    title={`${SIZES[s].w} × ${SIZES[s].h}`}
                    onClick={() => update({ size: s }, false)}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="sliders">
            {SLIDERS[algo].map((s) => {
              const value = getParam(params, algo, s.key)
              return (
                <label key={s.key} className="slider">
                  <span className="slider-head">
                    <span className="label">{t.params[s.key]}</span>
                    <span className="value">{s.format(value)}</span>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={value}
                    onChange={(e) =>
                      update(
                        { params: withParam(params, algo, s.key, Number(e.target.value)) },
                        false,
                      )
                    }
                  />
                </label>
              )
            })}
          </section>

          <section>
            <h2 className="label">{t.overlays}</h2>
            <div className="toggles">
              {(Object.keys(overlays) as Array<keyof Overlays>)
                .filter((k) => k !== 'partitions' || algo === 'bsp')
                .map((k) => (
                  <label key={k} className="toggle">
                    <input
                      type="checkbox"
                      checked={overlays[k]}
                      onChange={(e) => setOverlays((o) => ({ ...o, [k]: e.target.checked }))}
                    />
                    <span className="switch" aria-hidden="true" />
                    {t.overlay[k]}
                  </label>
                ))}
            </div>
          </section>
        </aside>

        <section className="stage">
          <div className="canvas-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} role="img" aria-label={caption ? t.caption(caption) : ''} />
          </div>

          <div className="transport">
            <div className="buttons">
              <button
                className="icon-btn"
                title={t.restart}
                aria-label={t.restart}
                onClick={() => step(-Infinity)}
              >
                <Icon name="first" />
              </button>
              <button
                className="icon-btn"
                title={t.back}
                aria-label={t.back}
                onClick={() => step(-1)}
              >
                <Icon name="prev" />
              </button>
              <button
                className="play"
                title={isPlaying ? t.pause : t.play}
                aria-label={isPlaying ? t.pause : t.play}
                onClick={togglePlay}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} />
              </button>
              <button
                className="icon-btn"
                title={t.forward}
                aria-label={t.forward}
                onClick={() => step(1)}
              >
                <Icon name="next" />
              </button>
              <button
                className="icon-btn"
                title={t.toEnd}
                aria-label={t.toEnd}
                onClick={() => step(Infinity)}
              >
                <Icon name="last" />
              </button>
            </div>
            <input
              className="timeline"
              type="range"
              min={0}
              max={last}
              value={idx}
              aria-label={t.timeline}
              onChange={(e) => {
                setPlaying(false)
                setFrame(Number(e.target.value))
              }}
            />
            <span className="counter">{t.step(idx + 1, last + 1)}</span>
            <div className="seg seg-small" role="group" aria-label={t.speed}>
              {SPEEDS.map((s) => (
                <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <p className="caption" aria-live="polite">
            {caption ? t.caption(caption) : ''}
          </p>

          <dl className="stats">
            <div>
              <dt>{t.stats.floor}</dt>
              <dd>{pct(analysis.floorCells / interior)}</dd>
            </div>
            {algo === 'bsp' && (
              <div>
                <dt>{t.stats.rooms}</dt>
                <dd>{dungeon.rooms.length}</dd>
              </div>
            )}
            <div>
              <dt>{t.stats.path}</dt>
              <dd>{analysis.maxDist}</dd>
            </div>
            <div>
              <dt>{t.stats.deadEnds}</dt>
              <dd>{analysis.deadEnds}</dd>
            </div>
            <div>
              <dt>{t.stats.chests}</dt>
              <dd>{analysis.chests.length}</dd>
            </div>
            <div>
              <dt>{t.stats.enemies}</dt>
              <dd>{analysis.enemies.length}</dd>
            </div>
          </dl>

          <div className="footer-row">
            <ul className="legend">
              <li>
                <i className="lg lg-start" />
                {t.legend.start}
              </li>
              <li>
                <i className="lg lg-exit" />
                {t.legend.exit}
              </li>
              <li>
                <i className="lg lg-chest" />
                {t.legend.chest}
              </li>
              <li>
                <i className="lg lg-enemy" />
                {t.legend.enemy}
              </li>
              <li className="heat-legend">
                {t.legend.near}
                <i className="lg-heat" style={{ background: heatGradient }} />
                {t.legend.far}
              </li>
            </ul>
            <div className="actions">
              <button className="btn" onClick={share}>
                <Icon name={copied ? 'check' : 'link'} />
                {copied ? t.copied : t.share}
              </button>
              <button className="btn" onClick={savePng}>
                <Icon name="download" />
                {t.png}
              </button>
            </div>
          </div>
          <p className="keys">{t.keys}</p>
        </section>
      </main>
    </div>
  )
}
