import { useId } from 'react';
import { useFunnelStore } from '@store/funnel-store';
import type { FunnelElement, ElementVisibility, ConditionOperator } from '@typedefs/funnel';
import styles from './section.module.css';

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'eq',  label: '= equals'        },
  { value: 'neq', label: '≠ not equals'    },
  { value: 'gt',  label: '> greater than'  },
  { value: 'lt',  label: '< less than'     },
];

function isConditional(v: ElementVisibility): v is { condition: import('@typedefs/funnel').ConditionGroup } {
  return typeof v === 'object';
}

interface Props {
  element: FunnelElement;
}

export function ElementVisibilitySection({ element }: Props) {
  const { visibility } = element;

  const modeId     = useId();
  const fieldId    = useId();
  const operatorId = useId();
  const valueId    = useId();

  const currentMode: 'always' | 'hidden' | 'conditional' =
    visibility === 'always'  ? 'always'
    : visibility === 'hidden' ? 'hidden'
    : 'conditional';

  const condition = isConditional(visibility) ? visibility.condition : null;
  // Use only the first rule for Phase 2 (single-rule builder)
  const rule = condition?.rules[0];
  const ruleCondition = rule && !('rules' in rule) ? rule : null;

  const updateVisibility = (v: ElementVisibility) =>
    useFunnelStore.getState().updateElement(element.id, { visibility: v });

  const handleModeChange = (mode: string) => {
    if (mode === 'always')  { updateVisibility('always');  return; }
    if (mode === 'hidden')  { updateVisibility('hidden');  return; }
    // conditional — create default single-rule group
    updateVisibility({
      condition: {
        logic: 'and',
        rules: [{ field: '', operator: 'eq', value: '', valueType: 'string' }],
      },
    });
  };

  const updateRule = (patch: Partial<{ field: string; operator: ConditionOperator; value: string }>) => {
    if (!condition) return;
    const base = ruleCondition ?? { field: '', operator: 'eq' as ConditionOperator, value: '', valueType: 'string' as const };
    updateVisibility({
      condition: {
        ...condition,
        rules: [{ ...base, ...patch }],
      },
    });
  };

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={modeId} className={styles.label}>Show element</label>
        <select
          id={modeId}
          className={styles.select}
          value={currentMode}
          onChange={(e) => handleModeChange(e.target.value)}
        >
          <option value="always">Always</option>
          <option value="hidden">Hidden</option>
          <option value="conditional">Conditional</option>
        </select>
      </div>

      {currentMode === 'conditional' && (
        <div className={styles.subField}>
          <div className={styles.field}>
            <label htmlFor={fieldId} className={styles.label}>Field / variable</label>
            <input
              id={fieldId}
              className={styles.input}
              value={ruleCondition?.field ?? ''}
              onChange={(e) => updateRule({ field: e.target.value })}
              placeholder="e.g. answer"
              spellCheck={false}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={operatorId} className={styles.label}>Operator</label>
            <select
              id={operatorId}
              className={styles.select}
              value={ruleCondition?.operator ?? 'eq'}
              onChange={(e) => updateRule({ operator: e.target.value as ConditionOperator })}
            >
              {OPERATORS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor={valueId} className={styles.label}>Value</label>
            <input
              id={valueId}
              className={styles.input}
              value={String(ruleCondition?.value ?? '')}
              onChange={(e) => updateRule({ value: e.target.value })}
              placeholder="expected value"
            />
          </div>
        </div>
      )}
    </div>
  );
}
