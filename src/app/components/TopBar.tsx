import { useMemo } from 'react';
import { Icon, IconButton } from '@ds';
import { dim, num, statusBadge, summarize } from '../garage/summary';
import { navigate } from '../router';
import { useArchitecture } from '../state/limits';
import { useEngine } from '../state/store';
import { useTheme } from '../useTheme';
import s from './TopBar.module.css';

export function TopBar() {
  const panels = useEngine((st) => st.panels);
  const spec = useEngine((st) => st.spec);
  const readOnly = useEngine((st) => st.readOnly);
  const canUndo = useEngine((st) => st.past.length > 0);
  const canRedo = useEngine((st) => st.future.length > 0);
  const { togglePanel, undo, redo, setInspectorTab } = useEngine.getState();
  const [theme, toggleTheme] = useTheme();
  const sum = useMemo(() => summarize(spec), [spec]);
  const arch = useArchitecture();
  const d = sum.validation.derived;
  const badge = statusBadge(sum);

  return (
    <header className={s.bar}>
      <div className={s.group}>
        <IconButton icon="chevronLeft" label="Mes moteurs" tooltip="bottom" onClick={() => navigate({ name: 'garage' })} />
        <IconButton
          icon="sidebarLeft"
          label={panels.library ? 'Masquer la bibliothèque' : 'Afficher la bibliothèque'}
          pressed={panels.library}
          tooltip="bottom"
          onClick={() => togglePanel('library')}
        />
        <button type="button" className={s.title} onClick={() => setInspectorTab('engine')} aria-label={`${spec.name}, voir la fiche technique`}>
          <strong>{spec.name}</strong>
          <span>
            {d ? `${arch.template?.short.split(' ')[0] ?? ''} · ${num(d.displacement)} cm³ · ${dim(d.bore)} × ${dim(d.stroke)} mm` : 'Pièces inconnues'}
            {!readOnly && (
              <span className={s.status} data-tone={badge.tone}>
                <Icon name={badge.icon} size={13} />
                {badge.label}
              </span>
            )}
            {readOnly && <span className={s.status}>référence, lecture seule</span>}
          </span>
        </button>
      </div>
      <div className={s.group}>
        {!readOnly && (
          <>
            <IconButton icon="undo" label="Annuler" tooltip="bottom" disabled={!canUndo} onClick={undo} />
            <IconButton icon="redo" label="Rétablir" tooltip="bottom" disabled={!canRedo} onClick={redo} />
          </>
        )}
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          tooltip="bottom"
          onClick={toggleTheme}
        />
        <IconButton
          icon="sidebarRight"
          label={panels.inspector ? "Masquer l'inspecteur" : "Afficher l'inspecteur"}
          pressed={panels.inspector}
          tooltip="bottom"
          onClick={() => togglePanel('inspector')}
        />
      </div>
    </header>
  );
}
