import type { Caption } from '../core/types'

export type Lang = 'de' | 'en'

export function detectLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'de' || param === 'en') return param
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

const de = {
  tagline: 'Prozedurale Dungeons, Schritt für Schritt. Gleicher Seed, gleicher Dungeon.',
  algorithm: 'Algorithmus',
  algos: {
    bsp: 'Räume',
    caves: 'Höhlen',
    walk: 'Tunnel',
  },
  algoTech: {
    bsp: 'Binary Space Partitioning',
    caves: 'Zellulärer Automat',
    walk: 'Drunkard’s Walk',
  },
  how: {
    bsp: 'Die Karte wird rekursiv in Rechtecke geteilt, bis jedes Stück die Mindestgröße erreicht. In jedes Blatt kommt ein Raum. Danach läuft der Algorithmus den Baum zurück nach oben und verbindet jedes Geschwisterpaar mit einem Gang. So ist jeder Raum garantiert erreichbar.',
    caves:
      'Zufallsrauschen wird mehrmals geglättet: Eine Zelle wird Wand, wenn mehr als vier ihrer acht Nachbarn Wände sind, und Boden, wenn es weniger sind. Aus Rauschen entstehen so organische Höhlen. Zum Schluss füllt ein Flood-Fill alle abgeschnittenen Taschen auf.',
    walk: 'Ein einzelner Gräber startet in der Mitte und torkelt zufällig umher, bis der gewünschte Anteil der Karte offen ist. „Stetigkeit“ ist die Chance, die Richtung zu halten: niedrig ergibt Kavernen, hoch lange, gewundene Tunnel.',
  },
  seed: 'Seed',
  newSeed: 'Neuer Seed',
  size: 'Größe',
  params: {
    minLeaf: 'Mindestgröße Teilstück',
    roomFill: 'Raumgröße',
    fill: 'Anfangsdichte Wände',
    iterations: 'Glättungsdurchläufe',
    coverage: 'Offene Fläche',
    steadiness: 'Stetigkeit',
  },
  overlays: 'Ebenen',
  overlay: {
    heat: 'Distanzfeld',
    path: 'Kritischer Pfad',
    entities: 'Start, Ziel & Inhalte',
    partitions: 'BSP-Partitionen',
  },
  play: 'Abspielen',
  pause: 'Pause',
  back: 'Schritt zurück',
  forward: 'Schritt vor',
  restart: 'Von vorn',
  toEnd: 'Zum Ergebnis',
  timeline: 'Zeitleiste',
  speed: 'Tempo',
  step: (i: number, n: number) => `Schritt ${i} / ${n}`,
  share: 'Link teilen',
  copied: 'Link kopiert',
  png: 'Als PNG',
  stats: {
    floor: 'Begehbar',
    rooms: 'Räume',
    path: 'Weg Start → Ziel',
    deadEnds: 'Sackgassen',
    chests: 'Truhen',
    enemies: 'Gegner',
  },
  legend: {
    start: 'Start',
    exit: 'Ziel',
    chest: 'Truhe',
    enemy: 'Gegner',
    near: 'nah',
    far: 'fern',
  },
  keys: 'Leertaste: Play/Pause · ←/→: Schritt · N: neuer Seed',
  source: 'Quellcode',
  caption(c: Caption): string {
    switch (c.key) {
      case 'bsp.start':
        return 'Die ganze Karte ist ein einziges Rechteck.'
      case 'bsp.split':
        return `Teilung ${c.n}: Das hervorgehobene Stück wird quer zur langen Seite geschnitten.`
      case 'bsp.room':
        return `Raum ${c.n} von ${c.total}: zufällige Größe und Lage im Blatt, mit Wandabstand.`
      case 'bsp.corridor':
        return `Gang ${c.n} von ${c.total}: verbindet zwei Geschwister-Teilbäume mit einem L-förmigen Gang.`
      case 'cave.fill':
        return 'Startzustand: Jede Zelle ist zufällig Wand oder Boden.'
      case 'cave.step':
        return `Glättung ${c.n} von ${c.total}: Jede Zelle folgt der Mehrheit ihrer acht Nachbarn.`
      case 'cave.prune':
        return c.n
          ? `Flood-Fill: ${c.n} abgeschnittene Taschen aufgefüllt, nur die größte Höhle bleibt.`
          : 'Flood-Fill: Alles hängt bereits zusammen.'
      case 'walk.start':
        return 'Der Gräber steht in der Mitte der Karte.'
      case 'walk.carve':
        return `${c.n} von ${c.total} Feldern freigegraben.`
      case 'post.analyze':
        return 'Analyse: Zwei Breitensuchen finden den längsten Weg. Start und Ziel liegen an seinen Enden, Truhen in Sackgassen, Gegner weit weg vom Start.'
    }
  },
}

export type Strings = typeof de

const en: Strings = {
  tagline: 'Procedural dungeons, step by step. Same seed, same dungeon.',
  algorithm: 'Algorithm',
  algos: {
    bsp: 'Rooms',
    caves: 'Caves',
    walk: 'Tunnels',
  },
  algoTech: {
    bsp: 'Binary space partitioning',
    caves: 'Cellular automaton',
    walk: 'Drunkard’s walk',
  },
  how: {
    bsp: 'The map is split into rectangles recursively until every piece hits the minimum size. Each leaf gets one room. The algorithm then walks back up the tree and joins every pair of siblings with a corridor, so every room is guaranteed to be reachable.',
    caves:
      'Random noise is smoothed several times: a cell becomes wall when more than four of its eight neighbours are walls, and floor when fewer are. Noise melts into organic caves. A final flood fill closes every pocket that got cut off.',
    walk: 'A single digger starts in the middle and stumbles around at random until the requested share of the map is open. Steadiness is the chance to keep its direction: low gives caverns, high gives long, winding tunnels.',
  },
  seed: 'Seed',
  newSeed: 'New seed',
  size: 'Size',
  params: {
    minLeaf: 'Minimum partition size',
    roomFill: 'Room size',
    fill: 'Initial wall density',
    iterations: 'Smoothing passes',
    coverage: 'Open area',
    steadiness: 'Steadiness',
  },
  overlays: 'Layers',
  overlay: {
    heat: 'Distance field',
    path: 'Critical path',
    entities: 'Start, exit & contents',
    partitions: 'BSP partitions',
  },
  play: 'Play',
  pause: 'Pause',
  back: 'Step back',
  forward: 'Step forward',
  restart: 'Restart',
  toEnd: 'Jump to result',
  timeline: 'Timeline',
  speed: 'Speed',
  step: (i: number, n: number) => `Step ${i} / ${n}`,
  share: 'Share link',
  copied: 'Link copied',
  png: 'Save PNG',
  stats: {
    floor: 'Walkable',
    rooms: 'Rooms',
    path: 'Start → exit',
    deadEnds: 'Dead ends',
    chests: 'Chests',
    enemies: 'Enemies',
  },
  legend: {
    start: 'Start',
    exit: 'Exit',
    chest: 'Chest',
    enemy: 'Enemy',
    near: 'near',
    far: 'far',
  },
  keys: 'Space: play/pause · ←/→: step · N: new seed',
  source: 'Source',
  caption(c: Caption): string {
    switch (c.key) {
      case 'bsp.start':
        return 'The whole map is a single rectangle.'
      case 'bsp.split':
        return `Split ${c.n}: the highlighted piece is cut across its long side.`
      case 'bsp.room':
        return `Room ${c.n} of ${c.total}: random size and position inside the leaf, with a wall margin.`
      case 'bsp.corridor':
        return `Corridor ${c.n} of ${c.total}: joins two sibling subtrees with an L-shaped corridor.`
      case 'cave.fill':
        return 'Initial state: every cell is randomly wall or floor.'
      case 'cave.step':
        return `Smoothing ${c.n} of ${c.total}: every cell follows the majority of its eight neighbours.`
      case 'cave.prune':
        return c.n
          ? `Flood fill: ${c.n} cut-off pockets filled in, only the largest cave remains.`
          : 'Flood fill: everything is already connected.'
      case 'walk.start':
        return 'The digger stands in the middle of the map.'
      case 'walk.carve':
        return `${c.n} of ${c.total} tiles dug out.`
      case 'post.analyze':
        return 'Analysis: two breadth-first searches find the longest path. Start and exit sit at its ends, chests in dead ends, enemies far from the start.'
    }
  },
}

export const STRINGS: Record<Lang, Strings> = { de, en }
