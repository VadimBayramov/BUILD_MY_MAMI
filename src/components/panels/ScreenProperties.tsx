import { Smartphone } from 'lucide-react';
import type { Screen } from '@typedefs/funnel';
import { Accordion } from '@components/shared/Accordion';
import { ScreenGeneralSection } from './sections/ScreenGeneralSection';
import { ScreenNavigationSection } from './sections/ScreenNavigationSection';
import { ScreenAppearanceSection } from './sections/ScreenAppearanceSection';
import styles from './ScreenProperties.module.css';

interface Props {
  screen: Screen;
}

export function ScreenProperties({ screen }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Smartphone size={16} />
        <h3 className={styles.title}>{screen.name}</h3>
      </div>

      {/* key=screen.id resets local state in sections when switching screens */}
      <Accordion title="General" defaultOpen>
        <ScreenGeneralSection key={screen.id} screen={screen} />
      </Accordion>

      <Accordion title="Navigation">
        <ScreenNavigationSection screen={screen} />
      </Accordion>

      <Accordion title="Appearance">
        <ScreenAppearanceSection screen={screen} />
      </Accordion>
    </div>
  );
}
