import { useFunnelStore } from '@store/funnel-store';
import type { Screen, CSSVariableName } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

interface Props {
  screen: Screen;
}

export function ScreenAppearanceSection({ screen }: Props) {
  const { customStyles } = screen;
  const overrides = customStyles.overrides;

  const updateOverride = (variable: CSSVariableName, value: string) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      customStyles: {
        ...customStyles,
        overrides: { ...overrides, [variable]: value },
      },
    });

  const padX = parseInt(overrides['--pad-x'] ?? '24') || 24;
  const padY = parseInt(overrides['--pad-y'] ?? '24') || 24;
  const bgColor = overrides['--bg'] ?? '#ffffff';

  return (
    <div className={styles.fields}>
      <ColorPicker
        label="Background color"
        value={bgColor}
        onChange={(v) => updateOverride('--bg', v)}
      />

      <div className={styles.twoCol}>
        <NumberInput
          label="Padding X"
          value={padX}
          min={0}
          max={120}
          step={4}
          unit="px"
          onChange={(v) => updateOverride('--pad-x', `${v}px`)}
        />
        <NumberInput
          label="Padding Y"
          value={padY}
          min={0}
          max={120}
          step={4}
          unit="px"
          onChange={(v) => updateOverride('--pad-y', `${v}px`)}
        />
      </div>
    </div>
  );
}
