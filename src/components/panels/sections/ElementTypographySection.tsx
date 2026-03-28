import { useId } from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

const FONT_FAMILIES = [
  { value: 'inherit', label: 'Inherit' },
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Georgia, serif', label: 'Georgia' },
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'ExtraBold' },
];

const TEXT_ALIGNS = [
  { value: 'left',    Icon: AlignLeft    },
  { value: 'center',  Icon: AlignCenter  },
  { value: 'right',   Icon: AlignRight   },
  { value: 'justify', Icon: AlignJustify },
] as const;

interface Props {
  element: FunnelElement;
}

export function ElementTypographySection({ element }: Props) {
  const elStyles = element.styles;

  const update = (prop: string, val: string) =>
    useFunnelStore.getState().updateElementStyle(element.id, prop, val);

  const fontSize      = parseInt(elStyles['font-size']      ?? '16') || 16;
  const lineHeight    = parseFloat(elStyles['line-height']  ?? '1.5') || 1.5;
  const letterSpacing = parseFloat(elStyles['letter-spacing'] ?? '0') || 0;

  const fontFamilyId = useId();
  const fontWeightId = useId();

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={fontFamilyId} className={styles.label}>Font Family</label>
        <select
          id={fontFamilyId}
          className={styles.select}
          value={elStyles['font-family'] ?? 'inherit'}
          onChange={(e) => update('font-family', e.target.value)}
        >
          {FONT_FAMILIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className={styles.twoCol}>
        <NumberInput
          label="Size"
          value={fontSize}
          min={8}
          max={200}
          step={1}
          unit="px"
          onChange={(v) => update('font-size', `${v}px`)}
        />
        <div className={styles.field}>
          <label htmlFor={fontWeightId} className={styles.label}>Weight</label>
          <select
            id={fontWeightId}
            className={styles.select}
            value={elStyles['font-weight'] ?? '400'}
            onChange={(e) => update('font-weight', e.target.value)}
          >
            {FONT_WEIGHTS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <ColorPicker
        label="Text Color"
        value={elStyles['color'] ?? '#000000'}
        onChange={(v) => update('color', v)}
      />

      <div className={styles.field}>
        <span className={styles.label}>Text Align</span>
        <div className={styles.alignGroup}>
          {TEXT_ALIGNS.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              className={`${styles.alignBtn} ${(elStyles['text-align'] ?? 'left') === value ? styles.alignBtnActive : ''}`}
              onClick={() => update('text-align', value)}
              title={value}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.twoCol}>
        <NumberInput
          label="Line Height"
          value={lineHeight}
          min={0.8}
          max={4}
          step={0.1}
          onChange={(v) => update('line-height', String(v))}
        />
        <NumberInput
          label="Letter Spacing"
          value={letterSpacing}
          min={-5}
          max={20}
          step={0.5}
          unit="px"
          onChange={(v) => update('letter-spacing', `${v}px`)}
        />
      </div>
    </div>
  );
}
