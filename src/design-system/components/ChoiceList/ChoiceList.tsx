import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import s from './ChoiceList.module.css';

export interface Choice<T extends string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  /** Élément aligné à droite du titre, par exemple un Badge. */
  meta?: ReactNode;
  /** Ligne supplémentaire sous la description, par exemple les conséquences du choix. */
  extra?: ReactNode;
  /** Raison pour laquelle ce choix est impossible. Le choix reste visible, grisé, avec sa raison. */
  disabledReason?: string;
}

export interface ChoiceListProps<T extends string> {
  label: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Choix exclusif entre des options riches (titre, description, conséquences), au clavier comme à la souris. */
export function ChoiceList<T extends string>({ label, choices, value, onChange }: ChoiceListProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role=radio]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + d + items.length) % items.length]?.focus();
  };

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={s.list} onKeyDown={onKey}>
      {choices.map((c) => {
        const checked = c.value === value;
        const disabled = !!c.disabledReason;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            tabIndex={checked ? 0 : -1}
            className={s.item}
            onClick={() => !disabled && !checked && onChange(c.value)}
          >
            <span className={s.mark} aria-hidden="true">{checked && <Icon name="check" size={13} strokeWidth={2.4} />}</span>
            <span className={s.head}>
              <span className={s.title}>{c.title}</span>
              {c.meta}
            </span>
            {c.description && <span className={s.desc}>{c.description}</span>}
            {(c.disabledReason || c.extra) && <span className={s.extra}>{c.disabledReason ?? c.extra}</span>}
          </button>
        );
      })}
    </div>
  );
}
