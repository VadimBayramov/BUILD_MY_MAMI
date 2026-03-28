import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { Screen, ScreenType } from '@typedefs/funnel';
import styles from './section.module.css';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

const SCREEN_TYPES: { value: ScreenType; label: string }[] = [
  { value: 'survey',   label: 'Survey'   },
  { value: 'question', label: 'Question' },
  { value: 'result',   label: 'Result'   },
  { value: 'loader',   label: 'Loader'   },
  { value: 'form',     label: 'Form'     },
  { value: 'paywall',  label: 'Paywall'  },
  { value: 'custom',   label: 'Custom'   },
];

interface Props {
  screen: Screen;
}

export function ScreenGeneralSection({ screen }: Props) {
  const [nameValue, setNameValue] = useState(screen.name);
  const [slugValue, setSlugValue] = useState(screen.id);
  const [slugError, setSlugError] = useState('');
  const [tagsValue, setTagsValue] = useState(screen.tags.join(', '));
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  const renameFocusId = useFunnelStore((s) => s.ui.renameFocusId);
  useEffect(() => {
    if (renameFocusId === screen.id && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
      useFunnelStore.getState().triggerRename(null);
    }
  }, [renameFocusId, screen.id]);

  const idFocusId = useFunnelStore((s) => s.ui.idFocusId);
  useEffect(() => {
    if (idFocusId === screen.id && slugRef.current) {
      slugRef.current.focus();
      slugRef.current.select();
      useFunnelStore.getState().triggerIdFocus(null);
    }
  }, [idFocusId, screen.id]);

  // Sync when screen prop changes externally (e.g. undo/redo)
  useEffect(() => { setNameValue(screen.name); }, [screen.name]);
  useEffect(() => { setSlugValue(screen.id); setSlugError(''); }, [screen.id]);
  useEffect(() => { setTagsValue(screen.tags.join(', ')); }, [screen.tags]);

  const nameId = useId();
  const slugId = useId();
  const typeId = useId();
  const tagsId = useId();

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === screen.name) return;
    useFunnelStore.getState().updateScreen(screen.id, { name: trimmed });
  }, [nameValue, screen.id, screen.name]);

  const commitSlug = useCallback(() => {
    const trimmed = slugValue.trim();
    if (trimmed === screen.id) { setSlugError(''); return; }

    const screens = useFunnelStore.getState().project.funnel.screens;
    const existingSlugs = Object.keys(screens).filter((s) => s !== screen.id);

    if (!SLUG_REGEX.test(trimmed) || trimmed.includes('--')) {
      setSlugError('Use lowercase letters, numbers and hyphens (min 2 chars)');
      setSlugValue(screen.id);
      return;
    }
    if (existingSlugs.includes(trimmed)) {
      setSlugError('This ID is already taken by another screen');
      setSlugValue(screen.id);
      return;
    }

    setSlugError('');
    useFunnelStore.getState().renameScreen(screen.id, trimmed);
  }, [slugValue, screen.id]);

  const commitTags = useCallback(() => {
    const tags = tagsValue.split(',').map((t) => t.trim()).filter(Boolean);
    useFunnelStore.getState().updateScreen(screen.id, { tags });
  }, [tagsValue, screen.id]);

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>Name</label>
        <input
          ref={nameRef}
          id={nameId}
          className={styles.input}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') { commitName(); (e.target as HTMLInputElement).blur(); } }}
          placeholder="Screen name"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={slugId} className={styles.label}>ID / Slug</label>
        <input
          ref={slugRef}
          id={slugId}
          className={`${styles.input} ${slugError ? styles.inputError : ''}`}
          value={slugValue}
          onChange={(e) => { setSlugValue(e.target.value); setSlugError(''); }}
          onBlur={commitSlug}
          onKeyDown={(e) => { if (e.key === 'Enter') { commitSlug(); (e.target as HTMLInputElement).blur(); } }}
          placeholder="screen-id"
          spellCheck={false}
        />
        {slugError && <span className={styles.error}>{slugError}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={typeId} className={styles.label}>Type</label>
        <select
          id={typeId}
          className={styles.select}
          value={screen.type}
          onChange={(e) =>
            useFunnelStore.getState().updateScreen(screen.id, { type: e.target.value as ScreenType })
          }
        >
          {SCREEN_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={tagsId} className={styles.label}>Tags (comma-separated)</label>
        <input
          id={tagsId}
          className={styles.input}
          value={tagsValue}
          onChange={(e) => setTagsValue(e.target.value)}
          onBlur={commitTags}
          placeholder="tag1, tag2"
        />
      </div>
    </div>
  );
}
