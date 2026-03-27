import styles from './NumberInput.module.css';

type NumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
};

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
}: NumberInputProps) {
  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const setFromInput = (raw: string) => {
    if (raw === '' || raw === '-') return;
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) return;
    onChange(clamp(n));
  };

  const bump = (delta: number) => {
    onChange(clamp(value + delta * step));
  };

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={styles.root}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => bump(-1)}
          disabled={atMin}
          aria-label="Decrease"
        >
          −
        </button>
        <div className={styles.field}>
          <input
            type="number"
            className={styles.input}
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => setFromInput(e.target.value)}
          />
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </div>
        <button
          type="button"
          className={styles.btn}
          onClick={() => bump(1)}
          disabled={atMax}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
