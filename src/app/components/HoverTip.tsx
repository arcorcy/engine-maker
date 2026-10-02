import { useEffect, useRef } from 'react';
import { PART } from '../../engine/data/parts';
import { useEngine } from '../state/store';
import s from './HoverTip.module.css';

/** Nom de la pièce survolée, qui suit le pointeur. */
export function HoverTip() {
  const hover = useEngine((st) => st.hover);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  if (!hover) return null;
  return (
    <div
      ref={ref}
      className={s.tip}
      style={{ transform: `translate(${pos.current.x + 14}px, ${pos.current.y + 16}px)` }}
      aria-hidden="true"
    >
      {PART[hover].name}
    </div>
  );
}
