import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'danger' | 'warning';
  /** Pastille de couleur en tête, par exemple la couleur d'un système. */
  dot?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(s.root, tone !== 'neutral' && s[tone], className)} {...rest}>
      {dot && <span className={s.dot} style={{ background: dot }} aria-hidden="true" />}
      {children}
    </span>
  );
}
