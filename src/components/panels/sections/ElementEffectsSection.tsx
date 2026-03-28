import { useState, useEffect, useCallback, useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

const SHADOW_PRESETS = [
  { label: 'None',   value: 'none' },
  { label: 'SM',     value: '0 1px 2px rgba(0,0,0,0.1)' },
  { label: 'MD',     value: '0 4px 6px rgba(0,0,0,0.1)' },
  { label: 'LG',     value: '0 10px 15px rgba(0,0,0,0.15)' },
  { label: 'Custom', value: '__custom__' },
] as const;

const OVERFLOW_OPTIONS = ['visible', 'hidden', 'scroll', 'auto'] as const;
const CURSOR_OPTIONS   = ['default', 'pointer', 'text', 'crosshair', 'not-allowed', 'grab'] as const;

interface Props {
  element: FunnelElement;
}

export function ElementEffectsSection({ element }: Props) {
  const elStyles = element.styles;

  const update = (prop: string, val: string) =>
    useFunnelStore.getState().updateElementStyle(element.id, prop, val);

  const currentShadow = elStyles['box-shadow'] ?? 'none';
  const isPreset = SHADOW_PRESETS.some(
    (p) => p.value !== '__custom__' && p.value === currentShadow,
  );
  const shadowPresetValue = isPreset ? currentShadow : '__custom__';

  const [customShadow, setCustomShadow] = useState(
    !isPreset && currentShadow !== 'none' ? currentShadow : '',
  );

  useEffect(() => {
    if (!isPreset && currentShadow !== 'none') setCustomShadow(currentShadow);
  }, [currentShadow, isPreset]);

  const commitCustomShadow = useCallback(() => {
    if (customShadow.trim()) update('box-shadow', customShadow.trim());
  }, [customShadow]);

  const opacity = parseFloat(elStyles['opacity'] ?? '1');
  const overflowId = useId();
  const cursorId   = useId();
  const shadowId   = useId();

  return (
    <div className={styles.fields}>
      {/* Box Shadow */}
      <div className={styles.field}>
        <label htmlFor={shadowId} className={styles.label}>Box Shadow</label>
        <select
          id={shadowId}
          className={styles.select}
          value={shadowPresetValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== '__custom__') update('box-shadow', v);
          }}
        >
          {SHADOW_PRESETS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {shadowPresetValue === '__custom__' && (
        <div className={styles.subField}>
          <div className={styles.field}>
            <label className={styles.label}>Custom shadow value</label>
            <input
              className={styles.input}
              value={customShadow}
              onChange={(e) => setCustomShadow(e.target.value)}
              onBlur={commitCustomShadow}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { commitCustomShadow(); (e.target as HTMLInputElement).blur(); }
              }}
              placeholder="0 2px 8px rgba(0,0,0,0.2)"
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* Opacity */}
      <NumberInput
        label="Opacity"
        value={Number.isFinite(opacity) ? opacity : 1}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => update('opacity', String(v))}
      />

      {/* Overflow */}
      <div className={styles.field}>
        <label htmlFor={overflowId} className={styles.label}>Overflow</label>
        <select
          id={overflowId}
          className={styles.select}
          value={elStyles['overflow'] ?? 'visible'}
          onChange={(e) => update('overflow', e.target.value)}
        >
          {OVERFLOW_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Cursor */}
      <div className={styles.field}>
        <label htmlFor={cursorId} className={styles.label}>Cursor</label>
        <select
          id={cursorId}
          className={styles.select}
          value={elStyles['cursor'] ?? 'default'}
          onChange={(e) => update('cursor', e.target.value)}
        >
          {CURSOR_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
