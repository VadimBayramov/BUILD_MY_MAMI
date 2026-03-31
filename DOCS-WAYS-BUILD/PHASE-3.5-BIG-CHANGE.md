# PHASE 3.5 — Архитектурная переработка компонентной системы

> Капитальная доработка: правая панель свойств по типам, визуальные превью, парсер HTML, Custom HTML, drag & drop без ограничений, Save Styles.

**Предпосылки:** Phase 3 завершена — парсер, element-factory, html-generator работают. Но компонентная система неполноценна: единая правая панель для всех типов, нет визуальных превью, нет Save Styles, Custom HTML не функционален, drag элементов на заполненный экран невозможен.

---

## Оглавление

1. [Задача 1 — Правая панель: настройки по типу элемента](#задача-1--правая-панель-настройки-по-типу-элемента)
2. [Задача 2 — Визуальные превью и Save Styles](#задача-2--визуальные-превью-и-save-styles)
3. [Задача 3 — Визуальная иерархия категорий в левой панели](#задача-3--визуальная-иерархия-категорий-в-левой-панели)
4. [Задача 4 — Превью компонентов и индивидуальные настройки](#задача-4--превью-компонентов-и-индивидуальные-настройки)
5. [Задача 5 — Custom HTML (Raw HTML Block)](#задача-5--custom-html-raw-html-block)
6. [Задача 6 — HTML Parser Block (парсер кастомного HTML)](#задача-6--html-parser-block-парсер-кастомного-html)
7. [Задача 7 — Drag & Drop без ограничений](#задача-7--drag--drop-без-ограничений)
8. [Исправление бага кастомизации текста](#исправление-бага-кастомизации-текста)
9. [Архитектурные решения, требующие выбора](#архитектурные-решения-требующие-выбора)
10. [План реализации](#план-реализации)

---

## Задача 1 — Правая панель: настройки по типу элемента

### Проблема

`ElementProperties.tsx` рендерит одинаковый набор из 7 аккордеонов (Content, Typography, Spacing, Background, Border, Effects, Visibility) для **любого** типа элемента. У `heading` и `paywall` — идентичная панель, хотя heading нуждается только в тексте и типографике, а paywall — в настройках планов, цен и провайдеров.

### Решение: реестр секций по типу

Заменить монолитный `ElementProperties` на систему, где **каждый `ElementType` определяет свой набор секций**.

**Новый файл: `src/config/element-sections-config.ts`**

```typescript
import type { ElementType } from '@typedefs/funnel';

type SectionId =
  | 'content'        // текст, id
  | 'typography'     // шрифт, размер, цвет
  | 'spacing'        // margin, padding
  | 'background'     // цвет фона, изображение
  | 'border'         // рамка, скругление
  | 'effects'        // тень, прозрачность
  | 'visibility'     // показ/скрытие по условию
  | 'link'           // URL, target, rel
  | 'image'          // src, alt, objectFit
  | 'icon'           // иконка (emoji/SVG/URL)
  | 'list-style'     // стиль маркера (bullet/dash/icon)
  | 'button-action'  // навигация по клику, стиль кнопки
  | 'option-config'  // data-value, data-navigate-to, multi-select
  | 'input-config'   // placeholder, required, validation, mask
  | 'payment'        // планы, цены, провайдер, timer, trial
  | 'timer'          // duration, format, auto-redirect
  | 'loader'         // steps, duration, animation type
  | 'video'          // src, autoplay, controls, poster
  | 'raw-html'       // code editor (Monaco/CodeMirror)
  | 'layout'         // flex direction, gap, align
  | 'review'         // stars, author, avatar, text
  | 'counter'        // target number, duration, prefix/suffix
  | 'data-attrs';    // произвольные data-* атрибуты

interface SectionConfig {
  id: SectionId;
  defaultOpen?: boolean;
}

const ELEMENT_SECTIONS: Record<ElementType, SectionConfig[]> = {
  heading:     [
    { id: 'content', defaultOpen: true },
    { id: 'typography', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  subtitle:    [
    { id: 'content', defaultOpen: true },
    { id: 'typography', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  paragraph:   [
    { id: 'content', defaultOpen: true },
    { id: 'typography' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  'text-list': [
    { id: 'content', defaultOpen: true },
    { id: 'list-style', defaultOpen: true },
    { id: 'typography' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  'side-title': [
    { id: 'content', defaultOpen: true },
    { id: 'typography' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  'terms-title': [
    { id: 'content', defaultOpen: true },
    { id: 'link', defaultOpen: true },
    { id: 'typography' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  image:       [
    { id: 'image', defaultOpen: true },
    { id: 'spacing' },
    { id: 'border' },
    { id: 'effects' },
    { id: 'visibility' },
  ],
  button:      [
    { id: 'content', defaultOpen: true },
    { id: 'button-action', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'border' },
    { id: 'spacing' },
    { id: 'effects' },
    { id: 'visibility' },
  ],
  option:      [
    { id: 'content', defaultOpen: true },
    { id: 'option-config', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'border' },
    { id: 'visibility' },
  ],
  'option-tile': [
    { id: 'content', defaultOpen: true },
    { id: 'option-config', defaultOpen: true },
    { id: 'image' },
    { id: 'typography' },
    { id: 'background' },
    { id: 'border' },
    { id: 'visibility' },
  ],
  'survey-options': [
    { id: 'option-config', defaultOpen: true },
    { id: 'layout', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  input:       [
    { id: 'input-config', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'border' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  container:   [
    { id: 'layout', defaultOpen: true },
    { id: 'background' },
    { id: 'border' },
    { id: 'spacing' },
    { id: 'effects' },
    { id: 'visibility' },
  ],
  card:        [
    { id: 'layout', defaultOpen: true },
    { id: 'background' },
    { id: 'border' },
    { id: 'spacing' },
    { id: 'effects' },
    { id: 'visibility' },
  ],
  paywall:     [
    { id: 'payment', defaultOpen: true },
    { id: 'background' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  'raw-html':  [
    { id: 'raw-html', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  spacer:      [
    { id: 'spacing', defaultOpen: true },
    { id: 'visibility' },
  ],
  divider:     [
    { id: 'border', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  'progress-bar': [
    { id: 'background' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  icon:        [
    { id: 'icon', defaultOpen: true },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
#нужна возможность как подгружать видео файлы в папку, так и работать через ссыылку, загруженные файлы должны иметь возможность переиспользоваться как ссылки.  
  video:       [
    { id: 'video', defaultOpen: true },
    { id: 'spacing' },
    { id: 'border' },
    { id: 'visibility' },
  ],
  review:      [
    { id: 'review', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'border' },
    { id: 'visibility' },
  ],
  timer:       [
    { id: 'timer', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'visibility' },
  ],
  loader:      [
    { id: 'loader', defaultOpen: true },
    { id: 'typography' },
    { id: 'background' },
    { id: 'visibility' },
  ],
  'hero-image': [
    { id: 'image', defaultOpen: true },
    { id: 'layout' },
    { id: 'background' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  footer:      [
    { id: 'content', defaultOpen: true },
    { id: 'link' },
    { id: 'background' },
    { id: 'spacing' },
    { id: 'visibility' },
  ],
  custom:      [
    { id: 'raw-html', defaultOpen: true },
    { id: 'spacing' },
    { id: 'data-attrs' },
    { id: 'visibility' },
  ],
};
```

**Рефакторинг `ElementProperties.tsx`:**

```typescript
export function ElementProperties() {
  const element = /* ... */;
  const sections = ELEMENT_SECTIONS[element.type] ?? FALLBACK_SECTIONS;

  return (
    <div className={styles.panel}>
      <ElementHeader element={element} />
      {sections.map(({ id, defaultOpen }) => (
        <Accordion key={id} title={SECTION_LABELS[id]} defaultOpen={defaultOpen}>
          <SectionRenderer sectionId={id} element={element} />
        </Accordion>
      ))}
    </div>
  );
}
```

`SectionRenderer` — switch/map по `sectionId`, возвращает соответствующий React-компонент секции.

### Новые секции, которые нужно создать

| Секция | Файл | Поля |
|--------|------|------|
| `ButtonActionSection` | `sections/ButtonActionSection.tsx` | navigate-to (screen picker), action type (next/url/custom), style variant |
| `OptionConfigSection` | `sections/OptionConfigSection.tsx` | data-value, data-navigate-to, multi-select toggle |
| `InputConfigSection` | `sections/InputConfigSection.tsx` | placeholder, required, type (text/email/tel/number), mask, validation |
| `PaymentSection` | `sections/PaymentSection.tsx` | provider, plans editor, prices per-locale, timer, trial |
| `ImageSection` | `sections/ImageSection.tsx` | src (upload/URL), alt text, object-fit, aspect-ratio |
| `VideoSection` | `sections/VideoSection.tsx` | src, autoplay, controls, poster, loop |
| `IconSection` | `sections/IconSection.tsx` | icon picker (emoji/lucide/SVG/URL), size, color |
| `ListStyleSection` | `sections/ListStyleSection.tsx` | marker (bullet/dash/icon), icon picker для custom |
| `LinkSection` | `sections/LinkSection.tsx` | URL, target, link-type (terms/privacy/support/custom) |
| `TimerSection` | `sections/TimerSection.tsx` | duration, format (HH:MM:SS), auto-redirect |
| `LoaderSection` | `sections/LoaderSection.tsx` | steps list, step duration, animation type |
| `ReviewSection` | `sections/ReviewSection.tsx` | stars count, author, avatar, text |
| `LayoutSection` | `sections/LayoutSection.tsx` | flex-direction, gap, align-items, justify-content |
| `RawHtmlSection` | `sections/RawHtmlSection.tsx` | code editor (CodeMirror), live preview |
| `DataAttrsSection` | `sections/DataAttrsSection.tsx` | key-value список data-* атрибутов |

### Файлы, затрагиваемые изменениями

- `src/config/element-sections-config.ts` — **новый**
- `src/components/panels/ElementProperties.tsx` — рефакторинг (динамические секции)
- `src/components/panels/sections/` — 15 новых файлов секций
- Существующие секции (Typography, Spacing, etc.) — без изменений

---

## Задача 2 — Визуальные превью и Save Styles

### Проблема

В левой панели при раскрытии категории (например, Titles → Heading) видны только текстовые названия. Нет возможности увидеть, как выглядит элемент, нет разных стилей одного элемента, нет сохранения пользовательских стилей.

### Решение: превью + система сохранённых стилей

#### 2.1 Визуальное превью компонентов в левой панели

При наведении или раскрытии элемента в `BlockLibrary` — показывается мини-превью: HTML компонента рендерится в миниатюрном iframe (120×80px).

**Реализация:**

```
BlockLibrary
├── Category "Titles"
│   ├── Heading (текст)              ← при клике раскрывается ▼
│   │   ├── [мини-превью: default]   ← iframe 120×80, показывает HTML из heading.html
│   │   ├── [мини-превью: gradient]  ← heading-gradient.html
│   │   ├── [мини-превью: emoji]     ← heading-with-emoji.html
│   │   ├── ──── SAVED STYLES ────
│   │   ├── [мини-превью: "My Bold"] ← сохранённый пользовательский стиль
│   │   └── [мини-превью: "Clean"]   ← сохранённый пользовательский стиль
```

**Новый компонент: `BlockPreview.tsx`**

```
src/components/panels/
├── BlockPreview.tsx          ← рендерит HTML компонента в мини-iframe
├── BlockPreview.module.css
├── BlockVariantList.tsx      ← список вариантов + saved styles
└── BlockVariantList.module.css
```

`BlockPreview` получает HTML-строку компонента и рендерит её в `<iframe srcDoc={html} sandbox="..." />` внутри контейнера 120×80px с `pointer-events: none`.

#### 2.2 Система Save Styles

**Концепция:** Пользователь настраивает элемент на экране → в правой панели кнопка "Save as Style" → сохраняет текущие `element.styles` + `element.content` как именованный стиль для данного `ElementType`.

**Структура хранения:**

```typescript
interface SavedStyle {
  id: string;
  name: string;
  elementType: ElementType;
  styles: ElementStyles;
  content: string;
  classes: string[];
  previewHtml: string;      // сгенерированный HTML для мини-превью
  createdAt: number;
}

// В store:
interface FunnelState {
  savedStyles: Record<string, SavedStyle>;  // id → SavedStyle
}
```

**Persisting:** `savedStyles` сохраняются в IndexedDB (Dexie) рядом с проектом. При экспорте — включаются в бандл. Saved Styles — **глобальные**, доступны во всех воронках.

**UI flow:**

1. Пользователь выбирает элемент на экране
2. В правой панели (вверху, рядом с заголовком типа) — кнопка `⭐ Save Style`
3. Появляется инпут для имени стиля → `Save`
4. Стиль появляется в левой панели под соответствующим типом в секции "SAVED STYLES"
5. Drag saved style на экран → создаётся элемент с сохранёнными стилями

**Применение к существующему элементу:**

- Правый клик на saved style → "Apply to selected" → перезаписывает `element.styles` выбранного элемента
- Или drag saved style на существующий элемент → apply

### Файлы

| Файл | Тип | Назначение |
|------|-----|-----------|
| `src/components/panels/BlockPreview.tsx` | новый | Мини-iframe превью |
| `src/components/panels/BlockVariantList.tsx` | новый | Список вариантов + saved styles |
| `src/components/panels/BlockLibrary.tsx` | изменение | Интеграция превью при раскрытии |
| `src/components/panels/BlockLibraryItem.tsx` | изменение | Раскрываемый элемент |
| `src/config/saved-styles-config.ts` | новый | SavedStyle тип + store actions |
| `src/store/slices/styles-slice.ts` | новый | CRUD saved styles |
| `src/components/panels/sections/SaveStyleButton.tsx` | новый | Кнопка "Save as Style" |

---

## Задача 3 — Визуальная иерархия категорий в левой панели

### Проблема

Все категории в `BlockLibrary` отображаются одинаковым размером шрифта и цветом. Невозможно визуально отличить Titles от Payment. Нет иерархии.

### Решение: типографика + цветовые акценты

**3 уровня визуальной дифференциации:**

| Уровень | Пример | Размер | Вес | Цвет |
|---------|--------|--------|-----|------|
| **Основные** | Titles, Layout, Interactive | 14px | 600 (semibold) | `#e2e8f0` (light slate) |
| **Функциональные** | Forms, Payment, Navigation | 13px | 500 (medium) | `#94a3b8` (slate-400) |
| **Дополнительные** | Feedback, Results, Custom HTML | 12px | 400 (normal) | `#64748b` (slate-500) |

**Цветовые маркеры-точки** (слева от иконки категории):

| Категория | Цвет точки |
|-----------|-----------|
| Titles | `#3b82f6` (blue) |
| Interactive | `#8b5cf6` (violet) |
| Layout | `#06b6d4` (cyan) |
| Forms | `#f59e0b` (amber) |
| Payment | `#10b981` (emerald) |
| Social Proof | `#ec4899` (pink) |
| Navigation | `#6366f1` (indigo) |
| Feedback | `#f97316` (orange) |
| Results | `#14b8a6` (teal) |
| Templates | `#a855f7` (purple) |
| Custom HTML | `#ef4444` (red) |

**Реализация в `BlockLibrary.module.css`:**

Добавить CSS-классы `.categoryTier1`, `.categoryTier2`, `.categoryTier3` с соответствующей типографикой. В `CATEGORY_META` добавить поле `tier: 1 | 2 | 3` и `accentColor: string`.

### Файлы

- `src/components/panels/BlockLibrary.tsx` — добавить tier + accentColor в CATEGORY_META
- `src/components/panels/BlockLibrary.module.css` — стили иерархии

---

## Задача 4 — Превью компонентов и индивидуальные настройки

### Проблема

У компонентов нет визуального превью в панели. Все компоненты показывают только текстовое название. При перетаскивании непонятно, как будет выглядеть элемент.

### Решение

Это решается комплексно задачами 1 + 2:
- **Задача 1** — индивидуальные настройки для каждого типа
- **Задача 2** — визуальные превью

Дополнительно — **hover-превью**: при наведении на элемент в BlockLibrary появляется увеличенный preview (240×160px) с tooltip-описанием.

**Реализация:**

```
<BlockLibraryItem>
  onMouseEnter → fetch HTML (getOrFetch) → показать tooltip с BlockPreview(240×160)
  onMouseLeave → скрыть tooltip
</BlockLibraryItem>
```

Tooltip позиционируется справа от панели (не перекрывая). Используем `position: fixed` + расчёт координат.

### Файлы

- `src/components/panels/BlockLibraryItem.tsx` — hover logic
- `src/components/panels/BlockPreviewTooltip.tsx` — новый, увеличенный превью
- `src/components/panels/BlockPreviewTooltip.module.css` — новый

---

## Задача 5 — Custom HTML (Raw HTML Block)

### Проблема

Компонент `raw-html` создаётся с заглушкой `<!-- paste your HTML here -->`. В правой панели — обычная textarea (`ElementContentSection`), которая:
1. Не рендерит HTML визуально на экране
2. Не подсвечивает синтаксис
3. Не отображает результат вставленного кода
4. По сути — мёртвый блок

### Решение: полноценный Raw HTML блок

#### 5.1 Правая панель для raw-html: Code Editor

Вместо textarea — встроенный code editor. Два варианта:

**Вариант A — CodeMirror 6 (рекомендуемый):**
- Легковесный (~50KB gzipped для базовой сборки)
- Подсветка HTML/CSS/JS
- Уже используется в подобных билдерах
- Extensible (autocompletion, linting)

**Вариант B — Monaco Editor:**
- Тяжелее (~2MB), но полнофункциональный
- Есть опыт из режима разработчика
- Может быть избыточен для одного блока

**Секция `RawHtmlSection.tsx`:**

```
┌──────────────────────────────────┐
│ Raw HTML                         │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ <div class="my-block">      │ │ ← code editor (CodeMirror)
│ │   <h2>Custom Title</h2>     │ │    с подсветкой синтаксиса
│ │   <p>Content here</p>       │ │    height: 200-400px, resizable
│ │ </div>                      │ │
│ │                              │ │
│ │ <style>                     │ │
│ │   .my-block { ... }         │ │
│ │ </style>                    │ │
│ └──────────────────────────────┘ │
│                                  │
│ [▶ Preview]   [Apply Changes]    │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  Live preview (sandboxed)    │ │ ← iframe с результатом
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### 5.2 Рендеринг raw-html на экране

`html-generator.ts` для элементов с `type === 'raw-html'` — вставляет `element.content` **as-is** (без экранирования) в `<div data-element="..." data-element-type="raw-html">`:

```html
<div data-element="raw-html-xK9mPq2r" data-element-type="raw-html" class="funnel-raw-html">
  <!-- содержимое element.content вставляется без изменений -->
  <div class="my-block">
    <h2>Custom Title</h2>
    <p>Content here</p>
  </div>
  <style>.my-block { ... }</style>
</div>
```

`<style>` теги из raw-html scope-ятся через обёртку `.funnel-raw-html[data-element="ID"] { ... }` — чтобы стили не текли на другие элементы.

#### 5.3 Безопасность

- `<script>` теги из raw-html **НЕ** выполняются в preview (sandbox iframe без `allow-scripts` для raw-html content)
- При экспорте: `<script>` сохраняются как есть (пользователь берёт ответственность)
- Inline `onclick`, `onerror` и прочие event handlers — стриппятся в preview, сохраняются при экспорте

### Файлы

| Файл | Тип | Назначение |
|------|-----|-----------|
| `src/components/panels/sections/RawHtmlSection.tsx` | новый | Code editor + preview |
| `src/components/panels/sections/RawHtmlSection.module.css` | новый | Стили |
| `src/services/html-generator.ts` | изменение | raw-html рендеринг |
| `src/services/html-sanitizer.ts` | новый | Санитизация для preview |
| `package.json` | изменение | + `@codemirror/lang-html` |

---

## Задача 6 — HTML Parser Block (парсер кастомного HTML)

### Проблема

Нет инструмента, который позволяет вставить целый HTML-экран и автоматически разбить его на отдельные компоненты для использования в билдере.

### Решение: HTML Parser Drop Zone в левой панели

#### 6.1 UI — блок парсера

Располагается между строкой поиска и списком категорий в `BlockLibrary`:

```
┌─────────────────────────────────┐
│ 🔍 Search blocks...             │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │    📋 Paste or drop HTML    │ │ ← drop zone
│ │    to parse into blocks     │ │    (drag .html файл или Ctrl+V)
│ │                             │ │
│ │    [Paste from clipboard]   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  ── PARSED BLOCKS (3) ──       │ ← появляется после парсинга
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  [мини-превью: header]   │ │ ← draggable, с мини-превью
│  │  header-block             │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  [мини-превью: content]  │ │
│  │  content-section          │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  [мини-превью: footer]   │ │
│  │  footer-block             │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                 │
│  [Save All to Library]         │ ← сохранить всё в imported/
├─────────────────────────────────┤
│ 📂 Titles                    7 │
│ 📂 Layout                    9 │
│ ...                             │
```

#### 6.2 Алгоритм "умного" разбиения HTML на блоки

**`src/services/html-splitter.ts`** — новый сервис:

```typescript
interface ParsedBlock {
  id: string;
  name: string;
  html: string;
  styles: string;
  previewHtml: string;
  suggestedCategory: string;
  suggestedType: ElementType;
}

function splitHtmlIntoBlocks(html: string): ParsedBlock[];
```

**Алгоритм разбиения:**

1. `DOMParser` → `Document`
2. Собрать все `<style>` в общий CSS
3. Взять `body.children` — каждый top-level элемент = потенциальный блок
4. Для каждого top-level элемента:
   - Если `<header>`, `<nav>`, `<footer>` → отдельный блок
   - Если `<section>`, `<article>`, `<div>` с классом → отдельный блок
   - Если `<form>` → form-блок
   - Мелкие inline-элементы (`<span>`, `<a>`, текст) — группируются с предыдущим блоком
5. Каждому блоку:
   - Присвоить имя по tag/class/id
   - Определить `suggestedCategory` по содержимому (есть кнопки → interactive, есть img → media, и т.д.)
   - Вырезать из общего CSS только релевантные правила (по селекторам, matchящим элементы блока)
   - Сгенерировать `previewHtml` = HTML блока + его CSS

#### 6.3 Сохранение в библиотеку

При клике "Save" на parsed block → диалог:
- Выбор категории (dropdown с существующими + "Create new")
- Имя компонента (editable)
- `Save` → записывается в `block-library/imported/{name}.html` (dev) или в IndexedDB (production)
- Появляется в каталоге `BlockLibrary` под выбранной категорией

#### 6.4 Drag parsed blocks на экран

Parsed blocks — draggable (через dnd-kit, аналогично `BlockLibraryItem`). При drop на экран → `ComponentParser.parse(block.html)` → `ElementFactory` → `addElementsBatch`.

### Файлы

| Файл | Тип | Назначение |
|------|-----|-----------|
| `src/services/html-splitter.ts` | новый | Алгоритм разбиения HTML на блоки |
| `src/components/panels/HtmlParserDropZone.tsx` | новый | UI зона парсинга |
| `src/components/panels/HtmlParserDropZone.module.css` | новый | Стили |
| `src/components/panels/ParsedBlockItem.tsx` | новый | Один parsed block (draggable + preview) |
| `src/components/panels/SaveBlockDialog.tsx` | новый | Диалог сохранения в библиотеку |
| `src/components/panels/BlockLibrary.tsx` | изменение | Интеграция HtmlParserDropZone |
| `src/store/slices/funnel-slice.ts` | изменение | action для сохранения imported blocks |

---

## Задача 7 — Drag & Drop без ограничений

### Проблема

1. Элементы не переносятся на заполненный экран
2. Нет возможности перемещать элементы между экранами
3. Нет точной вставки в позицию курсора

### Причины текущих ограничений

- `ScreenNode` использует `useDroppable` с единым ID экрана — нет гранулярности вставки
- При полном экране dnd-kit не находит drop target внутри скроллируемого iframe
- Отсутствует `moveElementToScreen` в DnD flow (есть только в store, не подключён)

### Решение

#### 7.1 Drop на экран: insertion point indicator

Вместо single droppable на весь экран → **каждый элемент overlay и промежуток между ними — отдельный droppable**.

**Реализация: Drop Indicator (линия-подсказка)**

При drag элемента из BlockLibrary над экраном:
- Overlay поверх iframe показывает горизонтальную линию (2px, синий) в месте, куда будет вставлен элемент
- Линия рассчитывается по Y-позиции мыши относительно элементов на экране
- Используем `recomputeLayout()` (уже есть в ScreenNode) для получения позиций

```
┌─────────────────────┐
│  Heading             │
│  ─────── ← вставка  │ ← синяя линия insertion indicator
│  Paragraph           │
│  Button              │
│  ...                 │
└─────────────────────┘
```

**Insertion logic:**
1. При dragOver → читаем Y позиции всех элементов из `OverlayBox[]`
2. Находим ближайший промежуток → `insertionIndex`
3. При drop → `addElementsBatch` с `order = insertionIndex`, сдвиг order у последующих

#### 7.2 Перемещение элементов между экранами (Alt + drag)

**Механика:**
- Alt + mousedown на overlay элемента → начинается cross-screen drag
- Элемент визуально "отрывается" от экрана (clone следует за мышью)
- При наведении на другой экран → drop indicator появляется
- При release → `moveElementToScreen(elementId, targetScreenId, insertionIndex)`

**Реализация:**
- Новый drag mode в `ScreenNode`: `isDragMode === 'cross-screen'` (при Alt+mousedown)
- `DndContext` в `AppShell` уже общий — позволяет drag между screen nodes
- Добавить `onDragOver` на каждый `ScreenNode` для insertion indicator
- В `handleDragEnd` — проверить: если source screenId !== target screenId → `moveElementToScreen`

#### 7.3 Неограниченное количество элементов

Текущая проблема "не влезает" — из-за overflow constraints в iframe. Исправление:
- iframe всегда `overflow-y: auto` (уже есть в PREVIEW_STYLE)
- droppable zone = весь scrollHeight iframe, не только viewport
- При drop в нижнюю часть → auto-scroll iframe вниз

### Файлы

| Файл | Тип | Назначение |
|------|-----|-----------|
| `src/components/map-mode/ScreenNode.tsx` | изменение | Drop indicator + cross-screen drag |
| `src/components/map-mode/DropIndicator.tsx` | новый | Визуальная линия вставки |
| `src/components/map-mode/DropIndicator.module.css` | новый | Стили |
| `src/hooks/useDragAndDrop.ts` | изменение | Cross-screen move + insertion index |
| `src/store/slices/funnel-slice.ts` | проверить | `moveElementToScreen` уже есть |

---

## Исправление бага кастомизации текста

### Проблема

При редактировании текста в правой панели (`ElementContentSection`) → текст сохраняется как innerHTML (с тегами `<b>`, `<i>`, etc.). При повторном открытии textarea показывает HTML-теги вместо визуального текста: `<strike><font color="#7f68df">Add your body text here...</font></strike>`.

### Причина

`ElementContentSection` использует `<textarea>` для редактирования `element.content`, который хранит innerHTML (богатый текст с HTML-тегами). Textarea не рендерит HTML — показывает сырые теги.

### Решение: разделение по типу содержимого

**Правило:** Для каждого типа элемента — свой редактор контента:

| Тип элемента | Редактор в правой панели | Хранение content |
|--------------|-------------------------|-----------------|
| heading, subtitle, paragraph | `contenteditable div` + floating toolbar | innerHTML (`<b>bold</b>`) |
| button, option | Plain text input | plain text |
| text-list | Список инпутов (один на каждый пункт) | JSON `["item1","item2"]` или innerHTML |
| terms-title | `contenteditable` + link editor | innerHTML с `<a>` тегами |
| side-title | Plain text input | plain text (каждая буква = строка) |
| raw-html | Code editor (CodeMirror) | raw HTML |
| image | Image picker (не текст) | src URL |

**Рефакторинг `ElementContentSection`:**

Вместо единой textarea — `ContentEditor` компонент, который рендерит разный UI в зависимости от `element.type`:

```typescript
function ContentEditor({ element }: Props) {
  switch (element.type) {
    case 'heading':
    case 'subtitle':
    case 'paragraph':
    case 'terms-title':
      return <RichTextEditor element={element} />;

    case 'button':
    case 'option':
    case 'side-title':
      return <PlainTextInput element={element} />;

    case 'text-list':
      return <ListItemsEditor element={element} />;

    case 'raw-html':
    case 'custom':
      return <CodeEditor element={element} />;

    case 'image':
      return <ImagePicker element={element} />;

    default:
      return <PlainTextInput element={element} />;
  }
}
```

**`RichTextEditor`** — `contenteditable div` (как на экране), с тем же floating toolbar. Сохраняет innerHTML.

**`PlainTextInput`** — обычный `<input>`. Стриппит HTML-теги при вставке.

**`ListItemsEditor`** — список `<input>` для каждого элемента списка. Кнопки +/- для добавления/удаления.

### Файлы

| Файл | Тип |
|------|-----|
| `src/components/panels/sections/ElementContentSection.tsx` | рефакторинг |
| `src/components/panels/sections/editors/RichTextEditor.tsx` | новый |
| `src/components/panels/sections/editors/PlainTextInput.tsx` | новый |
| `src/components/panels/sections/editors/ListItemsEditor.tsx` | новый |
| `src/components/panels/sections/editors/CodeEditor.tsx` | новый |
| `src/components/panels/sections/editors/ImagePicker.tsx` | новый |

---

## Архитектурные решения, требующие выбора

### Вопрос 1: Code editor для Raw HTML

| Вариант | Размер бандла | Фичи | Рекомендация |
|---------|--------------|-------|-------------|
| **CodeMirror 6** | ~50KB gzip | Подсветка, авто-закрытие тегов, fold | ✅ Рекомендую |
| **Monaco Editor** | ~2MB gzip | Полноценная IDE (intellisense, minimap) | Избыточно для одной секции |
| **Prism.js + textarea** | ~10KB | Только подсветка (readonly), редактирование — обычная textarea | Минимально, но не удобно |

> **Нужен выбор:** CodeMirror 6 vs Monaco? Или Prism + textarea для начала?

### Вопрос 2: Хранение Saved Styles

| Вариант | Scope | Плюсы | Минусы |
|---------|-------|-------|--------|
| **A) В проекте (IndexedDB)** | Per-project | Стили привязаны к проекту, экспортируются вместе | Не переиспользуемы между проектами |
| **B) Глобально (отдельная IndexedDB таблица)** | Все проекты | Один раз настроил — везде доступно | Нужна отдельная синхронизация |
| **C) Гибрид: глобальные + per-project** | Оба | Максимальная гибкость | Сложнее UI (две секции) |

> **Нужен выбор:** Где хранить saved styles?

### Вопрос 3: HTML Parser — глубина разбиения

| Вариант | Глубина | Пример |
|---------|---------|--------|
| **A) Top-level only** | depth 1 | Каждый прямой child `<body>` = блок. Простая логика |
| **B) Smart split** | depth 2-3 | Анализирует вложенность, разбивает секции с `<section>`, `<article>`, крупные `<div>` на подблоки |
| **C) Full recursive** | any | Каждый визуально значимый элемент — отдельный блок. Много мелких блоков |

> **Нужен выбор:** Какая глубина разбиения парсером? Рекомендую B — smart split.

### Вопрос 4: Cross-screen drag — клавиша-модификатор

| Вариант | Клавиша | Плюсы |
|---------|---------|-------|
| **A) Alt + drag** | Alt | Не конфликтует с обычным drag. Интуитивно |
| **B) Ctrl + drag** | Ctrl | Привычно из файловых менеджеров (копирование) |
| **C) Просто drag (авто-определение)** | нет | Если drag выходит за границы экрана → cross-screen |

> **Нужен выбор:** Какой модификатор для cross-screen drag? Рекомендую A (Alt).

### Вопрос 5: Превью в левой панели — когда загружать HTML?

| Вариант | Когда fetch | Плюсы | Минусы |
|---------|-------------|-------|--------|
| **A) При раскрытии категории** | lazy, по click | Минимальный трафик | Задержка при первом раскрытии |
| **B) При hover на элемент** | lazy, по hover | Ещё экономнее | Заметная задержка |
| **C) Все при инициализации** | eager, при старте | Мгновенные превью | +50 fetches при старте |
| **D) Thumbnail images вместо live preview** | при сборке | Мгновенно, без iframe | Нужен build step для генерации thumbnail |

> **Нужен выбор:** Стратегия загрузки превью? Рекомендую A — при раскрытии категории.

### Вопрос 6: Scoping CSS в Raw HTML

| Вариант | Метод | Плюсы | Минусы |
|---------|-------|-------|--------|
| **A) Shadow DOM** | `attachShadow()` | Полная изоляция CSS | Сложнее стилизовать извне, потенциальные проблемы с iframe |
| **B) CSS prefix** | Авто-префикс селекторов `[data-element="id"] .class` | Простая реализация | Не идеальная изоляция (global selectors могут утечь) |
| **C) iframe-in-iframe** | Отдельный iframe для raw-html блока | Полная изоляция | Тяжело, проблемы с высотой |

> **Нужен выбор:** Как изолировать CSS raw-html блоков? Рекомендую B — CSS prefix (простота + достаточная изоляция).

---

## План реализации

### Фаза 3.5.1 — Фундамент (приоритет: критический)

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 1 | Конфиг секций по типу элемента (`element-sections-config.ts`) | — | 2ч |
| 2 | Рефакторинг `ElementProperties` → динамические секции + `SectionRenderer` | #1 | 3ч |
| 3 | Фикс бага текста: `ContentEditor` → RichTextEditor / PlainTextInput | — | 4ч |
| 4 | `RawHtmlSection` с CodeMirror + live preview | — | 4ч |

### Фаза 3.5.2 — Визуальная часть левой панели

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 5 | Визуальная иерархия категорий (tier + цвета) | — | 1ч |
| 6 | `BlockPreview` — мини-iframe превью | — | 3ч |
| 7 | Раскрываемые элементы с превью вариантов | #6 | 3ч |
| 8 | Hover-tooltip с увеличенным превью | #6 | 2ч |

### Фаза 3.5.3 — Save Styles

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 9 | `styles-slice.ts` — store для saved styles (CRUD + IndexedDB) | — | 3ч |
| 10 | `SaveStyleButton` в правой панели | #9 | 2ч |
| 11 | Saved styles в левой панели под каждым типом | #9, #6 | 3ч |
| 12 | Drag saved style → apply на элемент | #9, #11 | 2ч |

### Фаза 3.5.4 — Новые секции правой панели

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 13 | `ButtonActionSection` + `OptionConfigSection` | #2 | 3ч |
| 14 | `InputConfigSection` + `ImageSection` | #2 | 3ч |
| 15 | `PaymentSection` (планы, цены, провайдеры) | #2 | 6ч |
| 16 | `LinkSection` + `ListStyleSection` + `IconSection` | #2 | 3ч |
| 17 | `TimerSection` + `LoaderSection` + `ReviewSection` | #2 | 3ч |
| 18 | `LayoutSection` + `DataAttrsSection` | #2 | 2ч |

### Фаза 3.5.5 — HTML Parser и Custom HTML

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 19 | `html-splitter.ts` — алгоритм разбиения HTML на блоки | — | 5ч |
| 20 | `HtmlParserDropZone` — UI парсера в левой панели | #19 | 4ч |
| 21 | `ParsedBlockItem` — draggable блоки + мини-превью | #19, #6 | 3ч |
| 22 | `SaveBlockDialog` — сохранение в библиотеку | #21 | 2ч |
| 23 | Raw HTML block — корректный рендеринг на экране + scoping CSS | #4 | 3ч |

### Фаза 3.5.6 — Drag & Drop без ограничений

| # | Задача | Зависимости | Оценка |
|---|--------|-------------|--------|
| 24 | `DropIndicator` — линия вставки при drag | — | 3ч |
| 25 | Insertion point logic (расчёт позиции по Y) | #24 | 3ч |
| 26 | Неограниченный drop на заполненный экран | #25 | 2ч |
| 27 | Cross-screen drag (Alt + drag) | #25 | 4ч |
| 28 | Auto-scroll iframe при drag в нижнюю часть | #25 | 2ч |

### Порядок и зависимости

```
Фаза 3.5.1 (фундамент)     ← ПЕРВАЯ, блокирует остальные
    │
    ├── Фаза 3.5.2 (визуал панели) ← независима
    │
    ├── Фаза 3.5.3 (save styles)   ← зависит от 3.5.2 (#6)
    │
    ├── Фаза 3.5.4 (новые секции)  ← зависит от 3.5.1 (#2)
    │
    ├── Фаза 3.5.5 (parser + custom html) ← частично независима
    │
    └── Фаза 3.5.6 (drag & drop)   ← независима
```

**Итого оценка: ~80 часов работы**

Фазы 3.5.2, 3.5.5, 3.5.6 можно вести параллельно после завершения 3.5.1.

---

## Изменения в DOCS_ARCHITECTURE.md

Следующие секции архитектурного документа нужно обновить после реализации:

1. **§8.2 (Правая панель)** — заменить единый шаблон на описание системы секций по типу
2. **§8.1 (Левая панель)** — добавить HTML Parser Block, визуальную иерархию, превью
3. **§10 (Добавление компонентов)** — добавить Save Styles, HTML splitter
4. **§16.6 (Inline-редактирование)** — описать fix бага с textarea → contenteditable
5. **§3 (Система компонентов)** — добавить `SavedStyle` тип
6. **§6 (Архитектура состояния)** — добавить `savedStyles` в state tree
7. **§15 (Файловая структура)** — новые файлы

---

## Чеклист перед началом

- [ ] Выбрать code editor (CodeMirror 6 vs Monaco)
- [ ] Выбрать стратегию хранения saved styles (per-project vs global)
- [ ] Выбрать глубину парсера HTML (top-level vs smart split)
- [ ] Выбрать клавишу для cross-screen drag (Alt vs Ctrl)
- [ ] Выбрать стратегию загрузки превью (при раскрытии vs hover)
- [ ] Выбрать метод scoping CSS для raw-html (prefix vs shadow DOM)
