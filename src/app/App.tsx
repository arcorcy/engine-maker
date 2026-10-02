import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, Text } from '@ds';
import { REFERENCE_SPEC } from '../engine/data/vehicle';
import { EngineScene } from '../engine/scene/EngineScene';
import { HoverTip } from './components/HoverTip';
import { Inspector } from './components/Inspector';
import { Library } from './components/Library';
import { StrokeHud } from './components/StrokeHud';
import { TopBar } from './components/TopBar';
import { ViewToolbar } from './components/ViewToolbar';
import { PANEL } from './layout';
import { useEngine } from './state/store';
import { Garage } from './garage/Garage';
import { useGarage } from './garage/garageStore';
import { navigate, useRoute, type Route } from './router';
import s from './App.module.css';

const layoutVars = {
  '--panel-library': `${PANEL.library}px`,
  '--panel-inspector': `${PANEL.inspector}px`,
  '--panel-gap': `${PANEL.gap}px`,
  '--panel-top': `${PANEL.top}px`,
} as CSSProperties;

/**
 * Charge dans le store le moteur demandé par l'adresse, puis enregistre ses changements au fil de l'eau.
 * Le moteur de référence est chargé en lecture seule.
 */
function useEngineFromRoute(route: Route): 'loading' | 'ready' | 'missing' {
  const { loaded, load } = useGarage();
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const key = route.name === 'engine' ? route.id : route.name;

  useEffect(() => {
    if (route.name === 'reference') {
      useEngine.getState().loadEngine(null, REFERENCE_SPEC, true);
      setStatus('ready');
      return;
    }
    if (route.name !== 'engine') return;
    if (!loaded) {
      setStatus('loading');
      load();
      return;
    }
    const rec = useGarage.getState().records.find((r) => r.id === route.id);
    if (!rec) {
      setStatus('missing');
      return;
    }
    useEngine.getState().loadEngine(rec.id, rec.spec, false);
    setStatus('ready');
    // le moteur ne se recharge que si l'adresse change, pas à chaque enregistrement
  }, [key, loaded]);

  /* enregistrement automatique, regroupé : une modification n'écrit qu'après 400 ms de calme */
  useEffect(() => {
    let timer = 0;
    let pending: { id: string; spec: typeof REFERENCE_SPEC } | null = null;
    const flush = () => {
      if (!pending) return;
      const { id, spec } = pending;
      pending = null;
      useGarage.getState().save(id, spec);
    };
    const unsub = useEngine.subscribe((st, prev) => {
      if (st.spec === prev.spec || st.readOnly || !st.engineId || st.engineId !== prev.engineId) return;
      pending = { id: st.engineId, spec: st.spec };
      clearTimeout(timer);
      timer = window.setTimeout(flush, 400);
    });
    return () => {
      unsub();
      clearTimeout(timer);
      flush();
    };
  }, []);

  return status;
}

/** Vue 3D du moteur affiché, où l'on remplace ses pièces. */
function Viewer({ route }: { route: Route }) {
  const status = useEngineFromRoute(route);
  if (status === 'missing') {
    return (
      <div className={s.missing}>
        <Text variant="title-2">Moteur introuvable</Text>
        <Text variant="callout" tone="secondary">Il a peut-être été supprimé, ou créé dans un autre navigateur.</Text>
        <Button variant="primary" icon="grid" onClick={() => navigate({ name: 'garage' })}>Mes moteurs</Button>
      </div>
    );
  }
  if (status === 'loading') return <div className={s.app} />;
  return <Stage />;
}

function Stage() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = new EngineScene(canvas.current!, stage.current!);
    return () => scene.dispose();
  }, []);

  /* panneaux repliés d'office sur petit écran */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => {
      const { togglePanel } = useEngine.getState();
      togglePanel('library', !mq.matches);
      togglePanel('inspector', !mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Échap referme la sélection en cours ; ⌘Z et ⇧⌘Z annulent et rétablissent un remplacement */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useEngine.getState();
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (st.sel || st.fail || st.iso) st.clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={stage} className={s.app} style={layoutVars}>
      <canvas
        ref={canvas}
        className={s.canvas}
        tabIndex={0}
        aria-label="Maquette 3D du moteur. Glisser pour tourner, molette pour zoomer, Maj + glisser pour déplacer, flèches du clavier pour orbiter."
      />
      <TopBar />
      <StrokeHud />
      <Library />
      <Inspector />
      <ViewToolbar />
      <HoverTip />
    </div>
  );
}

export function App() {
  const route = useRoute();
  const name = useEngine((st) => st.spec.name);
  useEffect(() => {
    document.title = route.name === 'garage' ? 'Mes moteurs · Anatomie moteur' : `${name} · Anatomie moteur`;
  }, [route.name, name]);
  if (route.name === 'garage') return <Garage />;
  return <Viewer route={route} />;
}
