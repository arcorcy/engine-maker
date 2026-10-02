import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { IconButton } from '../IconButton/IconButton';
import s from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Actions du pied, par exemple Annuler et l'action principale. */
  footer?: ReactNode;
  onClose: () => void;
  /** Rend le contenu dans un formulaire : Entrée déclenche onSubmit. */
  onSubmit?: () => void;
}

/**
 * Feuille modale pour une tâche courte (créer, choisir, configurer). Centrée sur grand écran, ancrée en bas sur mobile.
 * S'appuie sur l'élément dialog natif : focus piégé, Échap et fond gérés par le navigateur.
 */
export function Sheet({ open, title, description, children, footer, onClose, onSubmit }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const content = (
    <>
      <div className={s.head}>
        <div>
          <h2 id={`${id}-t`} className={s.title}>{title}</h2>
          {description && <p className={s.desc}>{description}</p>}
        </div>
        <IconButton icon="close" label="Fermer" size="sm" variant="filled" tooltip={false} onClick={onClose} />
      </div>
      <div className={s.body}>{children}</div>
      {footer && <div className={s.foot}>{footer}</div>}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-labelledby={`${id}-t`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {onSubmit ? (
        <form
          style={{ display: 'contents' }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {content}
        </form>
      ) : (
        content
      )}
    </dialog>
  );
}
