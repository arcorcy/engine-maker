import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './SectionHeader.module.css';

export interface SectionHeaderProps {
  children: ReactNode;
  dot?: string;
  /** Action à droite, par exemple un Button plain. */
  action?: ReactNode;
  caps?: boolean;
  as?: 'h2' | 'h3' | 'h4' | 'div';
  className?: string;
}

export function SectionHeader({ children, dot, action, caps = true, as: Tag = 'h3', className }: SectionHeaderProps) {
  return (
    <div className={cx(s.root, caps && s.caps, className)}>
      <Tag className={s.label}>
        {dot && <span className={s.dot} style={{ background: dot }} aria-hidden="true" />}
        {children}
      </Tag>
      {action}
    </div>
  );
}
