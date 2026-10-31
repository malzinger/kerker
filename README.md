# Kerker

Procedural dungeons you can watch being built. Pick an algorithm, scrub through every step, and share the exact dungeon by link: same seed, same dungeon.

## Algorithms

- **Rooms (binary space partitioning).** The map is split recursively until every piece reaches a minimum size, each leaf gets a room, and sibling subtrees are joined with L-shaped corridors on the way back up. Every room is reachable by construction.
- **Caves (cellular automaton).** Random noise is smoothed with a majority rule over the eight neighbours. A flood fill then removes every pocket that is not part of the largest cave.
- **Tunnels (drunkard's walk).** A single digger wanders from the centre until a target share of the map is open. Steadiness, the chance to keep its direction, moves the result from caverns to long tunnels.

After generation, two breadth-first searches find the longest shortest path. Start and exit sit at its ends, the distance field from the start is shown as a heat map, chests go into dead ends and quiet corners, and enemies are spread out away from the entrance.

## Features

- Step-by-step playback with a timeline, single steps and four speeds; every frame is recorded, so scrubbing is instant
- Seeded and deterministic (mulberry32), with the full state in the URL for sharing
- Layers for the distance field, critical path, contents and BSP partitions
- Stats for walkable area, rooms, path length, dead ends, chests and enemies
- PNG export, English and German (`?lang=en|de`), keyboard shortcuts, respects reduced motion

## Development

```bash
npm install
npm run dev
```

`npm test` runs the Vitest suite: determinism, walled borders, full connectivity, path validity and non-overlapping rooms across all algorithms, sizes and a set of seeds. `npm run build` typechecks and builds to `dist/`. CI lints, checks formatting, tests, builds and deploys to GitHub Pages.

## Stack

React 19, TypeScript (strict), Vite, Vitest, Canvas 2D. No runtime dependencies besides React.

## License

MIT © Friedrich Malz
