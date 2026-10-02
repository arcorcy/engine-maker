import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import s from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Masque le libellé visuellement (il reste lu par les lecteurs d'écran). */
  hideLabel?: boolean;
  /** title : champ qui se présente comme un titre, pour renommer sur place. */
  variant?: 'default' | 'title';
  /** Message d'erreur affiché sous le champ. */
  error?: string;
}

export function TextField({ label, value, onChange, hideLabel, variant = 'default', error, className, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <div className={cx(s.root, variant === 'title' && s.title, error && s.invalid, className)}>
      {!hideLabel && (
        <label htmlFor={id} className={s.label}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={s.input}
        value={value}
        aria-label={hideLabel ? label : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {error && (
        <span id={`${id}-err`} className={s.message}>
          {error}
        </span>
      )}
    </div>
  );
}
