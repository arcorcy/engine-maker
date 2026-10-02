import { createSpec } from '../spec/catalog';

/** Moteur de référence, ouvert en lecture seule et point de départ des moteurs créés. */
export const REFERENCE_SPEC = createSpec('i4-dohc-16v', '1.6 16 soupapes');

/* Voiture fictive : compacte 1.6 essence, boîte 6 vitesses, pneus 205/55 R16 (circonférence de roulement 1,985 m) */
export const CAR = {
  name: 'Compacte 1.6 essence',
  gears: [0, 3.62, 1.95, 1.28, 0.95, 0.76, 0.63],
  finalDrive: 3.94,
  circ: 1.985,
  idle: 800,
} as const;

export const GEAR_LABEL = ['N', '1', '2', '3', '4', '5', '6'] as const;

export interface Preset {
  label: string;
  gear: number;
  rpm?: number;
  kmh?: number;
}

export const PRESETS: Preset[] = [
  { label: 'Ralenti', gear: 0, rpm: 800 },
  { label: '30', gear: 2, kmh: 30 },
  { label: '50', gear: 3, kmh: 50 },
  { label: '90', gear: 5, kmh: 90 },
  { label: '130', gear: 6, kmh: 130 },
];

export const SLOW_OPTIONS = [1, 10, 50, 100, 200] as const;

export const ratioOf = (gear: number) => (gear ? CAR.gears[gear] * CAR.finalDrive : 0);

export const speedKmh = (rpm: number, gear: number) => {
  const r = ratioOf(gear);
  return r ? ((rpm / 60) * CAR.circ) / r * 3.6 : 0;
};

export const rpmFor = (p: Preset) => (p.kmh ? (p.kmh / 3.6 / CAR.circ) * 60 * ratioOf(p.gear) : (p.rpm ?? CAR.idle));

export const fmt = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });

export const STROKES = ['Admission', 'Compression', 'Combustion', 'Échappement'] as const;
/** Couleurs des quatre temps, reprises dans le HUD et dans les gaz. */
export const STROKE_COLORS = ['#30b0c7', '#007aff', '#ff9500', '#8e8e93'] as const;

/** Composition des gaz, partagée par la simulation 3D et la légende de l'onglet Cycle. */
export const GAS_COLORS = {
  fresh: '#5ac8fa',
  flame: '#ff9500',
  burnt: '#a2968d',
} as const;

export const SMOKE_LABEL = { white: 'Fumée blanche', blue: 'Fumée bleutée', black: 'Fumée noire' } as const;
export type Smoke = keyof typeof SMOKE_LABEL;
