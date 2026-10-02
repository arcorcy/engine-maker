import { cx } from '../../utils/cx';
import s from './Meter.module.css';

export interface MeterProps {
  value: number;
  min?: number;
  max?: number;
  /** Seuil à partir duquel la jauge passe au rouge et la zone est matérialisée. */
  high?: number;
  label: string;
  /** accent par défaut ; neutral pour une grandeur qui n'est pas une progression. */
  tone?: 'accent' | 'neutral';
  className?: string;
}

export function Meter({ value, min = 0, max = 1, high, label, tone = 'accent', className }: MeterProps) {
  const p = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const hp = high !== undefined ? ((high - min) / (max - min)) * 100 : null;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cx(s.root, tone === 'neutral' && s.neutral, high !== undefined && value >= high && s.high, className)}
    >
      {hp !== null && <span className={s.zone} style={{ width: `${100 - hp}%` }} />}
      <span className={s.bar} style={{ width: `${p}%` }} />
    </div>
  );
}
