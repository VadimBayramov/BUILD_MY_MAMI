import { useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

type TooltipProps = {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span className={`${styles.tip} ${styles[position]}`} role="tooltip">
          {text}
        </span>
      ) : null}
    </span>
  );
}
