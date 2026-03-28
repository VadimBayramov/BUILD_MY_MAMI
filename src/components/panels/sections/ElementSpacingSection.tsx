import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

interface Props {
  element: FunnelElement;
}

type BoxSide = 'top' | 'right' | 'bottom' | 'left';
const SIDES: BoxSide[] = ['top', 'right', 'bottom', 'left'];

function px(val: string | undefined): number {
  return parseInt(val ?? '0') || 0;
}

export function ElementSpacingSection({ element }: Props) {
  const elStyles = element.styles;

  const update = (prop: string, val: string) =>
    useFunnelStore.getState().updateElementStyle(element.id, prop, val);

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <span className={styles.label}>Margin</span>
        <div className={styles.twoCol}>
          {SIDES.map((side) => (
            <NumberInput
              key={`margin-${side}`}
              label={side[0]!.toUpperCase()}
              value={px(elStyles[`margin-${side}`])}
              min={-200}
              max={200}
              step={1}
              unit="px"
              onChange={(v) => update(`margin-${side}`, `${v}px`)}
            />
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Padding</span>
        <div className={styles.twoCol}>
          {SIDES.map((side) => (
            <NumberInput
              key={`padding-${side}`}
              label={side[0]!.toUpperCase()}
              value={px(elStyles[`padding-${side}`])}
              min={0}
              max={200}
              step={1}
              unit="px"
              onChange={(v) => update(`padding-${side}`, `${v}px`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
