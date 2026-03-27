export interface AnalyticsIntegration {
  provider: string;
  enabled: boolean;
  config: Record<string, string>;
}

export type PaymentProvider = 'stripe' | 'paddle' | 'custom';

export interface PaymentCredentials {
  id: string;
  label: string;
  provider: PaymentProvider;
  publicKey: string;
  secretKeyRef: string;
  webhookUrl: string;
}

export interface FunnelMeta {
  id: string;
  name: string;
  favicon: string;
  title: string;
  startScreenId: string;
  domain: string;
  lang: string;
  locales: string[];
  funnelApiVersion: number;
  termsUrl: string;
  privacyUrl: string;
  supportUrl: string;
  paymentCredentials: PaymentCredentials[];
  analytics: {
    integrations: AnalyticsIntegration[];
    headCode: string;
  };
}

export interface ScreenSettings {
  progressBar: boolean;
  progressValue: 'auto' | string;
  backButton: boolean;
  autoNavigate: boolean;
  navigationDelay: number;
  scrollToTop: boolean;
  transitionAnimation: 'fade' | 'slide-left' | 'slide-up' | 'slide-down' | 'zoom-in' | 'none';
}

export interface ScreenCustomStyles {
  overrides: Partial<Record<CSSVariableName, string>>;
  customCss: string;
  customClass: string;
}

export interface ScreenCustomJs {
  onEnter: string;
  onLeave: string;
  customScript: string;
}

export interface ScreenCustomHead {
  metaTags: Array<{ name: string; content: string }>;
  ogTitle: string;
  ogImage: string;
  ogDescription: string;
  extraHead: string;
  i18n: Record<string, { ogTitle: string; ogDescription: string }>;
}

export interface ScreenLayout {
  layoutType: 'default' | 'centered' | 'split' | 'fullscreen';
  headerVisible: boolean;
  footerVisible: boolean;
  backgroundImage: string;
  backgroundOverlay: string;
  backgroundSize: string;
  backgroundPosition: string;
}

export interface LocalizedPricing {
  currency: string;
  price: number;
  discount: number;
  checkoutUrl: string;
  paymentCredentialsId: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  discount: number;
  features: string[];
  localizedPricing: Record<string, LocalizedPricing>;
}

export interface ScreenPayment {
  paymentProvider: PaymentProvider;
  defaultCredentialsId: string;
  plans: PaymentPlan[];
  trialDays: number;
  moneyBackDays: number;
  timerEnabled: boolean;
  timerDuration: number;
  checkoutUrls: Record<string, string>;
  localeProviders: Record<string, PaymentProvider>;
}

// ── Structured conditions (вместо сырых строк — типобезопасная система) ──

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'exists'
  | 'not_exists';

export type ConditionValueType = 'string' | 'number' | 'boolean';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
  valueType: ConditionValueType;
}

export interface ConditionGroup {
  logic: 'and' | 'or';
  rules: Array<Condition | ConditionGroup>;
}

// ── A/B Testing ──

export interface ABTestConfig {
  experimentId: string;
  variant: string;
  weight?: number;
}

export interface ScreenConditions {
  showIf: ConditionGroup | null;
  skipIf: ConditionGroup | null;
  abTest: ABTestConfig | null;
}

export type ScreenType = 'survey' | 'question' | 'result' | 'loader' | 'form' | 'paywall' | 'custom';

export interface Screen {
  id: string;
  order: number;
  name: string;
  type: ScreenType;
  file?: string;
  tags: string[];
  description?: string;
  position: { x: number; y: number };
  settings: ScreenSettings;
  customStyles: ScreenCustomStyles;
  customJs: ScreenCustomJs;
  customHead: ScreenCustomHead;
  layout: ScreenLayout;
  payment: ScreenPayment | null;
  conditions: ScreenConditions;
}

export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'option'
  | 'option-tile'
  | 'container'
  | 'spacer'
  | 'progress-bar'
  | 'input'
  | 'card'
  | 'paywall'
  | 'raw-html'
  | 'survey-options'
  | 'hero-image'
  | 'footer'
  | 'divider'
  | 'icon'
  | 'video'
  | 'review'
  | 'timer'
  | 'loader'
  | 'custom';

export type ElementVisibility =
  | 'always'
  | 'hidden'
  | { condition: ConditionGroup };

export type ElementAnimation = 'fade-in' | 'slide-up' | 'slide-left' | 'zoom-in' | 'none';

export interface ElementStyles {
  [key: string]: string | undefined;
}

export interface FunnelElement {
  id: string;
  screenId: string;
  parentId: string | null;
  order: number;
  type: ElementType;
  tag: string;
  classes: string[];
  content: string;
  styles: ElementStyles;
  attributes: Record<string, string>;
  i18n: Record<string, string>;
  visibility: ElementVisibility;
  animation: ElementAnimation;
  locked: boolean;
  customCss: string;
  editable: boolean;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  trigger: string;
  condition: ConditionGroup | null;
  label: string;
  priority: number;
  isDefault: boolean;
}

// ── Typed CSS Variables ──

export type CSSVariableName =
  | '--bg'
  | '--card-bg'
  | '--text'
  | '--text-muted'
  | '--accent'
  | '--accent-hover'
  | '--border-tile'
  | '--radius'
  | '--radius-sm'
  | '--shadow'
  | '--transition'
  | '--pad-x'
  | '--pad-y'
  | '--container-max'
  | '--h1-size'
  | '--h2-size'
  | '--body-size'
  | '--option-font'
  | '--font-family'
  | `--custom-${string}`;

export type GlobalStyles = Partial<Record<CSSVariableName, string>>;

// ── Element Indexes (computed at store level, not persisted) ──

export interface ElementIndexes {
  byScreen: Record<string, string[]>;
  byParent: Record<string, string[]>;
}

export interface Funnel {
  schemaVersion: number;
  meta: FunnelMeta;
  globalStyles: GlobalStyles;
  screens: Record<string, Screen>;
  elements: Record<string, FunnelElement>;
  connections: Connection[];
}
