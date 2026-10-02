import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import s from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  /** Libellé de l'action ; destructive la colore en rouge. */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Alerte de confirmation modale. S'appuie sur l'élément dialog natif : focus piégé, Échap et fond gérés par le navigateur. */
export function Dialog({ open, title, message, confirmLabel, cancelLabel = 'Annuler', destructive, onConfirm, onCancel }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={`${id}-t`}
      aria-describedby={message ? `${id}-m` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <h2 id={`${id}-t`} className={s.title}>{title}</h2>
      {message && <div id={`${id}-m`} className={s.message}>{message}</div>}
      <div className={s.actions}>
        <Button onClick={onCancel} autoFocus>{cancelLabel}</Button>
        <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
