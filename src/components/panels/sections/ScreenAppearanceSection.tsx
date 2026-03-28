import { useState, useId } from 'react';
import { ChevronDown, ChevronRight, Unlock } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import type { Screen, CSSVariableName, GlobalStyles } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';
import overrideStyles from './ScreenAppearanceSection.module.css';

const FONT_FAMILIES = [
  { value: "'Inter', sans-serif",     label: 'Inter'    },
  { value: "'Roboto', sans-serif",    label: 'Roboto'   },
  { value: "Georgia, serif",          label: 'Georgia'  },
  { value: "'system-ui', sans-serif", label: 'System UI'},
  { value: "monospace",               label: 'Monospace' },
];

const COLOR_VARS: { key: CSSVariableName; label: string }[] = [
  { key: '--bg',           label: 'Background'      },
  { key: '--card-bg',      label: 'Card Background' },
  { key: '--text',         label: 'Text'            },
  { key: '--text-muted',   label: 'Text Muted'      },
  { key: '--accent',       label: 'Accent'          },
  { key: '--accent-hover', label: 'Accent Hover'    },
  { key: '--border-tile',  label: 'Border / Tile'   },
];

const TYPO_SIZE_VARS: { key: CSSVariableName; label: string; min: number; max: number }[] = [
  { key: '--h1-size',     label: 'H1',     min: 8,  max: 120 },
  { key: '--h2-size',     label: 'H2',     min: 8,  max: 100 },
  { key: '--body-size',   label: 'Body',   min: 8,  max: 48  },
  { key: '--option-font', label: 'Options',min: 8,  max: 48  },
];

const SPACING_VARS: { key: CSSVariableName; label: string; min: number; max: number; step: number }[] = [
  { key: '--radius',        label: 'Radius',   min: 0,   max: 64,   step: 1 },
  { key: '--radius-sm',     label: 'Radius SM',min: 0,   max: 48,   step: 1 },
  { key: '--pad-x',         label: 'Pad X',    min: 0,   max: 120,  step: 1 },
  { key: '--pad-y',         label: 'Pad Y',    min: 0,   max: 120,  step: 1 },
  { key: '--container-max', label: 'Max Width',min: 240, max: 1440, step: 8 },
];

function parsePx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

interface Props {
  screen: Screen;
}

export function ScreenAppearanceSection({ screen }: Props) {
  const { customStyles } = screen;
  const overrides = customStyles.overrides;
  const [expanded, setExpanded] = useState(false);

  const globalStyles = useFunnelStore((s) => s.project.funnel.globalStyles);

  const fontFamilyId  = useId();
  const customClassId = useId();

  const setOverride = (variable: CSSVariableName, value: string) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      customStyles: { ...customStyles, overrides: { ...overrides, [variable]: value } },
    });

  const clearOverride = (variable: CSSVariableName) => {
    const next = { ...overrides };
    delete next[variable];
    useFunnelStore.getState().updateScreen(screen.id, {
      customStyles: { ...customStyles, overrides: next },
    });
  };

  const setCustomCss = (value: string) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      customStyles: { ...customStyles, customCss: value },
    });

  const setCustomClass = (value: string) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      customStyles: { ...customStyles, customClass: value },
    });

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className={styles.fields}>

      {/* ── Override Global Styles toggle ── */}
      <button
        type="button"
        className={overrideStyles.toggleBtn}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>Override Global Styles</span>
        {overrideCount > 0 && (
          <span className={overrideStyles.badge}>{overrideCount}</span>
        )}
      </button>

      {expanded && (
        <div className={overrideStyles.panel}>

          {/* Colors */}
          <div className={overrideStyles.group}>
            <div className={overrideStyles.groupTitle}>Colors</div>
            {COLOR_VARS.map(({ key, label }) => {
              const globalVal = (globalStyles as GlobalStyles)[key] ?? '';
              const overrideVal = overrides[key];
              const isSet = overrideVal !== undefined;
              return (
                <div key={key} className={overrideStyles.varRow}>
                  <div className={overrideStyles.varHeader}>
                    <span className={overrideStyles.varLabel}>{label}</span>
                    {isSet && (
                      <button
                        type="button"
                        className={overrideStyles.clearBtn}
                        title="Reset to global"
                        onClick={() => clearOverride(key)}
                      >
                        <Unlock size={11} />
                      </button>
                    )}
                  </div>
                  {!isSet && globalVal && (
                    <div className={overrideStyles.globalHint}>{globalVal}</div>
                  )}
                  <ColorPicker
                    value={isSet ? overrideVal! : (globalVal || '#ffffff')}
                    onChange={(v) => setOverride(key, v)}
                  />
                </div>
              );
            })}
          </div>

          {/* Typography */}
          <div className={overrideStyles.group}>
            <div className={overrideStyles.groupTitle}>Typography</div>

            {/* Font family */}
            <div className={overrideStyles.varRow}>
              <div className={overrideStyles.varHeader}>
                <label htmlFor={fontFamilyId} className={overrideStyles.varLabel}>Font Family</label>
                {overrides['--font-family'] !== undefined && (
                  <button type="button" className={overrideStyles.clearBtn} title="Reset to global" onClick={() => clearOverride('--font-family')}>
                    <Unlock size={11} />
                  </button>
                )}
              </div>
              {overrides['--font-family'] === undefined && globalStyles['--font-family'] && (
                <div className={overrideStyles.globalHint}>{globalStyles['--font-family']}</div>
              )}
              <select
                id={fontFamilyId}
                className={styles.select}
                value={overrides['--font-family'] ?? globalStyles['--font-family'] ?? "'Inter', sans-serif"}
                onChange={(e) => setOverride('--font-family', e.target.value)}
              >
                {FONT_FAMILIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Size vars */}
            <div className={overrideStyles.sizeGrid}>
              {TYPO_SIZE_VARS.map(({ key, label, min, max }) => {
                const globalVal = (globalStyles as GlobalStyles)[key];
                const overrideVal = overrides[key];
                const isSet = overrideVal !== undefined;
                return (
                  <div key={key} className={overrideStyles.sizeVar}>
                    <div className={overrideStyles.varHeader}>
                      <span className={overrideStyles.varLabel}>{label}</span>
                      {isSet && (
                        <button type="button" className={overrideStyles.clearBtn} title="Reset" onClick={() => clearOverride(key)}>
                          <Unlock size={11} />
                        </button>
                      )}
                    </div>
                    <NumberInput
                      value={parsePx(isSet ? overrideVal : globalVal, 16)}
                      min={min} max={max} step={1} unit="px"
                      onChange={(v) => setOverride(key, `${v}px`)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacing & Layout */}
          <div className={overrideStyles.group}>
            <div className={overrideStyles.groupTitle}>Spacing &amp; Layout</div>
            <div className={overrideStyles.sizeGrid}>
              {SPACING_VARS.map(({ key, label, min, max, step }) => {
                const globalVal = (globalStyles as GlobalStyles)[key];
                const overrideVal = overrides[key];
                const isSet = overrideVal !== undefined;
                return (
                  <div key={key} className={overrideStyles.sizeVar}>
                    <div className={overrideStyles.varHeader}>
                      <span className={overrideStyles.varLabel}>{label}</span>
                      {isSet && (
                        <button type="button" className={overrideStyles.clearBtn} title="Reset" onClick={() => clearOverride(key)}>
                          <Unlock size={11} />
                        </button>
                      )}
                    </div>
                    <NumberInput
                      value={parsePx(isSet ? overrideVal : globalVal, 16)}
                      min={min} max={max} step={step} unit="px"
                      onChange={(v) => setOverride(key, `${v}px`)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── Custom CSS ── */}
      <div className={styles.field}>
        <label className={styles.label}>Custom CSS</label>
        <textarea
          className={styles.textarea}
          value={customStyles.customCss}
          placeholder=".my-class { color: red; }"
          rows={4}
          onChange={(e) => setCustomCss(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* ── Custom Class ── */}
      <div className={styles.field}>
        <label htmlFor={customClassId} className={styles.label}>Custom Class</label>
        <input
          id={customClassId}
          className={styles.input}
          value={customStyles.customClass}
          placeholder="my-screen dark-variant"
          onChange={(e) => setCustomClass(e.target.value)}
        />
      </div>

    </div>
  );
}
