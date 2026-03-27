import styles from './ColorPicker.module.css';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  label?: string;
};

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className={styles.root}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <label className={styles.control}>
        <span className={styles.swatch} style={{ backgroundColor: value }} aria-hidden />
        <input
          type="color"
          className={styles.input}
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.value}>{value}</span>
      </label>
    </div>
  );
}

function normalizeHex(color: string): string {
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return (
      '#' +
      c[1] +
      c[1] +
      c[2] +
      c[2] +
      c[3] +
      c[3]
    ).toLowerCase();
  }
  return '#000000';
}
