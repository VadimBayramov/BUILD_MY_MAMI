import { useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { CSSVariableName } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './GlobalStylesPanel.module.css';

const FONT_FAMILIES = [
  { value: "'Inter', sans-serif",    label: 'Inter'    },
  { value: "'Roboto', sans-serif",   label: 'Roboto'   },
  { value: "Georgia, serif",         label: 'Georgia'  },
  { value: "'system-ui', sans-serif",label: 'System UI'},
  { value: "monospace",              label: 'Monospace' },
];

const SHADOW_PRESETS = [
  { value: 'none',                              label: 'None'  },
  { value: '0 1px 3px rgba(0,0,0,0.12)',        label: 'SM'    },
  { value: '0 2px 8px rgba(0,0,0,0.08)',        label: 'MD'    },
  { value: '0 4px 16px rgba(0,0,0,0.12)',       label: 'LG'    },
];

const TRANSITION_PRESETS = [
  { value: 'none',            label: 'None'   },
  { value: 'all 0.1s ease',   label: 'Fast'   },
  { value: 'all 0.2s ease',   label: 'Normal' },
  { value: 'all 0.4s ease',   label: 'Slow'   },
];

function parsePx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

export function GlobalStylesPanel() {
  const globalStyles = useFunnelStore((s) => s.project.funnel.globalStyles);
  const update = (variable: CSSVariableName, value: string) =>
    useFunnelStore.getState().updateGlobalStyle(variable, value);

  const fontFamilyId   = useId();
  const shadowPresetId = useId();
  const transPresetId  = useId();

  const shadow     = globalStyles['--shadow']     ?? 'none';
  const transition = globalStyles['--transition'] ?? 'none';

  const shadowIsCustom     = !SHADOW_PRESETS.find((p) => p.value === shadow);
  const transitionIsCustom = !TRANSITION_PRESETS.find((p) => p.value === transition);

  return (
    <div className={styles.root}>

      {/* ── Colors ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Colors</div>
        <ColorPicker label="Background"      value={globalStyles['--bg']          ?? '#f8f9fa'} onChange={(v) => update('--bg', v)} />
        <ColorPicker label="Card Background" value={globalStyles['--card-bg']     ?? '#ffffff'} onChange={(v) => update('--card-bg', v)} />
        <ColorPicker label="Text"            value={globalStyles['--text']        ?? '#1a1a2e'} onChange={(v) => update('--text', v)} />
        <ColorPicker label="Text Muted"      value={globalStyles['--text-muted']  ?? '#6c757d'} onChange={(v) => update('--text-muted', v)} />
        <ColorPicker label="Accent"          value={globalStyles['--accent']      ?? '#3b82f6'} onChange={(v) => update('--accent', v)} />
        <ColorPicker label="Accent Hover"    value={globalStyles['--accent-hover']?? '#2563eb'} onChange={(v) => update('--accent-hover', v)} />
        <ColorPicker label="Border / Tile"   value={globalStyles['--border-tile'] ?? '#e5e7eb'} onChange={(v) => update('--border-tile', v)} />
      </div>

      {/* ── Typography ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Typography</div>
        <div className={styles.field}>
          <label htmlFor={fontFamilyId} className={styles.label}>Font Family</label>
          <select
            id={fontFamilyId}
            className={styles.select}
            value={globalStyles['--font-family'] ?? "'Inter', sans-serif"}
            onChange={(e) => update('--font-family', e.target.value)}
          >
            {FONT_FAMILIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.twoCol}>
          <NumberInput label="H1 Size" value={parsePx(globalStyles['--h1-size'], 24)} min={8} max={120} step={1} unit="px" onChange={(v) => update('--h1-size', `${v}px`)} />
          <NumberInput label="H2 Size" value={parsePx(globalStyles['--h2-size'], 20)} min={8} max={100} step={1} unit="px" onChange={(v) => update('--h2-size', `${v}px`)} />
        </div>
        <div className={styles.twoCol}>
          <NumberInput label="Body"    value={parsePx(globalStyles['--body-size'],   16)} min={8} max={48} step={1} unit="px" onChange={(v) => update('--body-size',   `${v}px`)} />
          <NumberInput label="Options" value={parsePx(globalStyles['--option-font'], 16)} min={8} max={48} step={1} unit="px" onChange={(v) => update('--option-font', `${v}px`)} />
        </div>
      </div>

      {/* ── Spacing & Layout ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Spacing &amp; Layout</div>
        <div className={styles.twoCol}>
          <NumberInput label="Radius"    value={parsePx(globalStyles['--radius'],    16)} min={0} max={64} step={1} unit="px" onChange={(v) => update('--radius',    `${v}px`)} />
          <NumberInput label="Radius SM" value={parsePx(globalStyles['--radius-sm'], 12)} min={0} max={48} step={1} unit="px" onChange={(v) => update('--radius-sm', `${v}px`)} />
        </div>
        <div className={styles.twoCol}>
          <NumberInput label="Pad X" value={parsePx(globalStyles['--pad-x'], 20)} min={0} max={120} step={1} unit="px" onChange={(v) => update('--pad-x', `${v}px`)} />
          <NumberInput label="Pad Y" value={parsePx(globalStyles['--pad-y'], 16)} min={0} max={120} step={1} unit="px" onChange={(v) => update('--pad-y', `${v}px`)} />
        </div>
        <NumberInput label="Max Width" value={parsePx(globalStyles['--container-max'], 480)} min={240} max={1440} step={8} unit="px" onChange={(v) => update('--container-max', `${v}px`)} />
      </div>

      {/* ── Effects ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Effects</div>

        <div className={styles.field}>
          <label htmlFor={shadowPresetId} className={styles.label}>Shadow</label>
          <select
            id={shadowPresetId}
            className={styles.select}
            value={shadowIsCustom ? '__custom__' : shadow}
            onChange={(e) => {
              if (e.target.value !== '__custom__') update('--shadow', e.target.value);
            }}
          >
            {SHADOW_PRESETS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {shadowIsCustom && <option value="__custom__">Custom</option>}
          </select>
          <input
            className={styles.input}
            value={shadow === 'none' ? '' : shadow}
            placeholder="Custom box-shadow value"
            onChange={(e) => update('--shadow', e.target.value || 'none')}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={transPresetId} className={styles.label}>Transition</label>
          <select
            id={transPresetId}
            className={styles.select}
            value={transitionIsCustom ? '__custom__' : transition}
            onChange={(e) => {
              if (e.target.value !== '__custom__') update('--transition', e.target.value);
            }}
          >
            {TRANSITION_PRESETS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {transitionIsCustom && <option value="__custom__">Custom</option>}
          </select>
          <input
            className={styles.input}
            value={transition === 'none' ? '' : transition}
            placeholder="Custom transition value"
            onChange={(e) => update('--transition', e.target.value || 'none')}
          />
        </div>
      </div>

    </div>
  );
}
