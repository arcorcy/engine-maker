import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { Tooltip } from '../Tooltip/Tooltip';
import { cx } from '../../utils/cx';
import s from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Nom accessible, affiché aussi en infobulle. Obligatoire : un bouton icône n'a pas de texte visible. */
  label: string;
  variant?: 'ghost' | 'filled' | 'prominent';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'round' | 'square';
  /** Bouton bascule : rend aria-pressed et l'état actif. */
  pressed?: boolean;
  /** Position de l'infobulle, ou false pour la masquer. */
  tooltip?: 'top' | 'bottom' | 'left' | 'right' | false;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', shape = 'round', pressed, tooltip = 'top', className, type = 'button', ...rest },
  ref,
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cx(s.root, variant !== 'ghost' && s[variant], size !== 'md' && s[size], shape === 'square' && s.square, className)}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 19} />
    </button>
  );
  return tooltip ? <Tooltip label={label} side={tooltip}>{btn}</Tooltip> : btn;
});
