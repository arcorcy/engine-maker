import { Icon, IconButton, Slider, Toolbar, ToolbarGroup, ToolbarSeparator } from '@ds';
import { CAR, fmt } from '../../engine/data/vehicle';
import { useEngine } from '../state/store';
import s from './ViewToolbar.module.css';

export function ViewToolbar() {
  const st = useEngine();
  const red = st.rpm >= CAR.red;

  return (
    <div className={s.dock} data-left={st.panels.library} data-right={st.panels.inspector}>
      <Toolbar label="Outils de la vue" className={s.toolbar}>
        <IconButton
          icon={st.play ? 'pause' : 'play'}
          label={st.play ? 'Pause' : 'Faire tourner le moteur'}
          variant="prominent"
          onClick={() => st.toggle('play')}
        />
        <div className={s.control}>
          <Icon name="gauge" size={17} />
          <Slider
            className={s.slider}
            label="Régime"
            hideLabel
            value={st.rpm}
            min={CAR.idle}
            max={CAR.redline}
            step={50}
            onChange={st.setRpm}
            valueLabel={`${fmt(st.rpm)} tr/min`}
            tone={red ? 'danger' : 'accent'}
          />
          <span className={s.value} aria-hidden="true">{fmt(st.rpm)} tr/min</span>
        </div>
        <ToolbarSeparator />
        <div className={s.control}>
          <Icon name="explode" size={17} />
          <Slider
            className={s.slider}
            label="Vue éclatée"
            hideLabel
            value={Math.round(st.explode * 100)}
            onChange={(v) => st.setExplode(v / 100)}
            onPointerUp={st.fitView}
            onKeyUp={st.fitView}
            valueLabel={`${Math.round(st.explode * 100)} %`}
            tone="neutral"
          />
        </div>
        <ToolbarSeparator />
        <ToolbarGroup>
          <IconButton icon="cut" label="Vue en coupe" pressed={st.cut} onClick={() => st.toggle('cut')} />
          <IconButton icon="xray" label="Transparence" pressed={st.xray} onClick={() => st.toggle('xray')} />
          <IconButton icon="gas" label="Gaz et pressions" pressed={st.gas} onClick={() => st.toggle('gas')} />
          <IconButton
            icon="layers"
            label={st.colorMode === 'systems' ? 'Couleurs réalistes' : 'Couleurs par système'}
            pressed={st.colorMode === 'systems'}
            onClick={() => st.setColorMode(st.colorMode === 'systems' ? 'materials' : 'systems')}
          />
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <IconButton
            icon="orbit"
            label={st.side.value === 'exhaust' ? 'Voir côté admission' : 'Voir côté échappement'}
            pressed={st.side.value === 'exhaust'}
            onClick={() => st.setSide(st.side.value === 'exhaust' ? 'intake' : 'exhaust')}
          />
          <IconButton icon="fit" label="Recadrer" onClick={st.fitView} />
          <IconButton icon="reset" label="Tout afficher" className={s.optional} onClick={st.showAll} />
        </ToolbarGroup>
      </Toolbar>
    </div>
  );
}
