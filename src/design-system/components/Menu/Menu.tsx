import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { IconButton } from '../IconButton/IconButton';
import { cx } from '../../utils/cx';
import s from './Menu.module.css';

const CloseContext = createContext<() => void>(() => {});

export interface MenuProps {
  /** Nom accessible du bouton déclencheur. */
  label: string;
  icon?: IconName;
  /** Côté du déclencheur où le menu s'ouvre. */
  side?: 'top' | 'bottom';
  /** Aligne le bord du menu sur le bord droit ou gauche du déclencheur. */
  align?: 'start' | 'end';
  children: ReactNode;
}

/** Menu déroulant déclenché par un bouton icône. Se ferme au clic extérieur, à Échap et après un choix. */
export function Menu({ label, icon = 'more', side = 'top', align = 'end', children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={s.root}>
      <IconButton
        icon={icon}
        label={label}
        tooltip={open ? false : 'top'}
        pressed={open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div id={id} role="menu" aria-label={label} className={cx(s.panel, s[side], s[`align-${align}`])}>
          <CloseContext.Provider value={() => setOpen(false)}>{children}</CloseContext.Provider>
        </div>
      )}
    </div>
  );
}

export interface MenuItemProps {
  label: string;
  icon?: IconName;
  /** Rend l'entrée cochable (menuitemcheckbox) et affiche son état. */
  checked?: boolean;
  /** Garde le menu ouvert après le choix. */
  keepOpen?: boolean;
  onSelect: () => void;
}

export function MenuItem({ label, icon, checked, keepOpen, onSelect }: MenuItemProps) {
  const close = useContext(CloseContext);
  const toggle = checked !== undefined;
  return (
    <button
      type="button"
      role={toggle ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={toggle ? checked : undefined}
      className={s.item}
      onClick={() => {
        onSelect();
        if (!keepOpen) close();
      }}
    >
      <span className={s.lead}>{icon && <Icon name={icon} size={18} />}</span>
      <span className={s.text}>{label}</span>
      <span className={s.tick}>{checked && <Icon name="check" size={16} />}</span>
    </button>
  );
}

/** Ligne libre dans le menu, pour un réglage (curseur, champ) qui ne se résume pas à une action. */
export function MenuRow({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

export function MenuSeparator() {
  return <div role="separator" className={s.sep} />;
}
