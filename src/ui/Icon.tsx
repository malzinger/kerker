const PATHS = {
  logo: 'M4 4h6v4H8v4h4V8h-2V4h10v6h-4v4h4v6H4zm4 12v-2h4v2z',
  play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
  pause: 'M7 5h3.5v14H7zm6.5 0H17v14h-3.5z',
  prev: 'M15.5 6 9.5 12l6 6',
  next: 'M8.5 6l6 6-6 6',
  first: 'M17 6l-6 6 6 6M7 6v12',
  last: 'M7 6l6 6-6 6M17 6v12',
  dice: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14',
  github:
    'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z',
} as const

const FILLED = new Set<IconName>(['logo', 'play', 'pause', 'github'])

export type IconName = keyof typeof PATHS

export function Icon({ name }: { name: IconName }) {
  const filled = FILLED.has(name)
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
      {name === 'dice' && (
        <g fill="currentColor" stroke="none">
          <circle cx="8.5" cy="8.5" r="1.4" />
          <circle cx="15.5" cy="15.5" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
        </g>
      )}
    </svg>
  )
}
