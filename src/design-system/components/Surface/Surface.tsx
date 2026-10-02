import { forwardRef, type ElementType, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import s from './Surface.module.css';

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  /** glass : panneau flottant translucide. thick : verre plus opaque. solid : carte pleine. inset : zone en creux. */
  material?: 'glass' | 'thick' | 'solid' | 'inset';
  radius?: 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: ElementType;
}

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { material = 'glass', radius = 'xl', padding = 'none', as: Tag = 'div', className, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cx(s.root, s[material], radius !== 'xl' && s[`r-${radius}`], padding !== 'none' && s[`p-${padding}`], className)}
      {...rest}
    />
  );
});
