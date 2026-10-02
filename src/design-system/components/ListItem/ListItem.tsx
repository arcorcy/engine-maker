import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './ListItem.module.css';

export interface ListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Pastille de couleur en tête de ligne. */
  dot?: string;
  /** Élément libre en tête (icône), à la place de la pastille. */
  leading?: ReactNode;
  /** Texte discret aligné à droite, par exemple une quantité. */
  meta?: ReactNode;
  /** Action secondaire à droite (IconButton), hors du bouton principal. */
  accessory?: ReactNode;
  /** N'affiche l'accessoire qu'au survol. */
  revealAccessory?: boolean;
  selected?: boolean;
  /** Ligne atténuée, par exemple un élément masqué. */
  dimmed?: boolean;
  tone?: 'accent' | 'danger';
  onSelect?: () => void;
}

export function ListItem({
  title, subtitle, dot, leading, meta, accessory, revealAccessory = true, selected, dimmed, tone = 'accent', onSelect,
}: ListItemProps) {
  return (
    <div
      className={cx(s.row, selected && s.selected, tone === 'danger' && s.danger, dimmed && s.dimmed, !!accessory && revealAccessory && s.hoverReveal)}
    >
      <button type="button" className={s.main} onClick={onSelect} aria-current={selected || undefined}>
        {leading ?? (dot && <span className={s.dot} style={{ background: dot }} aria-hidden="true" />)}
        <span className={s.texts}>
          <span className={s.title}>{title}</span>
          {subtitle && <span className={s.subtitle}>{subtitle}</span>}
        </span>
        {meta && <span className={s.meta}>{meta}</span>}
      </button>
      {accessory && <span className={s.accessory}>{accessory}</span>}
    </div>
  );
}
