import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './Toolbar.module.css';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Nom accessible de la barre. */
  label: string;
  children: ReactNode;
}

/** Barre d'outils flottante en forme de pilule, à poser sur une vue. */
export function Toolbar({ label, className, children, ...rest }: ToolbarProps) {
  return (
    <div role="toolbar" aria-label={label} className={cx(s.root, className)} {...rest}>
      {children}
    </div>
  );
}

export function ToolbarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.group, className)}>{children}</div>;
}

export function ToolbarSeparator() {
  return <span className={s.sep} aria-hidden="true" />;
}
