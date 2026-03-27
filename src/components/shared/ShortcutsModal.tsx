import { Modal } from './Modal';
import { VISIBLE_SHORTCUTS } from '@hooks/useKeyboardShortcuts';
import styles from './ShortcutsModal.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatKeys(keys: string) {
  return keys.split('+').map((part, i) => (
    <span key={i}>
      {i > 0 && <span className={styles.plus}>+</span>}
      <kbd className={styles.kbd}>{part}</kbd>
    </span>
  ));
}

export function ShortcutsModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Горячие клавиши">
      <ul className={styles.list}>
        {VISIBLE_SHORTCUTS.map((s) => (
          <li key={s.id} className={styles.row}>
            <span className={styles.label}>{s.label}</span>
            <span className={styles.keys}>{formatKeys(s.keys)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
