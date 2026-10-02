import { STROKE_COLORS, STROKES } from '../../engine/data/vehicle';
import { useEngine, useTelemetry } from '../state/store';
import s from './StrokeHud.module.css';

/** Temps moteur de chaque cylindre et pression, en haut de la vue. */
export function StrokeHud() {
  const on = useEngine((st) => (st.play || st.gas) && st.explode < 0.05 && !st.iso);
  const gas = useEngine((st) => st.gas);
  const { psi, strokes, pressures } = useTelemetry();

  return (
    <div className={s.hud} data-on={on} aria-hidden={!on}>
      {strokes.map((st, i) => (
        <div key={i} className={s.cyl} data-fire={st === 2}>
          <span className={s.n} style={{ background: STROKE_COLORS[st] }} title={`Cylindre ${i + 1}`}>
            {i + 1}
          </span>
          <span className={s.stroke}>{STROKES[st]}</span>
          {gas && <span className={s.bar}>{pressures[i]} bar</span>}
        </div>
      ))}
      <span className={s.angle}>{Math.round(psi)}° / 720°</span>
    </div>
  );
}
