import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './Tooltip.module.css';

export interface TooltipProps {
  /** Texte affiché. Purement visuel : le nom accessible doit être porté par l'élément enfant. */
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

/** Infobulle discrète, au survol et au focus clavier, avec un délai d'apparition. */
export function Tooltip({ label, side = 'top', children }: TooltipProps) {
  return (
    <span className={s.wrap}>
      {children}
      <span className={cx(s.tip, s[side])} aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
