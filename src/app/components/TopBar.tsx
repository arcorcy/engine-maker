import { IconButton } from '@ds';
import { useEngine } from '../state/store';
import { useTheme } from '../useTheme';
import s from './TopBar.module.css';

export function TopBar() {
  const panels = useEngine((st) => st.panels);
  const togglePanel = useEngine((st) => st.togglePanel);
  const [theme, toggleTheme] = useTheme();

  return (
    <header className={s.bar}>
      <div className={s.group}>
        <IconButton
          icon="sidebarLeft"
          label={panels.library ? 'Masquer la bibliothèque' : 'Afficher la bibliothèque'}
          pressed={panels.library}
          tooltip="bottom"
          onClick={() => togglePanel('library')}
        />
        <div className={s.title}>
          <strong>Anatomie moteur</strong>
          <span>4 cylindres en ligne · 16 soupapes · essence</span>
        </div>
      </div>
      <div className={s.group}>
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
