import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement } from '@typedefs/funnel';
import { ToggleSwitch } from '@components/shared/ToggleSwitch';
import styles from './section.module.css';

const TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'div', 'span', 'a', 'label'];

interface Props {
  element: FunnelElement;
}

export function ElementContentSection({ element }: Props) {
  const [contentValue, setContentValue] = useState(element.content);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setContentValue(element.content); }, [element.content]);

  const idFocusId = useFunnelStore((s) => s.ui.idFocusId);
  useEffect(() => {
    if (idFocusId === element.id && idRef.current) {
      idRef.current.focus();
      idRef.current.select();
      useFunnelStore.getState().triggerIdFocus(null);
    }
  }, [idFocusId, element.id]);

  const elementIdFieldId = useId();
  const contentId = useId();
  const tagId = useId();

  const commitContent = useCallback(() => {
    if (contentValue === element.content) return;
    useFunnelStore.getState().updateElement(element.id, { content: contentValue });
  }, [contentValue, element.id, element.content]);

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={elementIdFieldId} className={styles.label}>Element ID</label>
        <input
          ref={idRef}
          id={elementIdFieldId}
          className={styles.input}
          value={element.id}
          readOnly
          tabIndex={-1}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={contentId} className={styles.label}>Content</label>
        <textarea
          id={contentId}
          className={styles.textarea}
          value={contentValue}
          rows={3}
          onChange={(e) => setContentValue(e.target.value)}
          onBlur={commitContent}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              commitContent();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          placeholder="Element text content"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={tagId} className={styles.label}>HTML Tag</label>
        <select
          id={tagId}
          className={styles.select}
          value={element.tag}
          onChange={(e) =>
            useFunnelStore.getState().updateElement(element.id, { tag: e.target.value })
          }
        >
          {TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Locked</span>
        <ToggleSwitch
          checked={element.locked}
          onChange={(v) => useFunnelStore.getState().updateElement(element.id, { locked: v })}
        />
      </div>
    </div>
  );
}
