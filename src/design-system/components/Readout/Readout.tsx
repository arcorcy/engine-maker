import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './Readout.module.css';

export interface ReadoutProps {
  value: ReactNode;
  unit?: string;
  label?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'accent' | 'danger';
  className?: string;
}

/** Valeur chiffrée mise en avant, à chasse fixe pour ne pas trembler quand elle change. */
export function Readout({ value, unit, label, size = 'md', tone = 'primary', className }: ReadoutProps) {
  return (
    <div className={cx(s.root, s[size], tone !== 'primary' && s[tone], className)}>
      <span className={s.value}>
        {value}
        {unit && <span className={s.unit}>{unit}</span>}
      </span>
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
}
