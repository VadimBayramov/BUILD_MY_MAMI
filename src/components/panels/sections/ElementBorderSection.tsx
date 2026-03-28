import { useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'] as const;

type Corner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

function px(val: string | undefined): number {
  return parseInt(val ?? '0') || 0;
}

interface Props {
  element: FunnelElement;
}

export function ElementBorderSection({ element }: Props) {
  const elStyles = element.styles;
  const styleId = useId();

  const update = (prop: string, val: string) =>
    useFunnelStore.getState().updateElementStyle(element.id, prop, val);

  return (
    <div className={styles.fields}>
      <div className={styles.twoCol}>
        <NumberInput
          label="Width"
          value={px(elStyles['border-width'])}
          min={0}
          max={20}
          step={1}
          unit="px"
          onChange={(v) => update('border-width', `${v}px`)}
        />
        <div className={styles.field}>
          <label htmlFor={styleId} className={styles.label}>Style</label>
          <select
            id={styleId}
            className={styles.select}
            value={elStyles['border-style'] ?? 'none'}
            onChange={(e) => update('border-style', e.target.value)}
          >
            {BORDER_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <ColorPicker
        label="Border Color"
        value={elStyles['border-color'] ?? '#000000'}
        onChange={(v) => update('border-color', v)}
      />

      <div className={styles.field}>
        <span className={styles.label}>Border Radius (TL / TR / BR / BL)</span>
        <div className={styles.fourCol}>
          {CORNERS.map((corner) => {
            const prop = `border-${corner}-radius`;
            return (
              <NumberInput
                key={prop}
                label={corner.split('-').map((w) => w[0]!.toUpperCase()).join('')}
                value={px(elStyles[prop])}
                min={0}
                max={200}
                step={1}
                unit="px"
                onChange={(v) => update(prop, `${v}px`)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
