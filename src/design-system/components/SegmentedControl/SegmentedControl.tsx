import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import s from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nom accessible du groupe. */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Choix exclusif entre deux à cinq options, avec un curseur qui glisse vers la sélection. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = 'md', className }: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const el = root.children[index + 1] as HTMLElement | undefined;
      if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [index, options.length]);

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = options[(index + d + options.length) % options.length];
    onChange(next.value);
    (ref.current?.children[((index + d + options.length) % options.length) + 1] as HTMLElement | undefined)?.focus();
  };

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx(s.root, size === 'sm' && s.sm, className)} onKeyDown={onKey}>
      <span
        className={s.thumb}
        aria-hidden="true"
        style={thumb ? { width: thumb.w, transform: `translateX(${thumb.x}px)` } : { opacity: 0 }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={s.item}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
