# Фаза 3 — Парсер HTML, стили и живой рендеринг

## Что мы строим

Ядро билдера: превращение HTML-файлов компонентов в живые редактируемые экраны воронки. Пользователь дропает компонент из BlockLibrary → парсер разбирает его HTML → создаётся дерево `FunnelElement` → из дерева генерируется HTML для preview/экспорта. Вся цепочка работает в обе стороны.

**Результат Фазы 3:**

- HTML-файлы компонентов из `block-library/` парсятся в `FunnelElement[]` при drop на canvas
- CSS из `<style>` блоков компонентов разбирается и применяется к элементам
- Панель глобальных стилей (CSS-переменные) редактирует весь дизайн воронки
- Per-screen CSS overrides работают через GUI
- Изменение стилей в панели → мгновенное обновление elements tree
- `ComponentRegistry` загружает HTML-файлы по требованию (lazy fetch)
- HTML-генератор собирает корректный HTML из elements tree для preview
- Удалены seed-элементы из `defaults.ts` — реальные элементы из парсера

**На чём опираемся:**

- `DOCS_ARCHITECTURE.md` §4 (Парсинг HTML / Стилей), §3 (Система компонентов), §10 (HTML-файлы компонентов)
- Существующие заглушки: `html-parser.ts`, `css-parser.ts`, `html-generator.ts`, `css-utils.ts`
- `ComponentRegistry` с manifest-методами (Phase 2)
- Типы: `FunnelElement`, `ElementStyles`, `ComponentDefinition`, `ElementNode`, `ParsedScreen`
- Store: `funnel-slice.ts` с `addScreen`, `updateElement`, `updateElementStyle`

---

## Предусловия (из Phase 2)

| # | Что должно быть готово | Статус |
|---|------------------------|--------|
| 1 | `block-library/component-manifest.json` — 41 запись | ✅ Phase 2 |
| 2 | `ComponentRegistry` — `loadFromManifest()`, `search()`, `get()`, `register()` | ✅ Phase 2 |
| 3 | BlockLibrary → Canvas DnD — `addScreen` при drop | ✅ Phase 2 |
| 4 | `ElementProperties` — 7 секций (Content, Typography, Spacing, Background, Border, Effects, Visibility) | ✅ Phase 2 |
| 5 | `ScreenProperties` — 4 секции (General, Navigation, Appearance, Social) | ✅ Phase 2 |
| 6 | Типы `FunnelElement`, `ElementStyles`, `Screen`, `GlobalStyles` | ✅ Phase 1 |
| 7 | Seed-элементы в `defaults.ts` (временные, Phase 3 заменяет) | ✅ Phase 2 |

---

## Шаги Фазы 3

### Шаг 1 — HTML-файлы компонентов (block-library)

**Файлы:**

- `block-library/content/heading.html` — компонент заголовка
- `block-library/content/paragraph.html` — параграф
- `block-library/content/image.html` — изображение
- `block-library/content/spacer.html` — пустой разделитель
- `block-library/interactive/button-primary.html` — кнопка
- `block-library/interactive/option-list.html` — список опций
- `block-library/interactive/option-tiles.html` — тайлы опций
- `block-library/interactive/input-field.html` — поле ввода
- `block-library/interactive/email-form.html` — форма email
- `block-library/layout/container.html` — контейнер
- `block-library/layout/card.html` — карточка
- `block-library/layout/hero-section.html` — герой-секция
- `block-library/layout/footer.html` — подвал
- `block-library/templates/survey-screen.html` — полный шаблон экрана survey
- `block-library/templates/result-screen.html` — шаблон экрана результатов
- `block-library/templates/paywall-screen.html` — шаблон экрана оплаты
- `block-library/custom/raw-html.html` — блок произвольного HTML

**Формат каждого файла (по §10.1 архитектуры):**

```html
<!--
  @component: option-list
  @category: interactive
  @tags: survey, options, selection
  @description: Vertical list of selectable options
  @thumbnail: /thumbnails/option-list.png
  @version: 1.0
-->
<div class="funnel-options"
     data-component="option-list"
     data-component-category="interactive">

  <button class="funnel-option"
          data-element-type="option"
          data-value=""
          data-navigate-to=""
          data-editable="true">
    Option text
  </button>
  <!-- ...ещё опции... -->
</div>

<style>
  .funnel-options { display: flex; flex-direction: column; gap: 12px; }
  .funnel-option { ... }
</style>
```

**Что реализуем:**

- Минимум 17 HTML-файлов по категориям из манифеста
- Каждый файл содержит HTML-комментарий с мета-данными, `data-*` атрибуты, `<style>` блок
- Все компоненты используют CSS-переменные (`var(--bg)`, `var(--accent)`, etc.)
- `data-element-type` на каждом редактируемом узле
- `data-editable="true"` для редактируемых элементов

**Критерий готовности:**

- [ ] 17+ HTML-файлов создано в `block-library/` по подкаталогам
- [ ] Каждый файл содержит `@component` комментарий + `<style>` блок
- [ ] Все CSS-переменные из `GlobalStyles` используются (не хардкод цветов)
- [ ] `pnpm type-check` — 0 ошибок
- [ ] Ручная проверка: открыть любой `.html` файл в браузере → рендерится визуально корректно

---

### Шаг 2 — ComponentParser (HTML → ComponentDefinition)

**Файлы:**

- `src/services/component-parser.ts` — **новый**, центральный парсер компонентов
- `src/services/html-parser.ts` — рефакторинг: используется ComponentParser
- `src/services/css-parser.ts` — без изменений (уже рабочий)

**Что реализуем:**

`ComponentParser` — static-класс, который превращает HTML-строку компонента в `ComponentDefinition`:

```typescript
interface ComponentParser {
  static parse(htmlString: string): ComponentDefinition;
  static parseMetaComment(html: string): ComponentMeta;
  static buildElementTree(node: Element): ElementNode;
  static parseStyles(doc: Document): string;
  static parseScripts(doc: Document): string;
  static getDataAttributes(node: Element): Record<string, string>;
  static getInlineStyles(node: Element): Record<string, string>;
}
```

Алгоритм (по §10.2 архитектуры):

1. `DOMParser().parseFromString(html, 'text/html')` → `Document`
2. `parseMetaComment()` — regex `@component`, `@category`, `@tags`, `@description`, `@thumbnail`, `@version`
3. Извлечь корневой элемент (`doc.body.firstElementChild`)
4. `parseStyles(doc)` — собрать все `<style>` блоки, вернуть как строку
5. `parseScripts(doc)` — собрать `<script>` (если есть)
6. `buildElementTree(rootElement)` — рекурсивный обход DOM:
   - `tag`, `id`, `classes`, `data-*` атрибуты
   - inline styles через `element.style` / `getAttribute('style')`
   - `content` — только прямой текст (`childNodes[TEXT_NODE]`)
   - `children` — рекурсивно, пропуская `<style>` и `<script>`

**Критерий готовности:**

- [ ] `ComponentParser.parse(htmlString)` возвращает корректный `ComponentDefinition`
- [ ] Мета-данные извлекаются из HTML-комментария
- [ ] Дерево элементов строится рекурсивно с правильной глубиной
- [ ] Inline-стили и `data-*` атрибуты парсятся корректно
- [ ] Тест: парсинг `option-list.html` → `meta.component === 'option-list'`, `elementTree.children.length >= 2`
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все тесты зелёные (39 старых + N новых)

---

### Шаг 3 — ComponentDefinition → FunnelElement[] (маппинг)

**Файлы:**

- `src/services/element-factory.ts` — **новый**, конвертер ElementNode → FunnelElement[]
- `src/types/component.ts` — без изменений

**Что реализуем:**

`ElementFactory` — преобразует `ElementNode` (из парсера) в flat-список `FunnelElement[]` для store:

```typescript
interface ElementFactory {
  static fromComponentDefinition(
    def: ComponentDefinition,
    screenId: string
  ): FunnelElement[];

  static nodeToElement(
    node: ElementNode,
    screenId: string,
    parentId: string | null,
    order: number,
    cssRules: CssRuleMap
  ): FunnelElement;

  static inferElementType(node: ElementNode): ElementType;
  static mergeStyles(
    inlineStyles: Record<string, string>,
    cssRules: CssRuleMap,
    node: ElementNode
  ): ElementStyles;
}
```

Ключевая логика:

1. **`inferElementType`** — определяет тип элемента:
   - `data-element-type` → прямое соответствие
   - fallback по tag: `h1-h6` → `heading`, `p` → `paragraph`, `img` → `image`, `button` → `button`, `input/textarea` → `input`, `hr` → `divider`
   - fallback по class: `funnel-option` → `option`, `funnel-card` → `card`, `funnel-options` → `survey-options`
   - всё остальное → `container` (если есть children) или `custom`

2. **`mergeStyles`** — объединяет стили с каскадом:
   - Парсит CSS компонента через `parseCss()` из `css-parser.ts`
   - Для каждого элемента: matched CSS rules (через `element.matches(selector)` в DOMParser document)
   - Мёржит: `matched CSS < inline styles` (inline приоритетнее)
   - Возвращает `ElementStyles` (flat dict `{ 'font-size': '24px', 'color': '#1a1a2e' }`)

3. **Рекурсивный обход** — `buildElementTree` → flat array:
   - root → `parentId: null`
   - children → `parentId: parent.id`
   - `order` — индекс среди siblings
   - ID: `{type}-{nanoid(8)}`

**Критерий готовности:**

- [ ] `ElementFactory.fromComponentDefinition(def, screenId)` → корректный `FunnelElement[]`
- [ ] Типы элементов определяются правильно: heading, paragraph, button, option, container, image
- [ ] CSS-стили из `<style>` блока компонента применяются к элементам
- [ ] Inline-стили переопределяют CSS-стили
- [ ] ID генерируются в формате `{type}-{nanoid(8)}`
- [ ] `parentId` / `screenId` / `order` заполнены корректно
- [ ] Тест: `option-list` → 3+ FunnelElement (container + options), каждый со стилями
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все зелёные

---

### Шаг 4 — Lazy-загрузка HTML-файлов и ComponentRegistry

**Файлы:**

- `src/services/component-registry.ts` — расширение: `fetchComponent()`, `getOrFetch()`
- `src/hooks/useDragAndDrop.ts` — обновление: при drop парсить HTML → создать элементы
- `src/store/slices/funnel-slice.ts` — новый action: `addScreenWithElements`

**Что реализуем:**

**ComponentRegistry — lazy fetch:**

```typescript
class ComponentRegistry {
  // ...существующие методы...

  /** Fetch + parse HTML-файл компонента, кэшировать ComponentDefinition */
  async fetchComponent(manifestEntry: ManifestEntry): Promise<ComponentDefinition>;

  /** Получить ComponentDefinition: из кэша или fetch + parse */
  async getOrFetch(componentId: string): Promise<ComponentDefinition | null>;
}
```

- `fetchComponent()` — `fetch(`/block-library/${entry.file}`)` → `text()` → `ComponentParser.parse()` → `register()`
- Кэширование: после первого fetch ComponentDefinition хранится в `byId` Map — повторный fetch не нужен
- Обработка ошибок: при неудаче fetch → `console.warn` + return `null`

**useDragAndDrop — новый onDragEnd:**

1. Пользователь дропает блок из BlockLibrary на canvas
2. `data.componentId` → `componentRegistry.getOrFetch(componentId)`
3. Если `file === null` (raw-html) → создать экран с одним `raw-html` элементом
4. Если `file` указан → fetch → parse → `ElementFactory.fromComponentDefinition()`
5. `addScreenWithElements({ screen, elements })` → store

**funnel-slice — новый action:**

```typescript
addScreenWithElements(screen: Screen, elements: FunnelElement[]): void
```
- Добавляет screen + все elements за одну undoable операцию
- Пересчитывает `elementIndexes`

**Критерий готовности:**

- [x] Drop компонента из BlockLibrary → fetch HTML-файла → парсинг → экран с элементами на canvas
- [x] Повторный drop того же компонента → HTML не перезапрашивается (кэш)
- [x] Drop `raw-html` → экран с одним `raw-html` элементом
- [ ] Клик на созданный экран → правая панель показывает реальные элементы (не seed)
- [x] Undo отменяет создание экрана вместе с элементами
- [x] `pnpm type-check` — 0 ошибок
- [x] `pnpm test --run` — 88 зелёных
- [ ] Network: HTML-файл загружается один раз (проверить через DevTools Network tab)

---

### Шаг 4.5 — HTML File Drop Zone (файл → canvas)

**Файлы:**

- `src/components/map-mode/HtmlFileDropZone.tsx` — **новый**, нативный drop .html файлов
- `src/components/map-mode/HtmlFileDropZone.module.css` — **новый**, стили оверлея
- `src/components/map-mode/MapCanvas.tsx` — добавлен `<HtmlFileDropZone />`
- `src/store/slices/funnel-slice.ts` — реализован `importScreenFromHtml` (был stub)

**Что реализовано:**

Пользователь берёт любой `.html` файл прямо из OS (Finder/Explorer), перетаскивает на canvas:

1. Как только файл входит во viewport → весь canvas подсвечивается зелёным оверлеем «Drop .html to import as screen»
2. При release → `FileReader.text()` → `ComponentParser.parse()` → `ElementFactory.fromComponentDefinition()` → `addScreenWithElements()` (undoable)
3. Несколько файлов сразу → каждый становится отдельным экраном, выровненным вправо
4. Невалидный/непарсируемый файл → `console.warn`, остальные файлы продолжают обрабатываться
5. `.html` с `@component` метаданными используют имя компонента как имя экрана; без метаданных — имя файла

**Детали реализации:**

- Глобальные `dragenter`/`dragleave` на `document` — определяют, что в полёте именно файл (`dataTransfer.types.includes('Files')`)
- Оверлей рендерится только когда `isDragging === true` (нет DOM-нагрузки при обычной работе)
- `dragCountRef` (счётчик) решает проблему «ложных» `dragleave` при движении мыши между дочерними элементами
- `z-index: 20` — выше `CanvasDropZone` (z-index: 10), но ниже контекстных меню

**Критерий готовности:**

- [x] Drag .html из OS на canvas → зелёный оверлей появляется
- [x] Drop → новый экран создаётся с реальными элементами
- [x] Несколько файлов → несколько экранов (каждый правее предыдущего)
- [x] Undo (Ctrl+Z) отменяет каждый импорт по отдельности
- [x] Файл без `@component` мета → имя экрана = имя файла
- [x] Непарсируемый файл → console.warn, остальные файлы обрабатываются
- [x] `pnpm type-check` — 0 ошибок
- [x] `pnpm test --run` — 88 зелёных

---

### Шаг 5 — HTML Generator (Elements Tree → HTML)

**Файлы:**

- `src/services/html-generator.ts` — полная переработка: рендерит из `FunnelElement[]`
- `src/services/html-cache.ts` — **новый**, transient cache (Map)

**Что реализуем:**

**html-generator.ts — генерация из FunnelElement[]:**

Текущий `generateHtml` работает с `ParsedScreen` / `ParsedElement`. Нужно добавить параллельный путь, который генерирует HTML из `FunnelElement[]` (source of truth → HTML):

```typescript
/** Генерирует HTML-фрагмент из дерева FunnelElement[] для одного экрана */
function generateScreenHtml(
  screenId: string,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes,
  screen: Screen,
  globalStyles: GlobalStyles
): string;

/** Рендерит один FunnelElement в HTML-строку */
function renderFunnelElement(
  element: FunnelElement,
  elements: Record<string, FunnelElement>,
  elementIndexes: ElementIndexes
): string;
```

Алгоритм `generateScreenHtml`:

1. Собрать CSS-переменные из `globalStyles` → `:root { ... }`
2. Применить `screen.customStyles.overrides` → `[data-screen="X"] { ... }`
3. Добавить `screen.customStyles.customCss`
4. Собрать `<style>` блок
5. Собрать `<main data-screen="..." class="funnel-screen ..." data-screen-type="...">` обёртку
6. Для каждого root-элемента (`parentId === null`, sorted by `order`):
   - `renderFunnelElement()` — рекурсивно генерит HTML
7. Закрыть `</main>`

`renderFunnelElement`:

- Открывающий тег с `data-element`, `data-element-type`, классами, inline styles
- `element.content` → text node
- children (по `elementIndexes.byParent[element.id]`) → рекурсия
- Закрывающий тег (void-элементы — `<img />`, `<input />`, `<hr />`)

**html-cache.ts — transient кэш (по §6.4 архитектуры):**

```typescript
const htmlCache = new Map<string, string>();

export function getScreenHtml(...): string;      // lazy generation
export function invalidateScreenCache(screenId: string): void;
export function invalidateAllCache(): void;
```

- Cache invalidation: при любом `ELEMENT_UPDATE`, `ELEMENT_ADD`, `ELEMENT_DELETE`, `SCREEN_UPDATE` — вызывать `invalidateScreenCache(screenId)`
- Кэш не участвует в Undo/Redo, не персистится

**Критерий готовности:**

- [x] `generateScreenHtml(screenId, elements, indexes, screen, globalStyles)` → валидный HTML
- [x] Сгенерированный HTML содержит `data-screen`, `data-element`, `data-element-type` атрибуты
- [x] CSS-переменные из `globalStyles` включены в `<style>` → `:root { ... }`
- [x] Per-screen overrides включены в `<style>` → `[data-screen="X"] { ... }`
- [x] `invalidateScreenCache` очищает кэш — повторный вызов `getScreenHtml` регенерирует
- [x] Тест: создать screen + elements → `generateScreenHtml` → парсить обратно через `parseHtml` → structure match
- [x] `pnpm type-check` — 0 ошибок
- [x] `pnpm test --run` — 107 зелёных

---

### Шаг 6 — Global Styles Panel (CSS-переменные)

**Файлы:**

- `src/components/panels/sections/GlobalStylesPanel.tsx` — **новый**
- `src/components/panels/sections/GlobalStylesPanel.module.css` — **новый**
- `src/components/panels/FunnelSettings.tsx` — интеграция GlobalStylesPanel
- `src/store/slices/funnel-slice.ts` — action `updateGlobalStyle`

**Что реализуем:**

Панель глобальных стилей доступна через `FunnelSettings` (или отдельный пункт в левой панели). Показывает все CSS-переменные из `globalStyles` с визуальными редакторами:

**Секция Colors:**
- `--bg` — ColorPicker
- `--card-bg` — ColorPicker
- `--text` — ColorPicker
- `--text-muted` — ColorPicker
- `--accent` — ColorPicker
- `--accent-hover` — ColorPicker
- `--border-tile` — ColorPicker

**Секция Typography:**
- `--font-family` — select (Inter, Roboto, Georgia, system-ui, custom...)
- `--h1-size` — NumberInput (px)
- `--h2-size` — NumberInput (px)
- `--body-size` — NumberInput (px)
- `--option-font` — NumberInput (px)

**Секция Spacing & Layout:**
- `--radius` — NumberInput (px)
- `--radius-sm` — NumberInput (px)
- `--pad-x` — NumberInput (px)
- `--pad-y` — NumberInput (px)
- `--container-max` — NumberInput (px)

**Секция Effects:**
- `--shadow` — preset (None, SM, MD, LG) + custom input
- `--transition` — preset (None, Fast, Normal, Slow) + custom input

**Store action:**

```typescript
updateGlobalStyle(name: CSSVariableName, value: string): void
```
- Undoable
- Инвалидирует HTML-кэш всех экранов

**Критерий готовности:**

- [ ] Панель отображает все CSS-переменные из `globalStyles` с соответствующими контролами
- [ ] Изменение `--accent` через ColorPicker → `updateGlobalStyle('--accent', '#ff6600')` → store обновлён
- [ ] Все операции undoable (`Ctrl+Z` откатывает изменение цвета)
- [ ] При изменении глобального стиля HTML-кэш инвалидируется
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все зелёные

---

### Шаг 7 — Per-screen CSS Overrides

**Файлы:**

- `src/components/panels/sections/ScreenAppearanceSection.tsx` — расширение: полный список CSS-переменных
- `src/store/slices/funnel-slice.ts` — уже есть `updateScreen` (достаточно для overrides)

**Что реализуем:**

Расширяем секцию Appearance в `ScreenProperties` — кнопка «Override Global Styles» разворачивает список всех CSS-переменных со значениями:

- Каждая переменная показывает: global value (серым, read-only) + override input
- Если override задан → показывается со значком 🔓, клик по значку → сбрасывает override
- Если override пуст → наследуется от глобальных стилей (показано полупрозрачно)
- Все изменения → `updateScreen({ customStyles: { overrides: { [varName]: value } } })`

**Дополнительно:**

- `customCss` textarea — произвольный CSS (advanced users)
- `customClass` input — доп. класс на `<main>` экрана

**Критерий готовности:**

- [ ] Секция Appearance показывает «Override Global Styles» с раскрывающимся списком
- [ ] Установка override `--bg: #000` → `screen.customStyles.overrides['--bg'] === '#000'`
- [ ] Сброс override → `delete overrides['--bg']` → наследуется от глобальных
- [ ] `customCss` textarea сохраняет произвольный CSS
- [ ] Все операции undoable
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все зелёные

---

### Шаг 8 — Синхронизация Panel ↔ Elements Tree

**Файлы:**

- `src/components/panels/sections/Element*.tsx` — все секции: подключение к real elements
- `src/store/slices/funnel-slice.ts` — уточнение `updateElementStyle`
- `src/services/html-cache.ts` — invalidation hooks

**Что реализуем:**

Обеспечиваем полный цикл: пользователь меняет стиль в панели → elements tree обновляется → HTML-кэш инвалидируется.

1. **ElementTypographySection** — при изменении `fontSize`:
   - Вызывает `updateElementStyle(elementId, 'font-size', '18px')`
   - Store обновляет `elements[elementId].styles['font-size'] = '18px'`
   - `invalidateScreenCache(element.screenId)` вызывается автоматически

2. **Все остальные секции** — аналогичная связка

3. **Cache invalidation integration:**
   - В `funnel-slice.ts` после каждого `undoableUpdate` с типами `ELEMENT_*` / `SCREEN_UPDATE` → вызывать `invalidateScreenCache`
   - Реализовать как subscribe-хук или прямой вызов в action

4. **Удаление seed-элементов:**
   - Удалить `createSeedElements()` из `src/store/defaults.ts`
   - Дефолтный проект создаётся с пустым `welcome` экраном (или с одним heading + button)
   - Пользователь добавляет элементы через drop из BlockLibrary

**Критерий готовности:**

- [ ] Изменение fontSize в Typography → `elements[id].styles['font-size']` обновлён
- [ ] Undo/Redo стилей работает корректно
- [ ] HTML-кэш инвалидируется при любом изменении элемента/экрана
- [ ] Seed-элементы удалены из `defaults.ts`
- [ ] Дефолтный проект стартует с чистым экраном (минимум heading «Welcome»)
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все зелёные (адаптированы к отсутствию seed-элементов)

---

### Шаг 9 — Добавление/удаление элементов в экране

**Файлы:**

- `src/store/slices/funnel-slice.ts` — actions: `addElement`, `deleteElement`, `duplicateElement`, `moveElementToScreen`
- `src/types/store.ts` — типы новых actions
- `src/components/map-mode/ScreenNode.tsx` — кнопка «+ Add element» внизу списка

**Что реализуем:**

**Store actions:**

```typescript
addElement(element: FunnelElement): void
deleteElement(elementId: string): void
duplicateElement(elementId: string): void
moveElementToScreen(elementId: string, targetScreenId: string, order: number): void
```

- `addElement` — вставляет элемент, пересчитывает `elementIndexes`
- `deleteElement` — удаляет элемент и все его children рекурсивно, пересчитывает order у siblings
- `duplicateElement` — deep-copy с новыми ID, `order = source.order + 1`, сдвиг siblings
- `moveElementToScreen` — перемещает элемент между экранами (удаляет из старого, вставляет в новый с пересчётом order)
- Все операции undoable

**UI:**

- Кнопка «+» внизу списка элементов в `ScreenNode` → popup/dropdown с типами элементов
- Delete через контекстное меню элемента или клавишу `Delete`
- Duplicate через контекстное меню или `Ctrl+D` (когда выбран элемент)

**Критерий готовности:**

- [ ] `addElement` → элемент появляется в ScreenNode, в правой панели при клике
- [ ] `deleteElement` → элемент и его дети удалены, order пересчитан
- [ ] `duplicateElement` → копия рядом с оригиналом, новые ID
- [ ] `moveElementToScreen` → элемент переехал, оба экрана обновились
- [ ] Все операции undoable
- [ ] Кнопка «+» в ScreenNode добавляет элемент выбранного типа
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm test --run` — все зелёные

---

### Шаг 10 — Тесты парсера и генератора

**Файлы:**

- `src/services/component-parser.test.ts` — **новый**
- `src/services/element-factory.test.ts` — **новый**
- `src/services/html-generator.test.ts` — **новый**
- `src/services/html-cache.test.ts` — **новый**

**Что тестируем:**

**component-parser.test.ts:**

| # | Тест | Что проверяем |
|---|------|---------------|
| 1 | Парсинг мета-комментария | `@component`, `@category`, `@tags` извлекаются корректно |
| 2 | Пустой мета-комментарий | Возвращается объект с пустыми полями, не crash |
| 3 | Построение дерева элементов | Глубина > 1, children рекурсивно |
| 4 | Inline styles | `style="font-size: 24px"` → `{ 'font-size': '24px' }` |
| 5 | data-атрибуты | `data-value="x"` → `attributes['data-value'] === 'x'` |
| 6 | `<style>` блоки | CSS собран в одну строку |
| 7 | Реальный `option-list.html` | Full integration: parse → verify structure |

**element-factory.test.ts:**

| # | Тест | Что проверяем |
|---|------|---------------|
| 1 | Heading node → FunnelElement | `type === 'heading'`, `tag === 'h1'` |
| 2 | Button node → FunnelElement | `type === 'button'`, стили применены |
| 3 | Container с children | `parentId` дочерних === ID контейнера |
| 4 | Инферение типа из class | `funnel-option` → `type === 'option'` |
| 5 | Инферение типа из data-attr | `data-element-type="image"` → `type === 'image'` |
| 6 | CSS merge | inline переопределяет matched CSS |
| 7 | ID формат | `/{type}-[a-zA-Z0-9_-]{8}/` |

**html-generator.test.ts:**

| # | Тест | Что проверяем |
|---|------|---------------|
| 1 | Простой экран | `<main data-screen="...">` + children |
| 2 | CSS-переменные | `:root { --bg: ... }` в `<style>` |
| 3 | Per-screen overrides | `[data-screen="X"] { --bg: ... }` |
| 4 | Void-элементы | `<img />`, `<input />` — self-closing |
| 5 | Nested elements | Container → children рендерятся внутри |
| 6 | Roundtrip | generate → parse → compare structure |

**html-cache.test.ts:**

| # | Тест | Что проверяем |
|---|------|---------------|
| 1 | Lazy generation | Первый вызов генерирует, второй — из кэша |
| 2 | Invalidation | После invalidate — следующий вызов регенерирует |
| 3 | Invalidate all | Очищает весь кэш |

**Критерий готовности:**

- [ ] Все тесты зелёные
- [ ] Coverage: ComponentParser, ElementFactory, html-generator, html-cache — >80% lines
- [ ] `pnpm test --run` — все зелёные (39 старых + 20+ новых)

---

## Критерии готовности всей Фазы 3

| # | Критерий | Метрика | Проверка |
|---|----------|---------|----------|
| 1 | `pnpm dev` без ошибок | 0 console errors | `pnpm dev` → открыть в браузере → F12 Console |
| 2 | `pnpm tsc --noEmit` без ошибок | exit code 0 | `pnpm type-check` |
| 3 | `pnpm test` все зелёные | 59+ тестов (39 old + 20 new) | `pnpm test --run` |
| 4 | HTML-файлы компонентов | ≥17 файлов в `block-library/` | `ls -R block-library/` |
| 5 | Drop компонента → парсинг → элементы | Экран содержит реальные FunnelElement | Drop → клик на экран → Elements List |
| 6 | HTML-кэш lazy generation | Первый preview генерирует, второй из кэша | Unit test + DevTools profiler |
| 7 | HTML-кэш invalidation | Изменение стиля → кэш инвалидирован | Unit test + проверить cache.size |
| 8 | Global Styles Panel | Все CSS-переменные редактируемы | Изменить `--accent` → store обновлён |
| 9 | Per-screen CSS overrides | Override переопределяет глобальную | Set `--bg: #000` на экране → `overrides['--bg'] === '#000'` |
| 10 | Синхронизация Panel → Elements | Изменение стиля → `element.styles` обновлён | Поменять fontSize → проверить store |
| 11 | Elements Tree = source of truth | Нет двойного хранения HTML/Elements | Код: только `elements` в store, HTML вычисляется |
| 12 | Seed-элементы удалены | Нет `createSeedElements` | grep `createSeedElements` → 0 results |
| 13 | `addElement` / `deleteElement` | CRUD элементов работает | Добавить → удалить → Undo → элемент вернулся |
| 14 | Undo/Redo для всех операций | Все store actions undoable | `Ctrl+Z` после каждой операции |
| 15 | ComponentRegistry lazy fetch | HTML загружается 1 раз | DevTools Network → повторный drop → 0 requests |
| 16 | Roundtrip HTML | generate → parse → structure match | Unit test |

---

## Зависимости между шагами

```
Шаг 1 (HTML-файлы)          ← независим, можно первым
      │
      ▼
Шаг 2 (ComponentParser)     ← зависит от шага 1 (парсит файлы)
      │
      ▼
Шаг 3 (ElementFactory)      ← зависит от шага 2 (использует ComponentDefinition)
      │
      ▼
Шаг 4 (Lazy fetch + DnD)    ← зависит от шагов 2, 3 (парсинг + маппинг)
      │
      ├─────────────────────────────┐
      ▼                             ▼
Шаг 5 (HTML Generator)      Шаг 6 (Global Styles Panel) ← независимы друг от друга
      │                             │
      ├─────────────────────────────┤
      ▼                             ▼
Шаг 7 (Per-screen overrides)       Шаг 8 (Panel ↔ Elements sync)
                                          │
                                          ▼
                                    Шаг 9 (CRUD элементов)
                                          │
                                          ▼
                                    Шаг 10 (Тесты)
```

**Рекомендуемый порядок:** 1 → 2 → 3 → 4 → 5 ‖ 6 → 7 → 8 → 9 → 10

(шаги 5 и 6 можно параллельно)

---

## Файлы по шагам

| Шаг | Новые файлы | Изменяемые файлы |
|-----|------------|-----------------|
| 1 | `block-library/**/*.html` (17+ файлов) | — |
| 2 | `src/services/component-parser.ts` | `src/services/html-parser.ts` (рефакторинг) |
| 3 | `src/services/element-factory.ts` | — |
| 4 | — | `src/services/component-registry.ts`, `src/hooks/useDragAndDrop.ts`, `src/store/slices/funnel-slice.ts` |
| 5 | `src/services/html-cache.ts` | `src/services/html-generator.ts` |
| 6 | `src/components/panels/sections/GlobalStylesPanel.tsx`, `.module.css` | `src/components/panels/FunnelSettings.tsx`, `src/store/slices/funnel-slice.ts` |
| 7 | — | `src/components/panels/sections/ScreenAppearanceSection.tsx` |
| 8 | — | `src/components/panels/sections/Element*.tsx`, `src/store/slices/funnel-slice.ts`, `src/store/defaults.ts` |
| 9 | — | `src/store/slices/funnel-slice.ts`, `src/types/store.ts`, `src/components/map-mode/ScreenNode.tsx` |
| 10 | `src/services/component-parser.test.ts`, `element-factory.test.ts`, `html-generator.test.ts`, `html-cache.test.ts` | — |

---

## Архитектурные решения Phase 3

### Почему Elements Tree — source of truth (§4.3)

```
              ┌────────────────────────────────────┐
              │   Elements Tree (source of truth)   │
              └──────────┬───────────┬──────────────┘
                         │           │
                    ┌────▼───┐  ┌────▼────┐
                    │ Панель │  │  HTML    │
                    │свойств │  │ генера-  │
                    │  (GUI) │  │  тор     │
                    └────┬───┘  └────┬────┘
                         │           │
                    обновляет    генерирует
                    elements     htmlCache
                    tree         для preview
```

- **Один источник правды** = нет десинхронизации
- HTML — производное, вычисляемое значение
- Developer mode (Monaco) — единственное место обратного потока (HTML → Elements) при Ctrl+S

### Каскад стилей (приоритет)

```
1. element.styles (inline)               — ВЫСШИЙ
2. screen.customStyles.customCss          — per-screen CSS
3. screen.customStyles.overrides          — per-screen CSS vars
4. globalStyles (CSS-переменные :root)    — глобальные
5. Component defaults (.funnel-option)    — из block-library HTML
```

### Формат ID элементов

```
{type}-{nanoid(8)}
Примеры: heading-xK9mPq2r, button-Ab1cDe2f, option-3G4h5I6j
```
- Уникальные, не semantic
- Стабильные при Undo/Redo (не меняются)
- Читаемые при дебаге (тип в префиксе)

---

## Правило коммитов

Один завершённый шаг = один коммит.

Формат:

- `feat(phase3): step-1 block-library html component files`
- `feat(phase3): step-2 component-parser html-to-definition`
- `feat(phase3): step-3 element-factory definition-to-funnel-elements`
- `feat(phase3): step-4 lazy-fetch-components and dnd-integration`
- `feat(phase3): step-5 html-generator elements-tree-to-html`
- `feat(phase3): step-6 global-styles-panel css-variables`
- `feat(phase3): step-7 per-screen-css-overrides`
- `feat(phase3): step-8 panel-elements-sync and remove-seeds`
- `feat(phase3): step-9 element-crud add-delete-duplicate-move`
- `feat(phase3): step-10 parser-generator-tests`

---

## Документирование

Рабочий набор документов Фазы 3:

- `DOCS_ARCHITECTURE.md` → полная архитектура (§3, §4, §10, §16)
- `PHASE_3_PARSER_STYLES.md` → этот файл — зафиксированный план
- `PROGRESSION.md` → текущее состояние шагов + карта событий

Правило сессий:

- в начале сессии читаем `PROGRESSION.md`
- в конце шага обновляем `PROGRESSION.md`
- после подтверждения шага делаем коммит
