import { useId, type CSSProperties, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import s from './Slider.module.css';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  /** Valeur affichée à droite du libellé. Sans elle, aucune valeur n'est affichée. */
  valueLabel?: string;
  /** Libellé et curseur sur une seule ligne. */
  inline?: boolean;
  /** Masque le libellé visuellement (il reste lu par les lecteurs d'écran). */
  hideLabel?: boolean;
  tone?: 'accent' | 'danger' | 'neutral';
}

export function Slider({
  label, value, min = 0, max = 100, step = 1, onChange, valueLabel, inline, hideLabel, tone = 'accent', className, style, ...rest
}: SliderProps) {
  const id = useId();
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className={cx(s.root, inline && s.inline, className)} style={style}>
      {!hideLabel && (
        <div className={s.head}>
          <label htmlFor={id}>{label}</label>
          {valueLabel && <output htmlFor={id} className={s.value}>{valueLabel}</output>}
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={hideLabel ? label : undefined}
        aria-valuetext={valueLabel}
        onChange={(e) => onChange(+e.target.value)}
        className={cx(s.input, tone !== 'accent' && s[tone])}
        style={{ '--_p': `${p}%` } as CSSProperties}
        {...rest}
      />
    </div>
  );
}
