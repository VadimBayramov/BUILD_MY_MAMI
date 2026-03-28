import { Layers } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import { Accordion } from '@components/shared/Accordion';
import { ElementContentSection }    from './sections/ElementContentSection';
import { ElementTypographySection } from './sections/ElementTypographySection';
import { ElementSpacingSection }    from './sections/ElementSpacingSection';
import { ElementBackgroundSection } from './sections/ElementBackgroundSection';
import { ElementBorderSection }     from './sections/ElementBorderSection';
import { ElementEffectsSection }    from './sections/ElementEffectsSection';
import { ElementVisibilitySection } from './sections/ElementVisibilitySection';
import styles from './ElementProperties.module.css';

export function ElementProperties() {
  const selectedElementIds = useFunnelStore((s) => s.ui.selectedElementIds);
  const elements = useFunnelStore((s) => s.project.funnel.elements);

  const elementId = selectedElementIds[0];
  const element = elementId ? elements[elementId] : undefined;

  if (!element) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>
          <Layers size={32} strokeWidth={1} />
          <p>Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Layers size={16} />
        <h3 className={styles.title}>{element.type}</h3>
      </div>

      <Accordion title="Content" defaultOpen>
        <ElementContentSection key={element.id} element={element} />
      </Accordion>

      <Accordion title="Typography">
        <ElementTypographySection element={element} />
      </Accordion>

      <Accordion title="Spacing">
        <ElementSpacingSection element={element} />
      </Accordion>

      <Accordion title="Background">
        <ElementBackgroundSection key={element.id} element={element} />
      </Accordion>

      <Accordion title="Border">
        <ElementBorderSection element={element} />
      </Accordion>

      <Accordion title="Effects">
        <ElementEffectsSection key={element.id} element={element} />
      </Accordion>

      <Accordion title="Visibility">
        <ElementVisibilitySection element={element} />
      </Accordion>
    </div>
  );
}
