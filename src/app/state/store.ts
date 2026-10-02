import { create } from 'zustand';
import { FAIL } from '../../engine/data/failures';
import { PART, PARTS } from '../../engine/data/parts';
import type { SystemId } from '../../engine/data/systems';
import { CAR, clampRpm, rpmFor, type Preset } from '../../engine/data/vehicle';

export type Tab = 'parts' | 'fails';
export type ColorMode = 'materials' | 'systems';
export type InspectorTab = 'detail' | 'cycle' | 'drive';
export type Side = 'intake' | 'exhaust';
export type Isolation = { type: 'part'; id: string } | { type: 'sys'; id: SystemId } | null;

interface ViewFlags {
  xray: boolean;
  cut: boolean;
  gas: boolean;
  play: boolean;
  explode: number;
}

export interface EngineState extends ViewFlags {
  tab: Tab;
  query: string;
  sel: string | null;
  fail: string | null;
  hover: string | null;
  iso: Isolation;
  hidden: string[];
  colorMode: ColorMode;
  rpm: number;
  gear: number;
  slow: number;
  /** Réglages de vue mémorisés avant l'ouverture d'une panne, restaurés à sa fermeture. */
  pre: ViewFlags | null;
  /** Demande de cadrage caméra ; n change à chaque demande. */
  fit: { ids: string[]; minRad: number; n: number };
  panels: { library: boolean; inspector: boolean };
  inspectorTab: InspectorTab;
  /** Côté du moteur face à la caméra ; n change à chaque demande de rotation. */
  side: { value: Side; n: number };
}

interface Actions {
  setTab: (t: Tab) => void;
  setQuery: (q: string) => void;
  selectPart: (id: string) => void;
  selectFail: (id: string) => void;
  clear: () => void;
  setHover: (id: string | null) => void;
  toggleHidden: (id: string) => void;
  hide: (id: string) => void;
  isolateSystem: (id: SystemId) => void;
  isolateSelectedPart: () => void;
  isolateSelectedSystem: () => void;
  showAll: () => void;
  toggle: (k: 'xray' | 'cut' | 'gas' | 'play') => void;
  setExplode: (v: number) => void;
  setColorMode: (m: ColorMode) => void;
  setRpm: (v: number) => void;
  setGear: (g: number) => void;
  applyPreset: (p: Preset) => void;
  setSlow: (s: number) => void;
  fitView: () => void;
  togglePanel: (p: 'library' | 'inspector', open?: boolean) => void;
  setInspectorTab: (t: InspectorTab) => void;
  setSide: (side: Side) => void;
  demoExplode: () => void;
  demoCycle: () => void;
}

const ALL_IDS = PARTS.map((p) => p.id);

export function isPartVisible(s: Pick<EngineState, 'hidden' | 'iso'>, id: string) {
  if (s.hidden.includes(id)) return false;
  if (s.iso) return s.iso.type === 'part' ? id === s.iso.id : PART[id].sys === s.iso.id;
  return true;
}

export const visibleIds = (s: Pick<EngineState, 'hidden' | 'iso'>) => ALL_IDS.filter((id) => isPartVisible(s, id));
const systemIds = (sys: SystemId) => PARTS.filter((p) => p.sys === sys).map((p) => p.id);

export const useEngine = create<EngineState & Actions>()((set, get) => {
  const fit = (ids: string[], minRad = 4.5) => ({ fit: { ids, minRad, n: get().fit.n + 1 } });
  const restore = (s: EngineState): Partial<EngineState> => (s.pre ? { ...s.pre, pre: null } : {});
  const flags = (s: EngineState): ViewFlags => ({ xray: s.xray, cut: s.cut, gas: s.gas, play: s.play, explode: s.explode });

  return {
    tab: 'parts',
    query: '',
    sel: null,
    fail: null,
    hover: null,
    iso: null,
    hidden: [],
    colorMode: 'materials',
    xray: false,
    cut: true,
    gas: true,
    play: false,
    explode: 0,
    rpm: 1200,
    gear: 0,
    slow: 100,
    pre: null,
    fit: { ids: ALL_IDS, minRad: 5, n: 0 },
    panels: { library: true, inspector: true },
    inspectorTab: 'detail',
    side: { value: 'intake', n: 0 },

    setTab: (tab) => set({ tab, query: '' }),
    setQuery: (query) => set({ query }),

    selectPart: (id) =>
      set((s) => ({ ...restore(s), fail: null, sel: id, ...fit([id], 4.5), panels: { ...s.panels, inspector: true }, inspectorTab: 'detail' })),

    selectFail: (id) =>
      set((s) => {
        const f = FAIL[id];
        const sc = f.scene;
        return {
          pre: s.pre ?? flags(s),
          sel: null,
          fail: id,
          tab: 'fails',
          xray: !!sc.xray,
          cut: !!sc.cut,
          gas: !!sc.gas,
          play: !!sc.play,
          explode: sc.ex ?? 0,
          ...fit([...f.parts, ...(sc.frame ?? [])], 5),
          side: sc.view === 'exhaust' ? { value: 'exhaust', n: s.side.n + 1 } : s.side,
          panels: { ...s.panels, inspector: true },
          inspectorTab: 'detail',
        };
      }),

    clear: () =>
      set((s) => {
        const iso = s.iso && !s.sel && !s.fail ? null : s.iso;
        return { ...restore(s), sel: null, fail: null, iso, ...fit(visibleIds({ hidden: s.hidden, iso }), 5) };
      }),

    setHover: (hover) => set({ hover }),

    toggleHidden: (id) =>
      set((s) => {
        const hidden = s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id];
        return { hidden, sel: s.sel === id && hidden.includes(id) ? null : s.sel };
      }),

    hide: (id) => set((s) => ({ hidden: [...new Set([...s.hidden, id])], sel: null })),

    isolateSystem: (id) =>
      set((s) => {
        const on = s.iso?.type === 'sys' && s.iso.id === id;
        const iso: Isolation = on ? null : { type: 'sys', id };
        return { iso, ...fit(on ? visibleIds({ hidden: s.hidden, iso: null }) : systemIds(id), 5) };
      }),

    isolateSelectedPart: () =>
      set((s) => {
        if (!s.sel) return {};
        const iso: Isolation = s.iso?.type === 'part' ? null : { type: 'part', id: s.sel };
        return { iso, ...fit(iso ? [s.sel] : visibleIds({ hidden: s.hidden, iso }), 4.5) };
      }),

    isolateSelectedSystem: () =>
      set((s) => {
        if (!s.sel) return {};
        const sys = PART[s.sel].sys;
        const iso: Isolation = s.iso?.type === 'sys' ? null : { type: 'sys', id: sys };
        return { iso, ...fit(iso ? systemIds(sys) : visibleIds({ hidden: s.hidden, iso }), 5) };
      }),

    showAll: () => set((s) => ({ ...restore(s), hidden: [], iso: null, sel: null, fail: null, ...fit(ALL_IDS, 5) })),

    toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<EngineState>),

    setExplode: (explode) => set({ explode }),
    setColorMode: (colorMode) => set({ colorMode }),
    setRpm: (v) => set({ rpm: clampRpm(v) }),
    setGear: (gear) => set({ gear }),
    applyPreset: (p) => set({ gear: p.gear, rpm: Math.min(CAR.redline, Math.max(CAR.idle, Math.round(rpmFor(p)))) }),
    setSlow: (slow) => set({ slow }),

    fitView: () =>
      set((s) => {
        const f = s.fail ? FAIL[s.fail] : null;
        return fit(f ? [...f.parts, ...(f.scene.frame ?? [])] : s.sel ? [s.sel] : visibleIds(s), 4.5);
      }),

    togglePanel: (p, open) =>
      set((s) => {
        const panels = { ...s.panels, [p]: open ?? !s.panels[p] };
        if (panels[p] === s.panels[p]) return {};
        return { panels, fit: { ...s.fit, n: s.fit.n + 1 } };
      }),
    setSide: (value) => set((s) => ({ side: { value, n: s.side.n + 1 }, fit: { ...s.fit, n: s.fit.n + 1 } })),
    setInspectorTab: (inspectorTab) => set((s) => ({ inspectorTab, panels: { ...s.panels, inspector: true } })),

    demoExplode: () => set((s) => ({ explode: 1, ...fit(visibleIds(s), 5) })),
    demoCycle: () =>
      set(() => ({ play: true, gas: true, cut: true, explode: 0, gear: 0, rpm: 800, ...fit(['bloc', 'culasse', 'piston', 'vilo'], 5) })),
  };
});

/** Grandeurs qui changent à chaque image, publiées par la scène environ dix fois par seconde. */
export interface Telemetry {
  psi: number;
  strokes: number[];
  pressures: number[];
  /** Pression enregistrée sur le cycle de chaque cylindre : 4 × 180 cases de 4°. */
  trace: number[];
  /** Chaleur de chaque tubulure d'échappement, de 0 à 1 environ. */
  heat: number[];
}

export const useTelemetry = create<Telemetry>()(() => ({
  psi: 0,
  strokes: [0, 3, 1, 2],
  pressures: [1, 1, 1, 1],
  trace: new Array(720).fill(1),
  heat: [0, 0, 0, 0],
}));
