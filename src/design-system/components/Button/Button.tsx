import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { cx } from '../../utils/cx';
import s from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary : action principale, une seule par zone. secondary : action courante. plain : lien d'action. destructive : action à risque. */
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  /** Occupe toute la largeur disponible. */
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, fullWidth, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.button, s[variant], size !== 'md' && s[size], fullWidth && s.full, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
});
