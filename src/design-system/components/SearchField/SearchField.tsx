import { useRef, type InputHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import { cx } from '../../utils/cx';
import s from './SearchField.module.css';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  /** Nom accessible. Le placeholder ne suffit pas. */
  label: string;
}

export function SearchField({ value, onChange, label, placeholder = 'Rechercher', className, ...rest }: SearchFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cx(s.root, className)}>
      <Icon name="search" size={16} className={s.lead} />
      <input
        ref={ref}
        type="search"
        className={s.input}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }}
        {...rest}
      />
      {value && (
        <button type="button" className={s.clear} aria-label="Effacer la recherche" onClick={() => { onChange(''); ref.current?.focus(); }}>
          <Icon name="closeCircle" size={16} />
        </button>
      )}
    </div>
  );
}
