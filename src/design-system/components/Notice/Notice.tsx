import type { ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../../utils/cx';
import s from './Notice.module.css';

const ICON: Record<NonNullable<NoticeProps['tone']>, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'checkCircle',
  warning: 'warning',
  danger: 'errorCircle',
};

export interface NoticeProps {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
  /** Action à droite, par exemple un Button plain « Annuler ». */
  action?: ReactNode;
  /** Annonce le message aux lecteurs d'écran à son apparition. */
  live?: boolean;
  className?: string;
}

/** Message dans le flux de la page : conséquence d'une action, problème à corriger, information. */
export function Notice({ tone = 'neutral', title, children, action, live, className }: NoticeProps) {
  return (
    <div className={cx(s.root, tone !== 'neutral' && s[tone], className)} role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}>
      <Icon name={ICON[tone]} size={18} className={s.icon} />
      <div className={s.body}>
        {title && <span className={s.title}>{title}</span>}
        {children}
      </div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}
