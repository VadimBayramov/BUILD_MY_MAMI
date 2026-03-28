import { useState, useEffect, useCallback, useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { ColorPicker } from '@components/shared/ColorPicker';
import styles from './section.module.css';

interface Props {
  element: FunnelElement;
}

export function ElementBackgroundSection({ element }: Props) {
  const elStyles = element.styles;
  const [bgImage, setBgImage] = useState(elStyles['background-image'] ?? '');

  useEffect(() => { setBgImage(elStyles['background-image'] ?? ''); }, [elStyles['background-image']]);

  const bgImageId = useId();

  const commitBgImage = useCallback(() => {
    useFunnelStore.getState().updateElementStyle(element.id, 'background-image', bgImage);
  }, [bgImage, element.id]);

  return (
    <div className={styles.fields}>
      <ColorPicker
        label="Background Color"
        value={elStyles['background-color'] ?? '#ffffff'}
        onChange={(v) =>
          useFunnelStore.getState().updateElementStyle(element.id, 'background-color', v)
        }
      />

      <div className={styles.field}>
        <label htmlFor={bgImageId} className={styles.label}>Background Image URL</label>
        <input
          id={bgImageId}
          className={styles.input}
          value={bgImage}
          onChange={(e) => setBgImage(e.target.value)}
          onBlur={commitBgImage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commitBgImage(); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="https://example.com/image.jpg"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
