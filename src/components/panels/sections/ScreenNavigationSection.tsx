import { useFunnelStore } from '@store/funnel-store';
import type { Screen, ScreenSettings } from '@typedefs/funnel';
import { ToggleSwitch } from '@components/shared/ToggleSwitch';
import { NumberInput } from '@components/shared/NumberInput';
import styles from './section.module.css';

interface Props {
  screen: Screen;
}

export function ScreenNavigationSection({ screen }: Props) {
  const { settings } = screen;

  const update = (patch: Partial<ScreenSettings>) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      settings: { ...settings, ...patch },
    });

  const isManualProgress =
    settings.progressBar && settings.progressValue !== 'auto';

  return (
    <div className={styles.fields}>
      {/* Progress bar */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Progress bar</span>
        <ToggleSwitch
          checked={settings.progressBar}
          onChange={(v) => update({ progressBar: v })}
        />
      </div>

      {settings.progressBar && (
        <div className={styles.subField}>
          <div className={styles.field}>
            <label className={styles.label}>Progress value</label>
            <select
              className={styles.select}
              value={settings.progressValue === 'auto' ? 'auto' : 'manual'}
              onChange={(e) =>
                update({ progressValue: e.target.value === 'auto' ? 'auto' : '0' })
              }
            >
              <option value="auto">Auto (position / total)</option>
              <option value="manual">Manual %</option>
            </select>
          </div>

          {isManualProgress && (
            <NumberInput
              label="Value (%)"
              value={Number(settings.progressValue) || 0}
              min={0}
              max={100}
              onChange={(v) => update({ progressValue: String(v) })}
            />
          )}
        </div>
      )}

      {/* Back button */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Back button</span>
        <ToggleSwitch
          checked={settings.backButton}
          onChange={(v) => update({ backButton: v })}
        />
      </div>

      {/* Auto-navigate */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Auto-navigate</span>
        <ToggleSwitch
          checked={settings.autoNavigate}
          onChange={(v) => update({ autoNavigate: v })}
        />
      </div>

      {settings.autoNavigate && (
        <div className={styles.subField}>
          <NumberInput
            label="Delay (ms)"
            value={settings.navigationDelay}
            min={0}
            max={30000}
            step={100}
            onChange={(v) => update({ navigationDelay: v })}
          />
        </div>
      )}

      {/* Transition animation */}
      <div className={styles.field}>
        <label className={styles.label}>Transition animation</label>
        <select
          className={styles.select}
          value={settings.transitionAnimation}
          onChange={(e) =>
            update({
              transitionAnimation: e.target.value as ScreenSettings['transitionAnimation'],
            })
          }
        >
          <option value="none">None</option>
          <option value="fade">Fade</option>
          <option value="slide-left">Slide Left</option>
          <option value="slide-up">Slide Up</option>
          <option value="slide-down">Slide Down</option>
          <option value="zoom-in">Zoom In</option>
        </select>
      </div>
    </div>
  );
}
