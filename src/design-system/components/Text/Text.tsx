import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import type { TextStyle } from '../../tokens';
import { cx } from '../../utils/cx';
import s from './Text.module.css';

const defaultTag: Record<TextStyle, ElementType> = {
  'large-title': 'h1',
  'title-1': 'h1',
  'title-2': 'h2',
  'title-3': 'h3',
  headline: 'p',
  body: 'p',
  callout: 'p',
  subheadline: 'p',
  footnote: 'p',
  caption: 'span',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Style typographique, calqué sur la hiérarchie des Human Interface Guidelines. */
  variant?: TextStyle;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger';
  /** Balise rendue, déduite du style si absente. */
  as?: ElementType;
  /** Petites capitales espacées, pour les libellés de section. */
  caps?: boolean;
  /** Chiffres à chasse fixe, pour les valeurs qui changent. */
  tabular?: boolean;
  children?: ReactNode;
}

export function Text({ variant = 'body', tone = 'primary', as, caps, tabular, className, ...rest }: TextProps) {
  const Tag = as ?? defaultTag[variant];
  return (
    <Tag
      className={cx(
        s.text,
        s[variant],
        tone !== 'primary' && s[tone],
        caps && s.caps,
        tabular && s.tabular,
        variant.includes('title') && s.balance,
        className,
      )}
      {...rest}
    />
  );
}
