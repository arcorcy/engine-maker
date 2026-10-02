import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../../utils/cx';
import s from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning';
  /** Pastille de couleur en tête, par exemple la couleur d'un système. */
  dot?: string;
  /** Icône en tête, par exemple pour un statut : la couleur ne doit jamais porter seule l'information. */
  icon?: IconName;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(s.root, tone !== 'neutral' && s[tone], className)} {...rest}>
      {dot && <span className={s.dot} style={{ background: dot }} aria-hidden="true" />}
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
