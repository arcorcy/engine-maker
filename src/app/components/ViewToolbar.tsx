import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, IconButton, Menu, MenuItem, MenuRow, MenuSeparator, NumberField, Slider, Toolbar, ToolbarGroup, ToolbarSeparator, type IconName } from '@ds';
import { CAR } from '../../engine/data/vehicle';
import { useEngineLimits } from '../state/limits';
import { useEngine } from '../state/store';
import s from './ViewToolbar.module.css';

interface ToggleAction {
  id: string;
  icon: IconName;
  label: string;
  pressed?: boolean;
  onClick: () => void;
}

export function ViewToolbar() {
  const st = useEngine();
  const limits = useEngineLimits();
  const red = st.rpm >= limits.red;
  const dock = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [folded, setFolded] = useState(0);

  const systems = st.colorMode === 'systems';
  const exhaust = st.side.value === 'exhaust';

  const view: ToggleAction[] = [
    { id: 'cut', icon: 'cut', label: 'Vue en coupe', pressed: st.cut, onClick: () => st.toggle('cut') },
    { id: 'xray', icon: 'xray', label: 'Transparence', pressed: st.xray, onClick: () => st.toggle('xray') },
    { id: 'gas', icon: 'gas', label: 'Gaz et pressions', pressed: st.gas, onClick: () => st.toggle('gas') },
    {
      id: 'layers',
      icon: 'layers',
      label: systems ? 'Couleurs réalistes' : 'Couleurs par système',
      pressed: systems,
      onClick: () => st.setColorMode(systems ? 'materials' : 'systems'),
    },
  ];
  const camera: ToggleAction[] = [
    {
      id: 'orbit',
      icon: 'orbit',
      label: exhaust ? 'Voir côté admission' : 'Voir côté échappement',
      pressed: exhaust,
      onClick: () => st.setSide(exhaust ? 'intake' : 'exhaust'),
    },
    { id: 'fit', icon: 'fit', label: 'Recadrer', onClick: st.fitView },
    { id: 'reset', icon: 'reset', label: 'Tout afficher', onClick: st.showAll },
  ];

  /* Ordre de repli : du dernier élément de la barre vers le premier, le curseur d'éclaté en dernier. */
  const order = ['explode', 'cut', 'xray', 'gas', 'layers', 'orbit', 'fit', 'reset'];
  const total = order.length;
  const foldedIds = new Set(order.slice(total - folded));
  const shown = (id: string) => !foldedIds.has(id);

  // Mesure : on repart de la barre complète à chaque changement de largeur, puis on replie jusqu'à ce que tout tienne.
  useLayoutEffect(() => {
    const el = dock.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setFolded(0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = dock.current;
    const bar = el?.firstElementChild as HTMLElement | null;
    if (!el || !bar || folded >= total) return;
    // scrollWidth compterait les infobulles positionnées en absolu : on additionne plutôt les largeurs des enfants.
    const css = getComputedStyle(bar);
    const kids = Array.from(bar.children);
    const needed =
      kids.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0) +
      (parseFloat(css.columnGap) || 0) * (kids.length - 1) +
      (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0) +
      (parseFloat(css.borderLeftWidth) || 0) + (parseFloat(css.borderRightWidth) || 0);
    if (needed > el.clientWidth + 0.5) setFolded((f) => f + 1);
  }, [folded, width, total]);

  const btn = (a: ToggleAction) => <IconButton key={a.id} icon={a.icon} label={a.label} pressed={a.pressed} onClick={a.onClick} />;
  const visible = (list: ToggleAction[]) => list.filter((a) => shown(a.id));
  const inMenu = (list: ToggleAction[]) => list.filter((a) => !shown(a.id));
  const viewShown = visible(view);
  const camShown = visible(camera);
  const menuView = inMenu(view);
  const menuCam = inMenu(camera);
  const slider = (cls?: string): ReactNode => (
    <Slider
      className={cls}
      label="Vue éclatée"
      hideLabel
      value={Math.round(st.explode * 100)}
      onChange={(v) => st.setExplode(v / 100)}
      onPointerUp={st.fitView}
      onKeyUp={st.fitView}
      valueLabel={`${Math.round(st.explode * 100)} %`}
      tone="neutral"
    />
  );

  return (
    <div ref={dock} className={s.dock} data-left={st.panels.library} data-right={st.panels.inspector}>
      <Toolbar label="Outils de la vue" className={s.toolbar}>
        <IconButton
          icon={st.play ? 'pause' : 'play'}
          label={st.play ? 'Pause' : 'Faire tourner le moteur'}
          variant="prominent"
          onClick={() => st.toggle('play')}
        />
        <div className={s.control}>
          <Icon name="gauge" size={17} />
          <NumberField
            label="Régime moteur"
            value={st.rpm}
            min={CAR.idle}
            max={limits.redline}
            step={50}
            unit="tr/min"
            digits={4}
            onChange={st.setRpm}
            tone={red ? 'danger' : 'primary'}
          />
        </div>
        {shown('explode') && (
          <>
            <ToolbarSeparator />
            <div className={s.control}>
              <Icon name="explode" size={17} />
              {slider(s.slider)}
            </div>
          </>
        )}
        {viewShown.length > 0 && (
          <>
            <ToolbarSeparator />
            <ToolbarGroup>{viewShown.map(btn)}</ToolbarGroup>
          </>
        )}
        {camShown.length > 0 && (
          <>
            <ToolbarSeparator />
            <ToolbarGroup>{camShown.map(btn)}</ToolbarGroup>
          </>
        )}
        {folded > 0 && (
          <>
            <ToolbarSeparator />
            <Menu label="Autres outils">
              {!shown('explode') && (
                <MenuRow>
                  <Icon name="explode" size={18} />
                  {slider(s.menuSlider)}
                </MenuRow>
              )}
              {!shown('explode') && (menuView.length > 0 || menuCam.length > 0) && <MenuSeparator />}
              {menuView.map((a) => (
                <MenuItem key={a.id} icon={a.icon} label={a.label} checked={a.pressed} keepOpen onSelect={a.onClick} />
              ))}
              {menuView.length > 0 && menuCam.length > 0 && <MenuSeparator />}
              {menuCam.map((a) => (
                <MenuItem key={a.id} icon={a.icon} label={a.label} checked={a.pressed} keepOpen={a.pressed !== undefined} onSelect={a.onClick} />
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </div>
  );
}
