/* Pictogrammes au trait 1.6, grille 24, dans l'esprit des SF Symbols */
import type { ReactNode } from 'react';

export const icons = {
  play: <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z" fill="currentColor" stroke="none" />,
  pause: (
    <g fill="currentColor" stroke="none">
      <rect x="6.5" y="5" width="3.6" height="14" rx="1" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1" />
    </g>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  closeCircle: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="var(--color-bg-elevated, #fff)" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeSlash: (
    <>
      <path d="M4 4l16 16M10.4 5.7c.5-.1 1-.2 1.6-.2 6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.6 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  cut: (
    <>
      <path d="M12 3v18" strokeDasharray="2 2.5" />
      <path d="M8.5 6.5H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
      <path d="M15.5 6.5h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3" opacity=".45" />
    </>
  ),
  xray: (
    <>
      <rect x="4" y="4" width="11" height="11" rx="2.5" />
      <rect x="9" y="9" width="11" height="11" rx="2.5" opacity=".5" />
    </>
  ),
  gas: (
    <>
      <circle cx="7.5" cy="15.5" r="2.5" />
      <circle cx="15.5" cy="16.5" r="1.8" />
      <circle cx="12.5" cy="8.5" r="3.2" />
      <circle cx="18.5" cy="9.5" r="1.3" />
    </>
  ),
  explode: (
    <>
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    </>
  ),
  fit: (
    <>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v3.8h3.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  sidebarLeft: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M9 4.5v15M5.5 8h1.5M5.5 11h1.5" />
    </>
  ),
  sidebarRight: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M15 4.5v15M17 8h1.5M17 11h1.5" />
    </>
  ),
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.7 2.7L16 9.7" />
    </>
  ),
  errorCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2v.1" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
      <path d="M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4.5 9.5 9 5" />
      <path d="M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l4.5-4.5L15 5" />
      <path d="M19.5 9.5H9a4.5 4.5 0 0 0 0 9h3" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.1" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 4.3L2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5M12 17v.1" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l9 4.8-9 4.8-9-4.8 9-4.8z" />
      <path d="M3 12.2l9 4.8 9-4.8M3 16.2l9 4.8 9-4.8" opacity=".55" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4-5.5" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
    </>
  ),
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2zM14.5 6.5l3-3a4 4 0 0 0-3 3z" />,
  orbit: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="4.5" />
      <path d="M18.5 8.6l1.9-.4-.5 1.9" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  flame: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.6-5 3.4-8.4.2-.8 1.2-1 1.6-.3 2.5 3.6 7 5.6 7 8.7 0 3.2-2.4 5.6-6 5.6zM12 21c-1.5 0-2.6-1-2.6-2.5 0-1.8 1.6-2.6 2.6-4.3 1 1.7 2.6 2.5 2.6 4.3 0 1.5-1.1 2.5-2.6 2.5z" />,
  more: (
    <g fill="currentColor" stroke="none">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </g>
  ),
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;
