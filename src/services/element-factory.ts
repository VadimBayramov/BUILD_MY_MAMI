import { nanoid } from 'nanoid';
import type { ComponentDefinition, ElementNode } from '@typedefs/component';
import type { ElementType, ElementStyles, FunnelElement } from '@typedefs/funnel';
import { parseCss } from './css-parser';
import type { CssRuleMap } from './css-parser';

// ── ElementFactory ────────────────────────────────────────────────────────────
//
// Converts a ComponentDefinition (from ComponentParser) into a flat
// FunnelElement[] array ready to be inserted into the store.
//
// Tree traversal:
//   root → parentId: null, order: 0
//   children → parentId: parent.id, order: index among siblings
//
// ID format:  {inferredType}-{nanoid(8)}   e.g. "heading-aB3kZ9pQ"
// ─────────────────────────────────────────────────────────────────────────────

export class ElementFactory {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Convert a fully parsed ComponentDefinition into a flat FunnelElement[]
   * for a specific screen.  Styles from the component's <style> block are
   * merged with inline styles (inline wins).
   */
  static fromComponentDefinition(
    def: ComponentDefinition,
    screenId: string,
  ): FunnelElement[] {
    const cssRules = def.styles ? parseCss(def.styles) : new Map();
    const result: FunnelElement[] = [];
    ElementFactory._walk(def.elementTree, screenId, null, 0, cssRules, result);
    return result;
  }

  /**
   * Convert a single ElementNode into one FunnelElement.
   * Does NOT recurse — call fromComponentDefinition for a full tree.
   */
  static nodeToElement(
    node: ElementNode,
    screenId: string,
    parentId: string | null,
    order: number,
    cssRules: CssRuleMap,
  ): FunnelElement {
    const type = ElementFactory.inferElementType(node);
    const id = `${type}-${nanoid(8)}`;
    const styles = ElementFactory.mergeStyles(node.styles, cssRules, node);
    const editable = node.attributes['data-editable'] === 'true';

    return {
      id,
      screenId,
      parentId,
      order,
      type,
      tag: node.tag,
      classes: node.classes,
      content: node.content ?? '',
      styles,
      attributes: node.attributes,
      i18n: {},
      visibility: 'always',
      animation: 'none',
      locked: false,
      customCss: '',
      editable,
    };
  }

  /**
   * Infer the semantic ElementType from a node using three strategies:
   *   1. data-element-type attribute (direct mapping)
   *   2. HTML tag name
   *   3. CSS class names
   *   4. fallback: 'container' if children present, else 'custom'
   */
  static inferElementType(node: ElementNode): ElementType {
    // 1. data-element-type — direct
    const dataType = node.attributes['data-element-type'];
    if (dataType) {
      const mapped = DATA_TYPE_MAP[dataType];
      if (mapped) return mapped;
    }

    // 2. Tag-based
    const tagMapped = TAG_MAP[node.tag];
    if (tagMapped) return tagMapped;

    // 3. Class-based
    for (const cls of node.classes) {
      const classMapped = CLASS_MAP[cls];
      if (classMapped) return classMapped;
    }

    // 4. Structural fallback
    return node.children.length > 0 ? 'container' : 'custom';
  }

  /**
   * Merge CSS-rule styles with inline styles (inline overrides CSS rules).
   * Returns an ElementStyles dict.
   *
   * Strategy: iterate all selectors in cssRules and check whether a mock
   * element matching the node's tag + classes + id would match.  Since we
   * can't call Element.matches() outside the browser we use a lightweight
   * string-based selector matcher for the simple cases that appear in our
   * block-library components (tag, .class, tag.class combinations).
   */
  static mergeStyles(
    inlineStyles: Record<string, string>,
    cssRules: CssRuleMap,
    node: ElementNode,
  ): ElementStyles {
    const merged: ElementStyles = {};

    // Apply matched CSS rules first (lower priority)
    for (const [selector, decls] of cssRules.entries()) {
      if (ElementFactory._selectorMatches(selector, node)) {
        Object.assign(merged, decls);
      }
    }

    // Inline styles override (higher priority)
    Object.assign(merged, inlineStyles);

    return merged;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Recursive DFS walk that fills the flat `acc` array. */
  private static _walk(
    node: ElementNode,
    screenId: string,
    parentId: string | null,
    order: number,
    cssRules: CssRuleMap,
    acc: FunnelElement[],
  ): string {
    const el = ElementFactory.nodeToElement(node, screenId, parentId, order, cssRules);
    acc.push(el);

    node.children.forEach((child, idx) => {
      ElementFactory._walk(child, screenId, el.id, idx, cssRules, acc);
    });

    return el.id;
  }

  /**
   * Lightweight CSS selector matcher for simple selectors only:
   *   - element           e.g. "div"
   *   - .class            e.g. ".funnel-option"
   *   - element.class     e.g. "button.funnel-option"
   *   - #id               e.g. "#my-id"
   *   - Pseudo-classes / combinators / attribute selectors → skip (return false)
   */
  private static _selectorMatches(selector: string, node: ElementNode): boolean {
    const s = selector.trim();
    // Skip complex selectors
    if (/[\s>+~[\]:()]/.test(s)) return false;

    // Parse: optional tag, optional .class sequence, optional #id
    const m = s.match(/^([a-z][a-z0-9-]*)?((?:\.[a-z][a-z0-9_-]*)*)?(#[a-z][a-z0-9_-]*)?$/i);
    if (!m) return false;

    const [, tagPart, classPart, idPart] = m;

    if (tagPart && node.tag !== tagPart.toLowerCase()) return false;
    if (idPart && node.id !== idPart.slice(1)) return false;
    if (classPart) {
      const required = classPart.slice(1).split('.');
      for (const c of required) {
        if (!node.classes.includes(c)) return false;
      }
    }

    return !!(tagPart || classPart || idPart);
  }
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

/**
 * data-element-type values → ElementType.
 * Covers all data-element-type values used across block-library components.
 */
const DATA_TYPE_MAP: Record<string, ElementType> = {
  heading: 'heading',
  'heading-block': 'container',
  paragraph: 'paragraph',
  'paragraph-block': 'container',
  image: 'image',
  'image-block': 'container',
  spacer: 'spacer',
  divider: 'divider',
  'divider-block': 'container',
  'icon-text': 'container',
  icon: 'icon',
  label: 'paragraph',
  button: 'button',
  'submit-btn': 'button',
  'plan-btn': 'button',
  'back-btn': 'button',
  'close-btn': 'button',
  option: 'option',
  'option-text': 'paragraph',
  tile: 'option-tile',
  'tile-icon': 'icon',
  'tile-label': 'paragraph',
  'option-list': 'survey-options',
  'option-list-multi': 'survey-options',
  'option-tiles': 'survey-options',
  'rating-stars': 'survey-options',
  star: 'button',
  'nps-btn': 'button',
  nps: 'container',
  slider: 'input',
  'slider-block': 'container',
  'input-group': 'container',
  input: 'input',
  form: 'container',
  consent: 'container',
  'consent-text': 'paragraph',
  checkbox: 'custom',
  container: 'container',
  card: 'card',
  'flex-column': 'container',
  'flex-row': 'container',
  hero: 'hero-image',
  'hero-content': 'container',
  'sticky-bottom': 'container',
  countdown: 'timer',
  timer: 'timer',
  plans: 'paywall',
  plan: 'container',
  'plan-name': 'paragraph',
  'plan-price': 'container',
  badge: 'paragraph',
  guarantee: 'container',
  'discount-banner': 'container',
  'progress-bar': 'progress-bar',
  'progress-fill': 'custom',
  'progress-track': 'custom',
  header: 'container',
  'spinner-block': 'container',
  spinner: 'loader',
  'spinner-text': 'paragraph',
  'loader-text': 'paragraph',
  'loader-analyzing': 'loader',
  'analysis-loader': 'loader',
  'review-card': 'review',
  'review-text': 'paragraph',
  'reviewer-name': 'paragraph',
  'reviewer-meta': 'paragraph',
  stars: 'custom',
  counter: 'container',
  'counter-number': 'paragraph',
  'counter-label': 'paragraph',
  'result-score': 'container',
  'score-value': 'paragraph',
  'score-label': 'paragraph',
  'score-description': 'paragraph',
  'personality-result': 'container',
  'personality-type': 'paragraph',
  'personality-description': 'paragraph',
  trait: 'paragraph',
  screen: 'container',
  'screen-header': 'container',
  'screen-body': 'container',
  'steps-list': 'container',
  step: 'paragraph',
};

/** HTML tag → ElementType fallback. */
const TAG_MAP: Record<string, ElementType> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  p: 'paragraph',
  span: 'paragraph',
  img: 'image',
  button: 'button',
  input: 'input',
  textarea: 'input',
  select: 'input',
  label: 'container',
  hr: 'divider',
  video: 'video',
  iframe: 'custom',
  svg: 'custom',
  form: 'container',
  header: 'container',
  footer: 'footer',
  section: 'container',
  article: 'container',
  aside: 'container',
  main: 'container',
  nav: 'container',
  ul: 'container',
  ol: 'container',
  li: 'container',
};

/** CSS class → ElementType fallback. */
const CLASS_MAP: Record<string, ElementType> = {
  'funnel-option': 'option',
  'funnel-tile': 'option-tile',
  'funnel-options': 'survey-options',
  'funnel-tiles': 'survey-options',
  'funnel-multi-options': 'survey-options',
  'funnel-card': 'card',
  'funnel-heading': 'heading',
  'funnel-paragraph': 'paragraph',
  'funnel-image': 'image',
  'funnel-spacer': 'spacer',
  'funnel-divider': 'divider',
  'funnel-btn-primary': 'button',
  'funnel-sticky-btn': 'button',
  'funnel-slider': 'input',
  'funnel-input': 'input',
  'funnel-hero': 'hero-image',
  'funnel-countdown': 'timer',
  'funnel-spinner': 'loader',
  'funnel-plans': 'paywall',
  'funnel-progress': 'progress-bar',
  'funnel-review': 'review',
  'funnel-screen': 'container',
};
