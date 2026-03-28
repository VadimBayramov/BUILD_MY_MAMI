import { useState, useEffect, useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { Screen } from '@typedefs/funnel';
import styles from './section.module.css';

interface Props {
  screen: Screen;
}

export function ScreenSocialSection({ screen }: Props) {
  const { customHead } = screen;

  const [ogTitle, setOgTitle] = useState(customHead.ogTitle);
  const [ogImage, setOgImage] = useState(customHead.ogImage);
  const [ogDesc, setOgDesc] = useState(customHead.ogDescription);

  // Sync on external changes (undo/redo)
  useEffect(() => { setOgTitle(customHead.ogTitle); }, [customHead.ogTitle]);
  useEffect(() => { setOgImage(customHead.ogImage); }, [customHead.ogImage]);
  useEffect(() => { setOgDesc(customHead.ogDescription); }, [customHead.ogDescription]);

  const commit = (patch: Partial<typeof customHead>) =>
    useFunnelStore.getState().updateScreen(screen.id, {
      customHead: { ...customHead, ...patch },
    });

  const titleId = useId();
  const imageId = useId();
  const descId = useId();

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={titleId} className={styles.label}>OG Title</label>
        <input
          id={titleId}
          className={styles.input}
          value={ogTitle}
          onChange={(e) => setOgTitle(e.target.value)}
          onBlur={() => commit({ ogTitle })}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          placeholder="Page title for social sharing"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={imageId} className={styles.label}>OG Image URL</label>
        <input
          id={imageId}
          className={styles.input}
          value={ogImage}
          onChange={(e) => setOgImage(e.target.value)}
          onBlur={() => commit({ ogImage })}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          placeholder="https://..."
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={descId} className={styles.label}>OG Description</label>
        <textarea
          id={descId}
          className={`${styles.input} ${styles.textarea}`}
          value={ogDesc}
          onChange={(e) => setOgDesc(e.target.value)}
          onBlur={() => commit({ ogDescription: ogDesc })}
          placeholder="Short description for social sharing"
          rows={3}
        />
      </div>
    </div>
  );
}
