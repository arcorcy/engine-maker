import { useEffect, useRef, type CSSProperties } from 'react';
import { EngineScene } from '../engine/scene/EngineScene';
import { HoverTip } from './components/HoverTip';
import { Inspector } from './components/Inspector';
import { Library } from './components/Library';
import { StrokeHud } from './components/StrokeHud';
import { TopBar } from './components/TopBar';
import { ViewToolbar } from './components/ViewToolbar';
import { PANEL } from './layout';
import { useEngine } from './state/store';
import s from './App.module.css';

const layoutVars = {
  '--panel-library': `${PANEL.library}px`,
  '--panel-inspector': `${PANEL.inspector}px`,
  '--panel-gap': `${PANEL.gap}px`,
  '--panel-top': `${PANEL.top}px`,
} as CSSProperties;

export function App() {
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

  /* Échap referme la sélection en cours */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const st = useEngine.getState();
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
