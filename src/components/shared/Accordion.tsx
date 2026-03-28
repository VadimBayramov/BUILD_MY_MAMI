import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Accordion.module.css';

type AccordionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.title}>{title}</span>
        <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} size={18} />
      </button>
      <div
        id={panelId}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-hidden={!open}
      >
        <div className={styles.body}>
          <div className={styles.inner}>{children}</div>
        </div>
      </div>
    </div>
  );
}
