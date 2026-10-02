import type { SVGProps } from 'react';
import { icons, type IconName } from './icons';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Taille en pixels (carré). */
  size?: number;
  /** Texte alternatif. Sans lui, l'icône est décorative et masquée aux lecteurs d'écran. */
  label?: string;
}

export function Icon({ name, size = 18, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
      {...rest}
    >
      {icons[name]}
    </svg>
  );
}
