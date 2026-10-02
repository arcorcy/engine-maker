import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import s from './NumberField.module.css';

export interface NumberFieldProps {
  /** Nom accessible. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Pas des flèches du clavier ; Maj multiplie par dix. */
  step?: number;
  /** Unité affichée après la valeur. */
  unit?: string;
  /** Largeur du champ de saisie, en caractères. */
  digits?: number;
  tone?: 'primary' | 'danger';
  className?: string;
  style?: CSSProperties;
}

const format = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const parse = (t: string) => Number(t.replace(/[\s  ]/g, '').replace(',', '.'));

/**
 * Saisie d'une valeur numérique bornée. La valeur est validée à Entrée ou en quittant le champ,
 * ramenée dans les bornes ; Échap annule. Les flèches haut et bas ajustent du pas.
 */
export function NumberField({
  label, value, onChange, min = -Infinity, max = Infinity, step = 1, unit, digits = 5, tone = 'primary', className, style,
}: NumberFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  useEffect(() => {
    if (!editing && ref.current) ref.current.value = format(value);
  }, [value, editing]);

  const parsed = editing ? parse(draft) : value;
  const invalid = editing && (draft.trim() === '' || !Number.isFinite(parsed));

  const commit = () => {
    if (!editing) return;
    if (!invalid) onChange(Math.round(clamp(parsed)));
    setDraft(null);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      ref.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(null);
      ref.current?.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const base = editing && !invalid ? parsed : value;
      const next = Math.round(clamp(base + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)));
      onChange(next);
      setDraft(String(next));
      e.currentTarget.value = String(next);
    }
  };

  return (
    <label className={cx(s.root, tone === 'danger' && s.danger, invalid && s.invalid, className)} style={style}>
      <input
        ref={ref}
        className={s.input}
        style={{ width: `${digits + 0.5}ch` }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuetext={unit ? `${format(value)} ${unit}` : undefined}
        aria-invalid={invalid || undefined}
        defaultValue={format(value)}
        onFocus={(e) => {
          setDraft(String(value));
          e.currentTarget.value = String(value);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
      />
      {unit && <span className={s.unit}>{unit}</span>}
    </label>
  );
}
